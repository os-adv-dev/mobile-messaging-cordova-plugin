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
            const newTargetBlock = `
  target 'MobileMessagingNotificationExtension' do
    inherit! :search_paths
  end
`;

            // Define the post_install block to add the required search paths only for the second target
            const postInstallBlock = `
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'MobileMessagingNotificationExtension'
      target.build_configurations.each do |config|
        config.build_settings['PODS_XCFRAMEWORKS_BUILD_DIR'] = 'build/\${CONFIGURATION}-iphoneos/XCFrameworkIntermediates'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= ['$(inherited)', '"\${PODS_CONFIGURATION_BUILD_DIR}/CocoaLumberjack"', '"\${PODS_CONFIGURATION_BUILD_DIR}/FLEX"', '"\${PODS_CONFIGURATION_BUILD_DIR}/FirebaseCore"', '"\${PODS_CONFIGURATION_BUILD_DIR}/FirebaseCoreInternal"', '"\${PODS_CONFIGURATION_BUILD_DIR}/GoogleUtilities"', '"\${PODS_CONFIGURATION_BUILD_DIR}/FirebaseInstallations"', '"\${PODS_CONFIGURATION_BUILD_DIR}/MobileMessaging"', '"\${PODS_CONFIGURATION_BUILD_DIR}/PromisesObjC"', '"\${PODS_CONFIGURATION_BUILD_DIR}/PureeOS"', '"\${PODS_CONFIGURATION_BUILD_DIR}/YapDatabase"', '"\${PODS_CONFIGURATION_BUILD_DIR}/nanopb"', '"\${PODS_ROOT}/FirebaseAnalytics/Frameworks"', '"\${PODS_ROOT}/GoogleAppMeasurement/Frameworks"', '"\${PODS_XCFRAMEWORKS_BUILD_DIR}/FirebaseAnalytics/AddIdSupport"', '"\${PODS_XCFRAMEWORKS_BUILD_DIR}/GoogleAppMeasurement/AddIdSupport"', '"\${PODS_XCFRAMEWORKS_BUILD_DIR}/GoogleAppMeasurement/WithoutAdIdSupport"']
      end
    end
  end
end
`;

            // Insert the new target block and post_install block before the last 'end'
            let updatedPodfileContent = podfileContent.replace(/end\s*$/, `${newTargetBlock}\nend`);
            updatedPodfileContent += postInstallBlock;

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