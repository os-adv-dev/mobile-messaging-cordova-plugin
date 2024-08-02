const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const podfilePath = path.join(projectRoot, 'platforms', 'ios', 'Podfile');

    // Check if Podfile exists
    if (!fs.existsSync(podfilePath)) {
        console.error(`🚨 Podfile not found at ${podfilePath}`);
        return;
    }

    try {
        // Read the existing Podfile
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Define the new target block to add
        const newTargetBlock = `
  target 'MobileMessagingNotificationExtension' do
      inherit! :search_paths
      pod 'MobileMessaging', '12.6.2'
  end
`;

        // Insert the new target block before the last 'end'
        const updatedPodfileContent = podfileContent.replace(/end\s*$/, `${newTargetBlock}end`);

        // Write the updated content back to the Podfile
        fs.writeFileSync(podfilePath, updatedPodfileContent, 'utf8');

        console.log('✅ Podfile updated successfully!');
    } catch (error) {
        console.error(`🚨 Error updating Podfile: ${error.message}`);
    }
};