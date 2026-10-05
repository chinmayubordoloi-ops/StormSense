const axios = require('axios');
const Location = require('../models/Location');
const WeatherHistory = require('../models/WeatherHistory');
const { calculateSeverity } = require('../utils/severity');

const WEATHER_BASE_URL = 'http://api.weatherapi.com/v1';
const API_KEY = process.env.WEATHER_API_KEY;

// GET /api/weather/:locationId
// 1. Look up the location in OUR database to get lat/lon (the "WHERE").
// 2. Call the live weather API with those coordinates (the "WHAT'S HAPPENING NOW").
// 3. Never read current conditions from the database — only ever from the API.
async function getWeatherByLocationId(req, res) {
  try {
    const { locationId } = req.params;

    const location = await Location.findOne({ locationId });
    if (!location) {
      return res.status(404).json({ error: `Unknown locationId "${locationId}"` });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration: WEATHER_API_KEY is not set' });
    }

    let weatherRes;
    try {
      weatherRes = await axios.get(`${WEATHER_BASE_URL}/forecast.json`, {
        params: {
          key: API_KEY,
          q: `${location.latitude},${location.longitude}`,
          days: 5,
          alerts: 'yes',
          aqi: 'no'
        },
        timeout: 15000
      });
    } catch (apiError) {
      // Distinguish "weather API is down/rejected us" from our own bugs, and
      // handle the common failure modes explicitly rather than a blanket 500.
      if (apiError.response) {
        const status = apiError.response.status;
        if (status === 429) {
          return res.status(429).json({ error: 'Weather API rate limit reached. Please try again shortly.' });
        }
        return res.status(502).json({
          error: 'Weather API rejected the request',
          detail: apiError.response.data?.error?.message || apiError.message
        });
      }
      return res.status(504).json({ error: 'Weather API did not respond in time' });
    }

    const data = weatherRes.data;
    const current = data.current;
    const alerts = data.alerts ? data.alerts.alert : [];
    const severity = calculateSeverity(current, alerts);

    const forecast = data.forecast.forecastday.map(day => ({
      date: day.date,
      maxTempC: day.day.maxtemp_c,
      minTempC: day.day.mintemp_c,
      condition: day.day.condition.text,
      chanceOfRain: day.day.daily_chance_of_rain
    }));

    const responsePayload = {
      location: {
        locationId: location.locationId,
        country: location.country,
        state: location.state,
        district: location.district,
        cityOrArea: location.cityOrArea,
        latitude: location.latitude,
        longitude: location.longitude
      },
      weather: {
        temperature: current.temp_c,
        feelsLike: current.feelslike_c,
        humidity: current.humidity,
        precipitationMm: current.precip_mm,
        windSpeedKph: current.wind_kph,
        windDirection: current.wind_dir,
        pressureMb: current.pressure_mb,
        cloudCoverPercent: current.cloud,
        condition: current.condition.text,
        visibilityKm: current.vis_km,
        uvIndex: current.uv,
        lastUpdated: current.last_updated
      },
      forecast,
      alerts: alerts.map(a => ({ headline: a.headline, severity: a.severity, event: a.event })),
      severity, // rule-based prototype score — see utils/severity.js. Not an AI model.
      timestamp: new Date().toISOString()
    };

    // Log this observation for future AI model training. Fire-and-forget:
    // a logging failure should never break the live response to the user.
    WeatherHistory.create({
      locationId: location.locationId,
      latitude: location.latitude,
      longitude: location.longitude,
      temperature: current.temp_c,
      humidity: current.humidity,
      rainfall: current.precip_mm,
      windSpeed: current.wind_kph,
      windDirection: current.wind_dir,
      pressure: current.pressure_mb,
      cloudCover: current.cloud,
      visibility: current.vis_km,
      condition: current.condition.text,
      severityScore: severity.score,
      severityZone: severity.zone,
      observedAt: new Date()
    }).catch(err => console.error('[weatherHistory] Failed to log observation:', err.message));

    res.json(responsePayload);
  } catch (error) {
    console.error('[weather] getWeatherByLocationId error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve weather data' });
  }
}

module.exports = { getWeatherByLocationId };
