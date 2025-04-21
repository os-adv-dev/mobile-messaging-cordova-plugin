const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

module.exports = function (context) {
  const iosPath = path.join(context.opts.projectRoot, "platforms", "ios");
  const podfilePath = path.join(iosPath, "Podfile");

  if (!fs.existsSync(podfilePath)) {
    console.warn("Podfile not found, skipping target injection.");
    return;
  }

  const targetBlock = `
target 'MobileMessagingNotificationExtension' do
  inherit! :search_paths
end
`;

  let podfileContent = fs.readFileSync(podfilePath, "utf8");

  if (!podfileContent.includes("target 'MobileMessagingNotificationExtension'")) {
    podfileContent += "\n" + targetBlock;
    fs.writeFileSync(podfilePath, podfileContent, "utf8");
    console.log("✅ Added 'MobileMessagingNotificationExtension' target to Podfile");

    try {
      console.log("📦 Running 'pod install'...");
      execSync("pod install", { cwd: iosPath, stdio: "inherit" });
    } catch (err) {
      console.error("❌ Failed to run 'pod install':", err);
    }
  } else {
    console.log("ℹ️ 'MobileMessagingNotificationExtension' target already exists");
  }
};
