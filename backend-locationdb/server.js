
const { execFile } = require('child_process');
const path = require('path');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const locationRoutes = require('./routes/locationRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const { calculateSeverity } = require('./utils/severity');

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.WEATHER_API_KEY || '7befd79c74344e30895172229261109';
const BASE_URL = 'http://api.weatherapi.com/v1';

app.use(cors());
app.use(express.json());

if (!API_KEY) {
  console.error('\n[STARTUP ERROR] WEATHER_API_KEY is missing.');
  console.error('Create a file named ".env" next to server.js with:');
  console.error('  WEATHER_API_KEY=your_weatherapi_com_key_here\n');
  console.error('Get a free key at https://www.weatherapi.com/ if you don\'t have one.\n');
}

connectDB();

// Database-driven location and weather endpoints
app.use('/api/locations', locationRoutes);
app.use('/api/weather', weatherRoutes);

// Location search endpoint
app.get('/api/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({
      error: 'Query parameter "q" is required'
    });
  }

  let suggestions = [];

  try {
    const response = await axios.get(`${BASE_URL}/search.json`, {
      params: { key: API_KEY, q }
    });

    suggestions = response.data.map(item => ({
      name: item.name,
      region: `${item.region ? item.region + ', ' : ''}${item.country}`,
      lat: item.lat,
      lon: item.lon
    }));

    console.log(
      `[search] WeatherAPI returned ${suggestions.length} results for "${q}"`
    );
  } catch (error) {
    console.error(
      `[search] WeatherAPI Search Error for "${q}":`,
      error.response ? JSON.stringify(error.response.data) : error.message
    );
  }

  if (suggestions.length === 0) {
    try {
      const osm = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q,
            format: 'json',
            addressdetails: 1,
            limit: 8
          },
          headers: {
            'User-Agent':
              'StormSense-Hackathon-App/1.0 (contact: demo@example.com)'
          },
          timeout: 10000
        }
      );

      suggestions = osm.data.map(item => {
        const addr = item.address || {};
        const region =
          [addr.state_district, addr.state].filter(Boolean).join(', ') ||
          addr.country ||
          '';

        return {
          name:
            addr.village ||
            addr.town ||
            addr.city ||
            addr.suburb ||
            addr.hamlet ||
            item.display_name.split(',')[0],
          region,
          lat: item.lat,
          lon: item.lon
        };
      });

      console.log(
        `[search] Nominatim fallback returned ${suggestions.length} results for "${q}"`
      );
    } catch (error) {
      console.error(
        '[search] Nominatim Fallback Error:',
        error.response ? error.response.status : error.message
      );
    }
  }

  if (suggestions.length === 0) {
    return res.status(500).json({
      error: 'Failed to fetch location search results'
    });
  }

  res.json(suggestions);
});

// Main weather and forecast endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    const response = await axios.get(`${BASE_URL}/forecast.json`, {
      params: {
        key: API_KEY,
        q,
        days: 5,
        alerts: 'yes',
        aqi: 'no'
      }
    });

    const data = response.data;
    const current = data.current;
    const location = data.location;
    const forecastDays = data.forecast.forecastday;
    const alerts = data.alerts ? data.alerts.alert : [];

    const severity = calculateSeverity(current, alerts);

    // FIX: Use the selected location's local time and search
    // across all forecast days for the next six hours.
    const localTime = location.localtime;
    const allHours = forecastDays.flatMap(day => day.hour || []);

    const nextHours = allHours
      .filter(hour => hour.time > localTime)
      .slice(0, 6);

    const mappedHours = nextHours.map(hour => ({
      time: hour.time.split(' ')[1],
      temp: Math.round(hour.temp_c),
      pop: hour.chance_of_rain,
      icon: hour.condition.text.toLowerCase().includes('rain')
        ? 'rain'
        : 'cloudy'
    }));

    // Five-day outlook
    const dayNames = [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
    ];

    const mappedDays = forecastDays.map((day, index) => {
      const dateObj = new Date(`${day.date}T12:00:00`);

      return {
        name: index === 0 ? 'Today' : dayNames[dateObj.getDay()],
        cond: day.day.condition.text,
        high: Math.round(day.day.maxtemp_c),
        low: Math.round(day.day.mintemp_c),
        pop: day.day.daily_chance_of_rain,
        icon: day.day.condition.text.toLowerCase().includes('rain')
          ? 'rain'
          : 'mostly-clear'
      };
    });

    res.json({
      city: {
        name: location.name,
        region: `${location.region ? location.region + ', ' : ''}${location.country}`,
        lat: location.lat,
        lon: location.lon
      },
      temp: Math.round(current.temp_c),
      feelsLike: Math.round(current.feelslike_c),
      high: Math.round(forecastDays[0].day.maxtemp_c),
      low: Math.round(forecastDays[0].day.mintemp_c),
      condition: current.condition.text,
      humidity: current.humidity,
      windSpeed: Math.round(current.wind_kph),
      windDir: current.wind_dir,
      pressure: current.pressure_mb,
      uv: current.uv,
      visibility: current.vis_km,
      precipChance: forecastDays[0].day.daily_chance_of_rain,
      alertLevel:
        alerts.length > 0
          ? 'warning'
          : (severity.zone !== 'calm' ? severity.zone : null),
      severity,
      hours: mappedHours,
      days: mappedDays
    });
  } catch (error) {
    console.error(
      'Weather API Error:',
      error.response ? error.response.data : error.message
    );

    res.status(500).json({
      error: 'Failed to retrieve weather data'
    });
  }
});

