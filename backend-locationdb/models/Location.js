const mongoose = require('mongoose');

/**
 * Represents ONE selectable point in the India -> State -> District -> Local Area
 * hierarchy. Every document is a leaf: an actual place with coordinates.
 *
 * "level" distinguishes a district's own headquarters/main town (level: "district")
 * from a smaller locality inside that district (level: "locality") — this lets the
 * Local Area dropdown include both "Guwahati (district HQ)" and "Paltan Bazar"
 * (a specific locality within it) under the same district.
 *
 * This collection stores ONLY static "where" data. It must never store current
 * weather values — those always come live from the weather API (see
 * controllers/weatherController.js).
 */
const locationSchema = new mongoose.Schema({
  locationId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    default: 'India',
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  district: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  cityOrArea: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['district', 'locality'],
    default: 'locality'
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  }
}, { timestamps: true });

// Supports the search endpoint (GET /api/locations/search?query=)
locationSchema.index({ cityOrArea: 'text', district: 'text', state: 'text' });

module.exports = mongoose.model('Location', locationSchema);
