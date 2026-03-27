const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const existing = await User.findOne({ role: "admin" });
    if (existing) {
      console.log("⚠️  Admin already exists:");
      console.log(`   Email: ${existing.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: process.env.NAME,
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
      role: "admin",
    });

    console.log("✅ Admin created successfully!");
    console.log("─────────────────────────────");
    console.log(`   Name:     ${admin.name}`);
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Role:     admin`);
    console.log("─────────────────────────────");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding admin:", err.message);
    process.exit(1);
  }
};

seedAdmin();