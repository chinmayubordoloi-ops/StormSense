const mongoose = require('mongoose');

/**
 * A logged snapshot of live weather at a given location and time.
 * Every time /api/weather/:locationId is called, we can (optionally) save
 * a row here. Over time this builds a dataset of real observations tied
 * to known coordinates — exactly what the future AI/risk-prediction
 * module will need to train and test against.
 *
 * This collection is NOT read from when answering "what's the weather now" —
 * that always comes live from the weather API. This is write-only logging.
 */
const weatherHistorySchema = new mongoose.Schema({
  locationId: { type: String, required: true, index: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  temperature: Number,      // Celsius
  humidity: Number,         // %
  rainfall: Number,         // mm
  windSpeed: Number,        // kph
  windDirection: String,
  pressure: Number,         // mb
  cloudCover: Number,       // %
  visibility: Number,       // km
  condition: String,
  severityScore: Number,
  severityZone: String,
  observedAt: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('WeatherHistory', weatherHistorySchema);
