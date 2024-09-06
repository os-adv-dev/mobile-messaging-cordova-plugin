const fs = require('fs');
const path = require('path');
const plist = require('plist');
const parseString = require('xml2js').parseString;

// Function to read project name from config.xml
function getProjectName() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Reading project name from config.xml...');
        fs.readFile('config.xml', (err, data) => {
            if (err) {
                console.error('🚨 Error reading config.xml:', err.message);
                return reject(err);
            }

            parseString(data.toString(), (err, result) => {
                if (err) {
                    console.error('🚨 Error parsing config.xml:', err.message);
                    return reject(err);
                }

                let name = result.widget.name.toString().trim();
                console.log('🔍 Project name:', name);
                resolve(name || null);
            });
        });
    });
}

// Function to fetch provisioning information from the provisioning_info.json file
function getProvisioningInfo() {
    return new Promise((resolve, reject) => {
        const jsonFilePath = path.join(process.cwd(), 'provisioning_info.json');
        console.log('🔍 Reading provisioning information from:', jsonFilePath);

        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('🚨 Error reading provisioning info JSON file:', err.message);
                return reject(`Error reading provisioning info JSON file: ${err.message}`);
            }

            try {
                const provisioningInfo = JSON.parse(data);
                const { firstTargetId, firstTargetPP, secondTargetId, secondTargetPP } = provisioningInfo;

                if (!firstTargetId || !firstTargetPP || !secondTargetId || !secondTargetPP) {
                    console.error('🚨 Missing necessary provisioning info.');
                    return reject('Missing necessary provisioning info.');
                }

                console.log('👉 First Target ID:', firstTargetId);
                console.log('👉 First Target PP:', firstTargetPP);
                console.log('👉 Second Target ID:', secondTargetId);
                console.log('👉 Second Target PP:', secondTargetPP);

                resolve({ firstTargetId, firstTargetPP, secondTargetId, secondTargetPP });
            } catch (err) {
                console.error('🚨 Error parsing provisioning info JSON file:', err.message);
                reject(`Error parsing provisioning info JSON file: ${err.message}`);
            }
        });
    });
}

// Function to update only the <key>provisioningProfiles</key> section of the exportOptions.plist
function updateProvisioningProfiles(firstTargetId, firstTargetPP, secondTargetId, secondTargetPP) {
    return new Promise((resolve, reject) => {
        const plistPath = path.join('platforms', 'ios', 'exportOptions.plist');
        console.log('🔍 Reading exportOptions.plist from:', plistPath);

        fs.readFile(plistPath, 'utf8', (err, data) => {
            if (err) {
                console.error('🚨 Error reading exportOptions.plist:', err.message);
                return reject(err);
            }

            try {
                // Parse the current plist file
                const plistContent = plist.parse(data);

                // Remove the existing provisioningProfiles dictionary if it exists
                if (plistContent.provisioningProfiles) {
                    console.log('🔍 Removing existing provisioning profiles...');
                    delete plistContent.provisioningProfiles;
                }

                // Add new provisioning profiles for both targets
                plistContent.provisioningProfiles = {
                    [firstTargetId]: firstTargetPP,
                    [secondTargetId]: secondTargetPP
                };

                // Convert the updated plist content back to XML
                const updatedPlistContent = plist.build(plistContent);

                // Write the updated content back to exportOptions.plist
                fs.writeFile(plistPath, updatedPlistContent, 'utf8', (err) => {
                    if (err) {
                        console.error('🚨 Error writing exportOptions.plist:', err.message);
                        return reject(err);
                    }
                    console.log('✅ Successfully updated the exportOptions.plist file.');
                    resolve();
                });
            } catch (err) {
                console.error('🚨 Error parsing exportOptions.plist:', err.message);
                reject(`Error parsing exportOptions.plist: ${err.message}`);
            }
        });
    });
}

// Main function to execute the hook logic
function editExportOptionsPlist() {
    return getProjectName()
        .then(() => getProvisioningInfo())
        .then(({ firstTargetId, firstTargetPP, secondTargetId, secondTargetPP }) => {
            return updateProvisioningProfiles(firstTargetId, firstTargetPP, secondTargetId, secondTargetPP);
        })
        .catch((err) => {
            console.error('🚨 Error during the exportOptions.plist modification process:', err.message);
            throw err;
        });
}

module.exports = function (context) {
    return editExportOptionsPlist();
};