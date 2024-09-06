const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'provisioning_info.json');

    const args = process.argv;
    let provisioningProfileUUID;
    let provisioningProfileName;
    let teamID;
    let firstTargetId;
    let firstTargetPP;
    let secondTargetId;
    let secondTargetPP;

    // Iterate over the command-line arguments
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
        if (arg.includes('FIRST_TARGET_ID')) {
            const stringArray = arg.split("=");
            firstTargetId = stringArray.slice(-1).pop();
        }
        if (arg.includes('FIRST_TARGET_PP')) {
            const stringArray = arg.split("=");
            firstTargetPP = stringArray.slice(-1).pop();
        }
        if (arg.includes('SECOND_TARGET_ID')) {
            const stringArray = arg.split("=");
            secondTargetId = stringArray.slice(-1).pop();
        }
        if (arg.includes('SECOND_TARGET_PP')) {
            const stringArray = arg.split("=");
            secondTargetPP = stringArray.slice(-1).pop();
        }
    }

    // Check if all required arguments are provided
    if (!(provisioningProfileUUID && provisioningProfileName && teamID && firstTargetId && firstTargetPP && secondTargetId && secondTargetPP)) {
        throw new Error('Some required provisioning profile arguments (UUID, name, team ID, target IDs or PPs) are missing from the command line arguments.');
    }

    // Construct the provisioning info object
    const provisioningInfo = {
        provisioningProfileUUID: provisioningProfileUUID,
        provisioningProfileName: provisioningProfileName,
        teamID: teamID,
        firstTargetId: firstTargetId,
        firstTargetPP: firstTargetPP,
        secondTargetId: secondTargetId,
        secondTargetPP: secondTargetPP
    };

    // Save the JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify(provisioningInfo, null, 2), 'utf8');
    console.log(`✅ Provisioning information saved to ${jsonFilePath}`);
};