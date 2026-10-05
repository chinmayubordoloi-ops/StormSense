const Location = require('../models/Location');

// GET /api/locations/states
// Returns the distinct list of states we have data for.
async function getStates(req, res) {
  try {
    const country = req.query.country || 'India';
    const states = await Location.distinct('state', { country });
    res.json({ country, states: states.sort() });
  } catch (error) {
    console.error('[locations] getStates error:', error.message);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
}

// GET /api/locations/districts/:state
// Returns the distinct list of districts within a given state.
async function getDistricts(req, res) {
  try {
    const { state } = req.params;
    const districts = await Location.distinct('district', {
      state: new RegExp(`^${escapeRegex(state)}$`, 'i')
    });

    if (districts.length === 0) {
      return res.status(404).json({ error: `No districts found for state "${state}"` });
    }

    res.json({ state, districts: districts.sort() });
  } catch (error) {
    console.error('[locations] getDistricts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
}

// GET /api/locations/areas/:district
// Returns every selectable local area/city within a given district — this is
// the extra endpoint your 4-endpoint list didn't include, but your UI flow
// (State -> District -> Local Area) needs it to populate the final dropdown
// before "Get Live Weather". Without it, the frontend would have no way to
// list the local areas inside whichever district the user just picked.
async function getAreas(req, res) {
  try {
    const { district } = req.params;
    const areas = await Location.find({
      district: new RegExp(`^${escapeRegex(district)}$`, 'i')
    }).select('locationId cityOrArea level latitude longitude -_id').sort({ level: 1, cityOrArea: 1 });

    if (areas.length === 0) {
      return res.status(404).json({ error: `No local areas found for district "${district}"` });
    }

    res.json({ district, areas });
  } catch (error) {
    console.error('[locations] getAreas error:', error.message);
    res.status(500).json({ error: 'Failed to fetch local areas' });
  }
}

// GET /api/locations/search?query=
// Free-text search across state/district/city-area names.
async function searchLocations(req, res) {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query parameter "query" (min 2 characters) is required' });
    }

    const regex = new RegExp(escapeRegex(query.trim()), 'i');
    const results = await Location.find({
      $or: [{ cityOrArea: regex }, { district: regex }, { state: regex }]
    }).select('locationId country state district cityOrArea level latitude longitude -_id').limit(20);

    res.json({ query, count: results.length, results });
  } catch (error) {
    console.error('[locations] searchLocations error:', error.message);
    res.status(500).json({ error: 'Failed to search locations' });
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getStates, getDistricts, getAreas, searchLocations };
