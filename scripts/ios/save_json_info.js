const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'provisioning_info.json');

    const args = process.argv;
    let provisioningProfileUUID;
    let provisioningProfileName;
    let teamID;

    for (const arg of args) {  
        if (arg.includes('IOS_EXTENSION_APP_CODE')) {
            const stringArray = arg.split("=");
            provisioningProfileUUID = stringArray.slice(-1).pop();
        }
        if (arg.includes('IOS_PP_NAME')) {
            const stringArray = arg.split("=");
            provisioningProfileName = stringArray.slice(-1).pop();
        }
        if (arg.includes('IOS_TEAM_ID')) {
            const stringArray = arg.split("=");
            teamID = stringArray.slice(-1).pop();
        }
    }

    if (!(provisioningProfileUUID && provisioningProfileName && teamID)) {
        throw new Error('Provisioning profile UUID, name, or team ID not provided in command line arguments.');
    }

    const provisioningInfo = {
        provisioningProfileUUID: provisioningProfileUUID,
        provisioningProfileName: provisioningProfileName,
        teamID: teamID
    };

    // Save the JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify(provisioningInfo, null, 2), 'utf8');
    console.log(`✅ Provisioning information saved to ${jsonFilePath}`);
};