// Batch GIS map endpoint
app.post('/api/gis/batch', async (req, res) => {
  try {
    const { locations } = req.body;

    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({
        error: 'Array of "locations" is required'
      });
    }

    const requests = locations.map(loc =>
      axios.get(`${BASE_URL}/current.json`, {
        params: { key: API_KEY, q: loc }
      })
    );

    const responses = await Promise.allSettled(requests);

    const gisData = responses
      .filter(result => result.status === 'fulfilled')
      .map(result => {
        const data = result.value.data;
        const severity = calculateSeverity(data.current);

        return {
          name: data.location.name,
          region: `${data.location.region ? data.location.region + ', ' : ''}${data.location.country}`,
          lat: data.location.lat,
          lon: data.location.lon,
          temp: Math.round(data.current.temp_c),
          condition: data.current.condition.text,
          severityScore: severity.score,
          zone: severity.zone
        };
      });

    res.json(gisData);
  } catch (error) {
    console.error('GIS Batch API Error:', error.message);

    res.status(500).json({
      error: 'Failed to process GIS map batch points'
    });
  }
});

// Dense regional GIS endpoint
app.get('/api/gis/dense', async (req, res) => {
  try {
    const bbox = (
      req.query.bbox || '24.0,89.6,28.3,96.2'
    ).split(',').map(Number);

    const limit = Math.min(parseInt(req.query.limit, 10) || 40, 80);
    const [south, west, north, east] = bbox;

    const overpassQuery = `
      [out:json][timeout:40];
      (
        node["place"~"city|town|suburb|village|neighbourhood|hamlet"](${south},${west},${north},${east});
      );
      out body 500;
    `;

    const overpassRes = await axios.post(
      'https://overpass-api.de/api/interpreter',
      overpassQuery,
      {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 40000
      }
    );

    const rawCount = (overpassRes.data.elements || []).length;

    const placeRank = {
      city: 0,
      town: 1,
      suburb: 2,
      neighbourhood: 3,
      village: 4,
      hamlet: 5
    };

    let places = (overpassRes.data.elements || [])
      .filter(el => el.tags && el.tags.name && el.lat && el.lon)
      .map(el => ({
        name: el.tags.name,
        lat: el.lat,
        lon: el.lon,
        rank: placeRank[el.tags.place] ?? 6
      }))
      .sort((a, b) => a.rank - b.rank);

    console.log(
      `[gis/dense] Overpass returned ${rawCount} raw elements, ${places.length} usable named places`
    );

    let selected = places;

    if (places.length > limit) {
      const step = places.length / limit;
      const seen = new Set();
      selected = [];

      for (let i = 0; i < limit; i++) {
        const idx = Math.min(
          places.length - 1,
          Math.floor(i * step)
        );

        if (!seen.has(idx)) {
          seen.add(idx);
          selected.push(places[idx]);
        }
      }
    }

    console.log(
      `[gis/dense] Requesting live weather for ${selected.length} selected places`
    );

    const requests = selected.map(place =>
      axios.get(`${BASE_URL}/current.json`, {
        params: {
          key: API_KEY,
          q: `${place.lat},${place.lon}`
        },
        timeout: 15000
      })
        .then(result => ({
          place,
          data: result.data
        }))
        .catch(error => {
          throw {
            place,
            message: error.response
              ? JSON.stringify(error.response.data)
              : error.message
          };
        })
    );

    const settled = await Promise.allSettled(requests);

    const failed = settled.filter(result => result.status === 'rejected');

    if (failed.length) {
      console.log(
        `[gis/dense] ${failed.length} of ${selected.length} weather lookups failed:`
      );

      failed.slice(0, 5).forEach(result => {
        console.log(
          `   - ${result.reason.place.name}: ${result.reason.message}`
        );
      });
    }

    const gisData = settled
      .filter(result => result.status === 'fulfilled')
      .map(result => {
        const { place, data } = result.value;
        const severity = calculateSeverity(data.current);

        return {
          name: place.name,
          region: `${data.location.region ? data.location.region + ', ' : ''}${data.location.country}`,
          lat: place.lat,
          lon: place.lon,
          temp: Math.round(data.current.temp_c),
          condition: data.current.condition.text,
          severityScore: severity.score,
          zone: severity.zone
        };
      });

    console.log(
      `[gis/dense] Returning ${gisData.length} markers to the frontend`
    );

    res.json(gisData);
  } catch (error) {
    console.error(
      '[gis/dense] Fatal error:',
      error.response ? JSON.stringify(error.response.data) : error.message
    );

    res.status(500).json({
      error: 'Failed to generate dense regional map'
    });
  }
});

// AI nowcasting endpoint
app.get('/api/ai/predict', async (req, res) => {
  try {
    const response = await axios.get(
      'http://127.0.0.1:5001/predict',
      { timeout: 120000 }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('[AI] Prediction service error:', error.message);

    res.status(503).json({
      success: false,
      error: 'AI service unavailable. Check whether the Python AI server is running.'
    });
  }
});

// Proxy India state boundaries to avoid browser CORS
app.get('/api/gis/india-states', async (req, res) => {
  try {
    const response = await axios.get(
      'https://static.geodataviewer.com/datasets/india-states.geojson'
    );

    res.json(response.data);
  } catch (error) {
    console.error('India states GeoJSON error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Failed to load India state boundaries'
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `StormSense backend server running on http://localhost:${PORT}`
  );
  console.log(
    `Try it: http://localhost:${PORT}/api/weather?q=London`
  );
});
