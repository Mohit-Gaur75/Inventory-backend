const { fork } = require("child_process");
const path = require("path");
const Shop = require("../models/Shop");

/**
 * Checks if the database is empty upon deployment or server startup.
 * If zero shops exist, automatically runs the seeder in a background process
 * so that new users and evaluators never encounter a completely blank platform.
 */
const autoSeedIfEmpty = async () => {
  if (process.env.AUTO_SEED === "false") {
    return;
  }

  try {
    const shopCount = await Shop.countDocuments();
    if (shopCount === 0) {
      console.log("🌱 [AutoSeed] Fresh deployment detected (0 shops in database).");
      console.log("🌱 [AutoSeed] Initializing demo marketplace data in background...");

      const seedScript = path.join(__dirname, "../scripts/seedData.js");
      const adminScript = path.join(__dirname, "../scripts/seedAdmin.js");

      const seedProcess = fork(seedScript, [], {
        env: process.env,
        stdio: "inherit",
      });

      seedProcess.on("exit", (code) => {
        if (code === 0) {
          console.log("✅ [AutoSeed] Initial marketplace data successfully populated!");
          fork(adminScript, [], { env: process.env, stdio: "inherit" });
        } else {
          console.warn(`⚠️  [AutoSeed] Seeder finished with exit code ${code}`);
        }
      });
    }
  } catch (err) {
    console.error("⚠️  [AutoSeed] Check failed:", err.message);
  }
};

module.exports = autoSeedIfEmpty;
