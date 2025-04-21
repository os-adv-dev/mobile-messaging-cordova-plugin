const fs = require("fs");
const path = require("path");

module.exports = function (context) {
  const podfilePath = path.join(context.opts.projectRoot, "platforms", "ios", "Podfile");

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
    console.log("✅ Added 'MobileMessagingNotificationExtension' target to Podfile.");
  } else {
    console.log("ℹ️ 'MobileMessagingNotificationExtension' target already exists.");
  }
};