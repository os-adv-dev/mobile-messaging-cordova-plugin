const fs = require('fs');
const path = require('path');
const parseString = require('xml2js').parseString;

function getProjectName() {
    return new Promise((resolve, reject) => {
        fs.readFile('config.xml', (err, data) => {
            if (err) return reject(err);

            parseString(data.toString(), (err, result) => {
                if (err) return reject(err);

                let name = result.widget.name.toString().trim();
                resolve(name || null);
            });
        });
    });
}

function getProvisioningInfo() {
    return new Promise((resolve, reject) => {
        const jsonFilePath = path.join(process.cwd(), 'provisioning_info.json');

        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) return reject(`Error reading provisioning info JSON file: ${err.message}`);

            try {
                const provisioningInfo = JSON.parse(data);
                const { provisioningProfileName, teamID } = provisioningInfo;

                if (!provisioningProfileName || !teamID) {
                    return reject('Provisioning profile name or team ID not found in JSON file.');
                }

                resolve({ provisioningProfileName, teamID });
            } catch (err) {
                reject(`Error parsing provisioning info JSON file: ${err.message}`);
            }
        });
    });
}

function updatePbxProj(pbxprojPath, teamID, ppName) {
    return new Promise((resolve, reject) => {
        fs.readFile(pbxprojPath, 'utf8', (err, data) => {
            if (err) return reject(err);

            const teamIDPattern = /DEVELOPMENT_TEAM\s*=\s*[A-Z0-9]+;/g;
            const ppSpecifierPattern = /PROVISIONING_PROFILE_SPECIFIER\s*=\s*".+?";/g;

            let updatedPbxproj = data.replace(teamIDPattern, (match) => {
                return `${match}\n"DEVELOPMENT_TEAM[sdk=iphoneos*]" = ${teamID};`;
            });

            updatedPbxproj = updatedPbxproj.replace(ppSpecifierPattern, (match) => {
                return `${match}\n"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "${ppName}";`;
            });

            fs.writeFile(pbxprojPath, updatedPbxproj, 'utf8', (err) => {
                if (err) return reject(err);
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
                if (!fs.existsSync(xcodeprojPath)) {
                    throw new Error(`The path to project.pbxproj was not found: ${xcodeprojPath}`);
                }

                return updatePbxProj(xcodeprojPath, teamID, provisioningProfileName);
            });
        })
        .catch((err) => {
            console.error(err.message);
            throw err;
        });
}

module.exports = function (context) {
    return editXcodeProj();
};