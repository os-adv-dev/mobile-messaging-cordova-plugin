const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

module.exports = function (context) {
  const iosPath = path.join(context.opts.projectRoot, "platforms", "ios");
  const podfilePath = path.join(iosPath, "Podfile");

  if (!fs.existsSync(podfilePath)) {
    console.warn("⚠️ Podfile not found, skipping.");
    return;
  }

  let podfileContent = fs.readFileSync(podfilePath, "utf8");

  const extensionTargetBlock = `
  target 'MobileMessagingNotificationExtension' do
    inherit! :search_paths
  end`;

  if (podfileContent.includes("target 'MobileMessagingNotificationExtension'")) {
    console.log("ℹ️ Extension target already present.");
    return;
  }

  // Inject the extension target inside the main app target
  const updatedContent = podfileContent.replace(
    /(target\s+['"][^'"]+['"]\s+do[\s\S]+?)(^\s*end\s*$)/m,
    (match, body, endLine) => {
      return body + extensionTargetBlock + "\n" + endLine;
    }
  );

  fs.writeFileSync(podfilePath, updatedContent, "utf8");
  console.log("✅ Injected MobileMessagingNotificationExtension target into Podfile.");

  try {
    console.log("📦 Running 'pod install'...");
    execSync("pod install", { cwd: iosPath, stdio: "inherit" });
  } catch (err) {
    console.error("❌ Failed to run 'pod install':", err);
  }
};
