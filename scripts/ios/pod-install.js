const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = function (context) {
  const iosPath = path.join(context.opts.projectRoot, "platforms", "ios");

  if (!fs.existsSync(path.join(iosPath, "Podfile"))) {
    console.warn("⚠️ Podfile not found, skipping pod install.");
    return;
  }

  try {
    console.log("📦 Running 'pod install'...");
    execSync("pod install", { cwd: iosPath, stdio: "inherit" });
  } catch (err) {
    console.error("❌ pod install failed:", err);
  }
};
