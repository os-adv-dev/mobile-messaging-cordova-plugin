const fs = require('fs');
const path = require('path');
const parseString = require('xml2js').parseString;
const plist = require('plist'); 

function getProjectName() {
    return new Promise((resolve, reject) => {
        console.log('Reading project name from config.xml...');
        fs.readFile('config.xml', (err, data) => {
            if (err) {
                console.error('Error reading config.xml:', err.message);
                return reject(err);
            }

            parseString(data.toString(), (err, result) => {
                if (err) {
                    console.error('Error parsing config.xml:', err.message);
                    return reject(err);
                }

                let name = result.widget.name.toString().trim();
                console.log('Project name:', name);
                resolve(name || null);
            });
        });
    });
}

function getProvisioningProfileType(provisioningProfilePath) {
    const profileContent = fs.readFileSync(provisioningProfilePath, 'utf8');

    // Extract the embedded plist
    const plistStart = profileContent.indexOf('<?xml');
    const plistEnd = profileContent.indexOf('</plist>') + '</plist>'.length;
    const plistContent = profileContent.substring(plistStart, plistEnd);

    const parsedPlist = plist.parse(plistContent);

    // Determine profile type
    const entitlements = parsedPlist.Entitlements || {};
    const provisionedDevices = parsedPlist.ProvisionedDevices;

    if (provisionedDevices && entitlements['aps-environment'] === 'development') {
        return 'Development';
    } else if (provisionedDevices) {
        return 'AdHoc';
    } else {
        return 'Distribution';
    }
}

function getProvisioningInfo() {
    return new Promise((resolve, reject) => {
        const jsonFilePath = path.join(process.cwd(), 'provisioning_info.json');
        console.log('Reading provisioning information from:', jsonFilePath);

        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('🚨 Error reading provisioning info JSON file:', err.message);
                return reject(`Error reading provisioning info JSON file: ${err.message}`);
            }

            try {
                const provisioningInfo = JSON.parse(data);
                const { provisioningProfileName, teamID } = provisioningInfo;

                if (!provisioningProfileName || !teamID) {
                    console.error('🚨 Provisioning profile name or team ID not found in JSON file.');
                    return reject('Provisioning profile name or team ID not found in JSON file.');
                }

                console.log('👉 Provisioning profile name:', provisioningProfileName);
                console.log('👉 Team ID:', teamID);
                resolve({ provisioningProfileName, teamID });
            } catch (err) {
                console.error('🚨 Error parsing provisioning info JSON file:', err.message);
                reject(`Error parsing provisioning info JSON file: ${err.message}`);
            }
        });
    });
}

function backupPbxProj(pbxprojPath, backupName) {
    return new Promise((resolve, reject) => {
        const backupPath = path.join(path.dirname(pbxprojPath), backupName);
        console.log(`👉 Creating backup of project.pbxproj at: ${backupPath}`);

        fs.copyFile(pbxprojPath, backupPath, (err) => {
            if (err) {
                console.error(`🚨 Error creating backup file: ${err.message}`);
                return reject(`Error creating backup file: ${err.message}`);
            }
            console.log(`✅ Backup successfully created at ${backupPath}`);
            resolve();
        });
    });
}

