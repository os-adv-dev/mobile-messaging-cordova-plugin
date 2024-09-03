const fs = require('fs');
const path = require('path');
const parseString = require('xml2js').parseString;

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

function getProvisioningInfo() {
    return new Promise((resolve, reject) => {
        const jsonFilePath = path.join(process.cwd(), 'provisioning_info.json');
        console.log('Reading provisioning information from:', jsonFilePath);

        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading provisioning info JSON file:', err.message);
                return reject(`Error reading provisioning info JSON file: ${err.message}`);
            }

            try {
                const provisioningInfo = JSON.parse(data);
                const { provisioningProfileName, teamID } = provisioningInfo;

                if (!provisioningProfileName || !teamID) {
                    console.error('Provisioning profile name or team ID not found in JSON file.');
                    return reject('Provisioning profile name or team ID not found in JSON file.');
                }

                console.log('Provisioning profile name:', provisioningProfileName);
                console.log('Team ID:', teamID);
                resolve({ provisioningProfileName, teamID });
            } catch (err) {
                console.error('Error parsing provisioning info JSON file:', err.message);
                reject(`Error parsing provisioning info JSON file: ${err.message}`);
            }
        });
    });
}

function backupPbxProj(pbxprojPath) {
    return new Promise((resolve, reject) => {
        const backupPath = path.join(path.dirname(pbxprojPath), 'project-before-edit.pbxproj');
        console.log('Creating backup of project.pbxproj at:', backupPath);

        fs.copyFile(pbxprojPath, backupPath, (err) => {
            if (err) {
                console.error('Error creating backup file:', err.message);
                return reject(`Error creating backup file: ${err.message}`);
            }
            console.log(`Backup successfully created at ${backupPath}`);
            resolve();
        });
    });
}

function updatePbxProj(pbxprojPath, teamID, ppName) {
    return new Promise((resolve, reject) => {
        console.log('Updating project.pbxproj at:', pbxprojPath);

        fs.readFile(pbxprojPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading project.pbxproj:', err.message);
                return reject(err);
            }

            const teamIDPattern = /DEVELOPMENT_TEAM\s*=\s*["']?([A-Z0-9]*)["']?;/g;
            //const teamIDPattern = /DEVELOPMENT_TEAM\s*=\s*/g;
            //const ppSpecifierPattern = /PROVISIONING_PROFILE_SPECIFIER\s*=\s*".+?";/g;

            let updatedPbxproj = data.replace(teamIDPattern, (match, p1) => {
                const correctTeamID = p1 || teamID;
                return `${match}\n\t\t\t\t"DEVELOPMENT_TEAM[sdk=iphoneos*]" = ${correctTeamID};\n\t\t\t\t"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "${ppName}";`;
            });

            //updatedPbxproj = updatedPbxproj.replace(ppSpecifierPattern, (match) => {
            //    return `${match}\n\t\t\t\t"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "${ppName}";`;
            //});

            fs.writeFile(pbxprojPath, updatedPbxproj, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing updated project.pbxproj:', err.message);
                    return reject(err);
                }
                console.log('Successfully updated the project.pbxproj file.');
                resolve();
            });
        });
    });
}

function editXcodeProj() {
    return getProjectName()
        .then((projectName) => {
            if (!projectName) {
                throw new Error('Project name not found in config.xml.');
            }

            return getProvisioningInfo().then(({ provisioningProfileName, teamID }) => {
                const xcodeprojPath = path.join('platforms', 'ios', `${projectName}.xcodeproj`, 'project.pbxproj');
                console.log('Resolved path to project.pbxproj:', xcodeprojPath);

                if (!fs.existsSync(xcodeprojPath)) {
                    console.error('The path to project.pbxproj was not found:', xcodeprojPath);
                    throw new Error(`The path to project.pbxproj was not found: ${xcodeprojPath}`);
                }

                return backupPbxProj(xcodeprojPath)
                    .then(() => updatePbxProj(xcodeprojPath, teamID, provisioningProfileName));
            });
        })
        .catch((err) => {
            console.error('Error during the editXcodeProj process:', err.message);
            throw err;
        });
}

module.exports = function (context) {
    return editXcodeProj();
};