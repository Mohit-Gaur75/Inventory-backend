const mongoose = require("mongoose");
const autoSeedIfEmpty = require("../utils/autoSeeder");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Check if deployment database is empty and auto-seed if needed
    autoSeedIfEmpty().catch((err) => {
      console.warn("⚠️  [AutoSeed] Background check skipped:", err.message);
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
