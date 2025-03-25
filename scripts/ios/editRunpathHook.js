const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

// Get the project name from config.xml
function getProjectName(projectRoot) {
  const configFilePath = path.join(projectRoot, 'config.xml');
  const configContent = fs.readFileSync(configFilePath, 'utf8');
  const match = configContent.match(/<name>(.*?)<\/name>/);
  return match ? match[1] : null;
}

// Function to update LD_RUNPATH_SEARCH_PATHS for specific target
function updateRunpathForTarget(projectRoot) {
  return new Promise((resolve, reject) => {
    const projectName = getProjectName(projectRoot);
    if (!projectName) {
      return reject(new Error('🚨 Project name could not be determined.'));
    }

    const pbxprojPath = path.join(projectRoot, `platforms/ios/${projectName}.xcodeproj/project.pbxproj`);

    // Load the .pbxproj file
    const project = xcode.project(pbxprojPath);

    // Parse the .pbxproj file
    project.parse(err => {
      if (err) {
        return reject(new Error(`🚨 Error parsing .pbxproj: ${err}`));
      }

      // Iterate through all build configurations in the project
      const configurations = project.pbxXCBuildConfigurationSection();

      Object.keys(configurations).forEach(configId => {
        const config = configurations[configId];

        if (config.buildSettings && config.buildSettings.PRODUCT_NAME === 'MobileMessagingNotificationExtension') {
          // Modify LD_RUNPATH_SEARCH_PATHS if it matches the target
          const currentPath = config.buildSettings.LD_RUNPATH_SEARCH_PATHS;
          if (currentPath === '"@executable_path/Frameworks"') {
            config.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"@executable_path/../../Frameworks"';
            console.log(`⭐️ Updated LD_RUNPATH_SEARCH_PATHS for target: ${config.buildSettings.PRODUCT_NAME}`);
          }
        }
      });

      // Write the changes back to the .pbxproj file
      fs.writeFileSync(pbxprojPath, project.writeSync());
      console.log('⭐️ Updated project.pbxproj');
      resolve();
    });
  });
}

// Cordova hook entry point
module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;

  return updateRunpathForTarget(projectRoot)
    .then(() => {
      console.log('⭐️ Runpath successfully updated for MobileMessagingNotificationExtension.');
    })
    .catch(err => {
      console.error('🚨 Error updating runpath:', err);
      throw err;
    });
};