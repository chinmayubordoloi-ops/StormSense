/**
 * Run this once (and again any time you edit the seed data files) to populate
 * or refresh the location database:
 *
 *   node scripts/seedDatabase.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Location = require('../models/Location');

const assamLocations = require('../data/assamLocations');

const allLocations = [...assamLocations];


async function seed() {

  await connectDB();

  let created = 0;
  let updated = 0;

  for (const loc of allLocations) {

    const existing = await Location.findOne({
      locationId: loc.locationId
    });

    if (existing) {

      await Location.updateOne(
        { locationId: loc.locationId },
        loc
      );

      updated++;

    } else {

      await Location.create(loc);

      created++;
    }
  }

  console.log(
    `[seed] Done. ${created} location(s) created, ${updated} updated. Total in file: ${allLocations.length}.`
  );

  await mongoose.disconnect();

  process.exit(0);
}


seed().catch(err => {

  console.error('[seed] Failed:', err);

  process.exit(1);

});