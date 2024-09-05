const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        const projectRoot = context.opts.projectRoot;
        const podfilePath = path.join(projectRoot, 'platforms', 'ios', 'Podfile');

        // Check if Podfile exists
        if (!fs.existsSync(podfilePath)) {
            console.error(`🚨 Podfile not found at ${podfilePath}`);
            return reject(new Error(`Podfile not found at ${podfilePath}`));
        }

        try {
            // Read the existing Podfile
            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            // Define the new target block to add
 /*           const newTargetBlock = `
  target 'MobileMessagingNotificationExtension' do
      inherit! :search_paths
      #pod 'MobileMessaging', '12.6.2'
  end
`;*/

            // Insert the new target block before the last 'end'
            const updatedPodfileContent = podfileContent.replace(/end\s*$/, "\ttarget 'MobileMessagingNotificationExtension' do\n\t\tinherit! :search_paths\n\tend\nend");

            // Write the updated content back to the Podfile
            fs.writeFileSync(podfilePath, updatedPodfileContent, 'utf8');

            console.log('✅ Podfile updated successfully!');

            // Log the contents of the Podfile after the change
            console.log('📄 Updated Podfile contents:');
            console.log(updatedPodfileContent);

            // Run 'pod install' to update the Pods
            console.log('Running pod install...');
            exec('pod install', { cwd: path.dirname(podfilePath) }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`🚨 Error running pod install: ${error.message}`);
                    return reject(new Error(`Error running pod install: ${error.message}`));
                }

                // Log stdout and stderr for further insights
                console.log(stdout);
                if (stderr) {
                    console.error(`pod install stderr: ${stderr}`);
                }

                console.log('✅ pod install completed successfully!');
                resolve(); 
            });
        } catch (error) {
            console.error(`🚨 Error updating Podfile: ${error.message}`);
            reject(new Error(`Error updating Podfile: ${error.message}`));
        }
    });
};