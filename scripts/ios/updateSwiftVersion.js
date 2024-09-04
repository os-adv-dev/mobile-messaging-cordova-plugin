const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
const xml2js = require('xml2js'); // Import xml2js to parse config.xml

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const platformPath = path.join(projectRoot, 'platforms', 'ios');
    const configPath = path.join(projectRoot, 'config.xml');

    return getProjectName(configPath)
        .then(projectName => {
            const pbxprojPath = path.join(platformPath, projectName + '.xcodeproj', 'project.pbxproj');
            const xcodeProject = xcode.project(pbxprojPath);

            console.log('Parsing the project.pbxproj file...');

            return new Promise((resolve, reject) => {
                try {
                    // Parse the project.pbxproj file
                    xcodeProject.parseSync();

                    // Get all the build configurations
                    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
                    const COMMENT_KEY = /_comment$/;

                    let modified = false;

                    // Iterate over each build configuration
                    for (const configName in buildConfigs) {
                        if (!COMMENT_KEY.test(configName)) {
                            let buildConfig = buildConfigs[configName];

                            // Check if SWIFT_OBJC_INTERFACE_HEADER_NAME is set to "OutSystems-Swift.h"
                            if (buildConfig.buildSettings && buildConfig.buildSettings.SWIFT_OBJC_INTERFACE_HEADER_NAME === '"OutSystems-Swift.h"') {

                                // Check if SWIFT_VERSION is missing or undefined
                                if (!buildConfig.buildSettings.SWIFT_VERSION || buildConfig.buildSettings.SWIFT_VERSION !== '5.0') {
                                    // Add or update the SWIFT_VERSION setting
                                    buildConfig.buildSettings.SWIFT_VERSION = '5.0';
                                    console.log(`Added SWIFT_VERSION = 5.0 to configuration: ${buildConfig.name}`);
                                    modified = true; // Mark as modified
                                }
                            }
                        }
                    }

                    if (modified) {
                        // Write the updated project.pbxproj back to disk
                        fs.writeFileSync(pbxprojPath, xcodeProject.writeSync(), 'utf8');
                        console.log('Updated project.pbxproj and added SWIFT_VERSION where needed.');
                    } else {
                        console.log('No changes needed to project.pbxproj.');
                    }

                    resolve();
                } catch (error) {
                    console.error('Error processing the project.pbxproj file:', error);
                    reject(error);
                }
            });
        });
};

// Helper function to get the project name from config.xml using xml2js
function getProjectName(configPath) {
    return new Promise((resolve, reject) => {
        fs.readFile(configPath, (err, data) => {
            if (err) {
                return reject(`Error reading ${configPath}: ${err}`);
            }

            // Parse the XML
            xml2js.parseString(data, (err, result) => {
                if (err) {
                    return reject(`Error parsing ${configPath}: ${err}`);
                }

                // Extract project name from config.xml
                const projectName = result.widget && result.widget.name ? result.widget.name[0] : null;
                if (!projectName) {
                    return reject('Project name not found in config.xml');
                }

                console.log('Project name found:', projectName);
                resolve(projectName);
            });
        });
    });
}