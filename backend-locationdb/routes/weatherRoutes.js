const express = require('express');
const router = express.Router();
const { getWeatherByLocationId } = require('../controllers/weatherController');

router.get('/:locationId', getWeatherByLocationId);

module.exports = router;
