const validateEnv = () => {
  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   → ${key}`));
    console.error("\n💡 Copy server/.env.example to server/.env and fill in values\n");
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  JWT_SECRET is too short. Use at least 32 characters.");
  }

  console.log("✅ Environment variables OK");
  console.log(`   → PORT: ${process.env.PORT}`);
  console.log(`   → NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   → MONGO_URI: ${process.env.MONGO_URI?.slice(0, 30)}...`);
  console.log(`   → CLOUDINARY: ${process.env.CLOUDINARY_CLOUD_NAME}`);
};

module.exports = validateEnv;
