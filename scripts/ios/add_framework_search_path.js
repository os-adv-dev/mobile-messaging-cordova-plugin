const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

module.exports = function(context) {
    //const includesiOS = context.opts.platforms.indexOf('ios') !== -1;
    //if (!includesiOS) return;

    return new Promise((resolve, reject) => {
        const pluginId = context.opts.plugin.id;
        const secondaryTargetName = 'MobileMessagingNotificationExtension';  // Set your secondary target name here

        function fromDir(startPath, filter, rec) {
            if (!fs.existsSync(startPath)) {
                console.log('❌ No directory found at', startPath);
                return;
            }

            const files = fs.readdirSync(startPath);
            for (const file of files) {
                const filename = path.join(startPath, file);
                const stat = fs.lstatSync(filename);
                if (stat.isDirectory() && rec) {
                    const result = fromDir(filename, filter); // Recurse
                    if (result) return result;
                }

                if (filename.indexOf(filter) >= 0) {
                    return filename;
                }
            }
        }

        const xcodeProjPath = fromDir('platforms/ios', '.xcodeproj', false);
        const projectPath = `${xcodeProjPath}/project.pbxproj`;
        const myProj = xcode.project(projectPath);

        function set_FRAMEWORK_SEARCH_PATHS_forTarget(proj, targetName) {
            const targets = proj.pbxTargetByName(targetName);
            if (!targets) {
                console.error(`🚨 Target ${targetName} not found`);
                return false;
            }

            const targetUUID = targets.uuid;
            const buildConfigs = proj.pbxXCBuildConfigurationSection();
            for (const config in buildConfigs) {
                if (buildConfigs[config].buildSettings && buildConfigs[config].buildSettings.PRODUCT_NAME) {
                    const targetProduct = buildConfigs[config].buildSettings.PRODUCT_NAME;
                    if (targetProduct === targetName) {
                        const frameworkSearchPaths = proj.getBuildProperty("FRAMEWORK_SEARCH_PATHS", config);

                        const lineToAdd = `"\\"$(PROJECT_DIR)/Plugins/${pluginId}\\""`;
                        if (frameworkSearchPaths) {
                            const isArray = Array.isArray(frameworkSearchPaths);
                            const alreadyExists = isArray
                                ? frameworkSearchPaths.some(entry => entry.includes(pluginId))
                                : frameworkSearchPaths.includes(pluginId);

                            if (!alreadyExists) {
                                const newValueArray = isArray ? frameworkSearchPaths : [frameworkSearchPaths];
                                newValueArray.push(lineToAdd);
                                proj.updateBuildProperty("FRAMEWORK_SEARCH_PATHS", newValueArray, config);
                                console.log(`✅ Added FRAMEWORK_SEARCH_PATHS to ${targetName}`);
                            } else {
                                console.log(`⚠️  FRAMEWORK_SEARCH_PATHS already exists for ${targetName}`);
                            }
                        } else {
                            proj.addBuildProperty("FRAMEWORK_SEARCH_PATHS", lineToAdd, config);
                            console.log(`✅ Added FRAMEWORK_SEARCH_PATHS to ${targetName}`);
                        }
                    }
                }
            }
        }

        myProj.parse(err => {
            if (err) {
                console.error('🚨 Error while parsing project:', err);
                return reject('Error while parsing project');
            }

            set_FRAMEWORK_SEARCH_PATHS_forTarget(myProj, secondaryTargetName);

            // Write back the modified project file
            fs.writeFileSync(projectPath, myProj.writeSync());
            console.log(`🎉 Successfully updated FRAMEWORK_SEARCH_PATHS for target: ${secondaryTargetName}`);

            resolve();
        });
    });
};