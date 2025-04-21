const fs = require("fs");
const path = require("path");

module.exports = function (context) {
  const iosPath = path.join(context.opts.projectRoot, "platforms", "ios");
  const podfilePath = path.join(iosPath, "Podfile");

  if (!fs.existsSync(podfilePath)) {
    console.warn("⚠️ Podfile not found, skipping patch.");
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

  const updatedContent = podfileContent.replace(
    /(target\s+['"][^'"]+['"]\s+do[\s\S]+?)(^\s*end\s*$)/m,
    (match, body, endLine) => {
      return body + extensionTargetBlock + "\n" + endLine;
    }
  );

  fs.writeFileSync(podfilePath, updatedContent, "utf8");
  console.log("✅ Patched Podfile with extension target.");
};
