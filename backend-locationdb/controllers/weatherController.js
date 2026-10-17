
const axios = require('axios');
const Location = require('../models/Location');
const WeatherHistory = require('../models/WeatherHistory');
const { calculateSeverity } = require('../utils/severity');

const WEATHER_BASE_URL = 'https://api.weatherapi.com/v1';
const API_KEY = process.env.WEATHER_API_KEY;

// GET /api/weather/:locationId
async function getWeatherByLocationId(req, res) {
  try {
    const { locationId } = req.params;

    // 1. Find the requested location in MongoDB
    const location = await Location.findOne({ locationId });

    if (!location) {
      return res.status(404).json({
        error: `Unknown locationId "${locationId}"`
      });
    }

    // 2. Check API configuration
    if (!API_KEY) {
      return res.status(500).json({
        error: 'Server misconfiguration: WEATHER_API_KEY is not set'
      });
    }

    // 3. Fetch current weather and a 3-day forecast
    let weatherRes;

    try {
      weatherRes = await axios.get(
        `${WEATHER_BASE_URL}/forecast.json`,
        {
          params: {
            key: API_KEY,
            q: `${location.latitude},${location.longitude}`,
            days: 3,
            alerts: 'yes',
            aqi: 'no'
          },
          timeout: 15000
        }
      );
    } catch (apiError) {
      if (apiError.response) {
        const status = apiError.response.status;
        const message =
          apiError.response.data?.error?.message ||
          apiError.message;

        if (status === 429) {
          return res.status(429).json({
            error: 'Weather API rate limit reached. Please try again shortly.'
          });
        }

        return res.status(502).json({
          error: 'Weather API rejected the request',
          detail: message
        });
      }

      return res.status(504).json({
        error: 'Weather API did not respond in time'
      });
    }

    const data = weatherRes.data;
    const current = data.current;
    const alerts = data.alerts?.alert || [];

    // 4. Calculate the existing rule-based severity score
    const severity = calculateSeverity(current, alerts);

    // 5. Prepare the daily forecast
    const forecast = (
      data.forecast?.forecastday || []
    ).map(day => ({
      date: day.date,
      maxTempC: day.day.maxtemp_c,
      minTempC: day.day.mintemp_c,
      avgTempC: day.day.avgtemp_c,
      condition: day.day.condition.text,
      icon: day.day.condition.icon,
      chanceOfRain: day.day.daily_chance_of_rain,
      chanceOfSnow: day.day.daily_chance_of_snow,
      totalPrecipitationMm: day.day.totalprecip_mm,
      maxWindKph: day.day.maxwind_kph,
      averageHumidity: day.day.avghumidity,
      uvIndex: day.day.uv
    }));

    // 6. Prepare hourly forecasts for all returned forecast days
    const hourlyForecast = (
      data.forecast?.forecastday || []
    ).flatMap(day =>
      (day.hour || []).map(hour => ({
        time: hour.time,
        temperature: hour.temp_c,
        feelsLike: hour.feelslike_c,
        condition: hour.condition.text,
        icon: hour.condition.icon,
        chanceOfRain: hour.chance_of_rain,
        precipitationMm: hour.precip_mm,
        humidity: hour.humidity,
        windKph: hour.wind_kph,
        windDirection: hour.wind_dir,
        cloudCover: hour.cloud,
        visibilityKm: hour.vis_km,
        uvIndex: hour.uv,
        willItRain: hour.will_it_rain
      }))
    );

    // 7. Build the response for the frontend
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
        icon: current.condition.icon,
        visibilityKm: current.vis_km,
        uvIndex: current.uv,
        lastUpdated: current.last_updated
      },

      forecast,
      hourlyForecast,

      alerts: alerts.map(alert => ({
        headline: alert.headline,
        severity: alert.severity,
        event: alert.event
      })),

      severity,
      timestamp: new Date().toISOString()
    };

    // 8. Save the current observation without blocking the response
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
    }).catch(err => {
      console.error(
        '[weatherHistory] Failed to log observation:',
        err.message
      );
    });

    // 9. Return weather data to the frontend
    return res.json(responsePayload);

  } catch (error) {
    console.error(
      '[weather] getWeatherByLocationId error:',
      error.message
    );

    return res.status(500).json({
      error: 'Failed to retrieve weather data'
    });
  }
}

module.exports = { getWeatherByLocationId };
