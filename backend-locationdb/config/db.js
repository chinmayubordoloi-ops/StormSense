const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stormsense';

  try {
    await mongoose.connect(uri);
    console.log(`[db] Connected to MongoDB (${uri})`);
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error.message);
    console.error('[db] Is MongoDB running locally, or is MONGODB_URI set correctly in .env?');
    // We don't crash the whole server — the old search/GIS/radar endpoints
    // (which don't need MongoDB) can keep working even if this fails.
  }
}

module.exports = connectDB;
