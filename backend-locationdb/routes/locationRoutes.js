const express = require('express');
const router = express.Router();
const {
  getStates,
  getDistricts,
  getAreas,
  searchLocations
} = require('../controllers/locationController');

router.get('/states', getStates);
router.get('/districts/:state', getDistricts);
router.get('/areas/:district', getAreas); // extra endpoint — see note in locationController.js
router.get('/search', searchLocations);

module.exports = router;