function updatePbxProj(pbxprojPath, teamID, ppName, codeSignIdentity) {
    return new Promise((resolve, reject) => {
        console.log('👉 Updating project.pbxproj at:', pbxprojPath);

        fs.readFile(pbxprojPath, 'utf8', (err, data) => {
            if (err) {
                console.error('🚨 Error reading project.pbxproj:', err.message);
                return reject(err);
            }

            // Regex pattern to find the PRODUCT_NAME = MobileMessagingNotificationExtension
            const productNamePattern = /PRODUCT_NAME\s*=\s*MobileMessagingNotificationExtension\s*;/g;

            let updatedPbxproj = data.replace(productNamePattern, (match) => {

                if (codeSignIdentity === "iPhone Distribution") {
                    return `${match}\n\t\t\t\t"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "${ppName}";\n\t\t\t\tCODE_SIGN_IDENTITY = "${codeSignIdentity}";\n\t\t\t\tFRAMEWORK_SEARCH_PATHS = "$(inherited)";`;
                } else {
                    return `${match}\n\t\t\t\t"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "${ppName}";\n\t\t\t\tFRAMEWORK_SEARCH_PATHS = "$(inherited)";`;
                } 
            });

            const swiftVersionPattern = /PRODUCT_NAME\s*=\s*"\$\(TARGET_NAME\)";/g;

            updatedPbxproj = updatedPbxproj.replace(swiftVersionPattern, (match) => {
                return `${match}\n\t\t\t\tSWIFT_VERSION = 5;`;
            });

            // Regex pattern to find and replace DEVELOPMENT_TEAM = "" with dynamic teamID
            const devTeamPattern = /DEVELOPMENT_TEAM\s*=\s*"";/g;
            updatedPbxproj = updatedPbxproj.replace(devTeamPattern, `DEVELOPMENT_TEAM = "${teamID}";`);

            // Add the step to update the LD_RUNPATH_SEARCH_PATHS for the MobileMessagingNotificationExtension target
            updatedPbxproj = updatedPbxproj.replace(
                /(\{[^}]*?PRODUCT_NAME\s*=\s*MobileMessagingNotificationExtension;[^}]*?LD_RUNPATH_SEARCH_PATHS\s*=\s*"@executable_path\/Frameworks";|\{[^}]*?LD_RUNPATH_SEARCH_PATHS\s*=\s*"@executable_path\/Frameworks";[^}]*?PRODUCT_NAME\s*=\s*MobileMessagingNotificationExtension;)/gs,
                function(match) {
                    return match.replace('LD_RUNPATH_SEARCH_PATHS = "@executable_path/Frameworks";', 'LD_RUNPATH_SEARCH_PATHS = "@executable_path/../../Frameworks";');
                }
            );

            fs.writeFile(pbxprojPath, updatedPbxproj, 'utf8', (err) => {
                if (err) {
                    console.error('🚨 Error writing updated project.pbxproj:', err.message);
                    return reject(err);
                }
                console.log(`✅ Successfully updated the project.pbxproj file with teamID: ${teamID} and CODE_SIGN_IDENTITY: ${codeSignIdentity}`);
                resolve();
            });
        });
    });
}

function editXcodeProj() {
    return getProjectName()
        .then((projectName) => {
            if (!projectName) {
                throw new Error('🚨 Project name not found in config.xml.');
            }

            return getProvisioningInfo().then(({ provisioningProfileName, teamID }) => {
                const xcodeprojPath = path.join('platforms', 'ios', `${projectName}.xcodeproj`, 'project.pbxproj');
                console.log('👉 Resolved path to project.pbxproj:', xcodeprojPath);

                if (!fs.existsSync(xcodeprojPath)) {
                    console.error('🚨 The path to project.pbxproj was not found:', xcodeprojPath);
                    throw new Error(`The path to project.pbxproj was not found: ${xcodeprojPath}`);
                }

                // Path to the provisioning profiles folder
                const provisioningProfilesFolder = path.join('plugins', 'com-infobip-plugins-mobilemessaging', 'provisioning-profiles');

                // Ensure the folder exists
                if (!fs.existsSync(provisioningProfilesFolder)) {
                    throw new Error(`🚨 Provisioning profiles folder not found at ${provisioningProfilesFolder}`);
                }

                // Get all *.mobileprovision files
                const provisioningFiles = fs
                    .readdirSync(provisioningProfilesFolder)
                    .filter(file => file.endsWith('.mobileprovision'));

                if (provisioningFiles.length === 0) {
                    throw new Error('🚨 No .mobileprovision files found in the provisioning profiles folder.');
                }

                // Detect the type of the first provisioning profile
                const provisioningProfilePath = path.join(provisioningProfilesFolder, provisioningFiles[0]);
                const profileType = getProvisioningProfileType(provisioningProfilePath);

                console.log(`👉 Provisioning profile type detected: ${profileType}`);

                // Set CODE_SIGN_IDENTITY dynamically based on the profile type
                let codeSignIdentity = '';
                if (profileType === 'Development') {
                    codeSignIdentity = 'iPhone Developer';
                } else if (profileType === 'Distribution' || profileType === 'AdHoc') {
                    codeSignIdentity = 'iPhone Distribution';
                } else {
                    throw new Error(`🚨 Unknown provisioning profile type: ${profileType}`);
                }

                console.log(`👉 Setting CODE_SIGN_IDENTITY to: ${codeSignIdentity}`);

                // Backup and update the pbxproj file
                return backupPbxProj(xcodeprojPath, 'project-before-edit.pbxproj')
                    .then(() => updatePbxProj(xcodeprojPath, teamID, provisioningProfileName, codeSignIdentity))
                    .then(() => backupPbxProj(xcodeprojPath, 'project-after_hook.pbxproj'));
            });
        })
        .catch((err) => {
            console.error('🚨 Error during the editXcodeProj process:', err.message);
            throw err;
        });
}

module.exports = function (context) {
    return editXcodeProj();
};