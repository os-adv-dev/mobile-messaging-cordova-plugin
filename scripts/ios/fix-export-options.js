const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const buildJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'build.js');
    const jsonFilePath = path.join(projectRoot, 'provisioning_info.json');

    console.log(`📄 Project Root: ${projectRoot}`);
    console.log(`📄 Path to build.js: ${buildJsPath}`);
    console.log(`📄 Path to provisioning_info.json: ${jsonFilePath}`);

    // Read provisioning information from the JSON file
    let provisioningInfo;
    try {
        provisioningInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        console.log(`✅ Successfully read provisioning_info.json.`);
    } catch (error) {
        console.error(`🚨 Error reading provisioning_info.json: ${error.message}`);
        return;
    }

    const { firstTargetId, firstTargetPP, secondTargetId, secondTargetPP } = provisioningInfo;
    console.log(`👉 firstTargetId: ${firstTargetId}, firstTargetPP: ${firstTargetPP}`);
    console.log(`👉 secondTargetId: ${secondTargetId}, secondTargetPP: ${secondTargetPP}`);

    // Check if essential info is available
    if (!(firstTargetId && firstTargetPP && secondTargetId && secondTargetPP)) {
        console.error('🚨 Required provisioning profile information not found in provisioning_info.json');
        return;
    }

    // Read the build.js file
    fs.readFile(buildJsPath, 'utf8', (err, buildJsContent) => {
        if (err) {
            console.error(`🚨 Error reading build.js: ${err.message}`);
            return;
        }

        console.log('📄 Successfully read build.js content.');

        // Define the new provisioningProfiles block
        const newProvisioningProfileBlock = `
            exportOptions.provisioningProfiles = {
                "${firstTargetId}": "${firstTargetPP}",
                "${secondTargetId}": "${secondTargetPP}"
            };
            exportOptions.signingStyle = 'manual';`;

        // String to remove (the entire block you mentioned)
        const oldProvisioningBlock = `
            if (buildOpts.provisioningProfile && bundleIdentifier) {
                if (typeof buildOpts.provisioningProfile === 'string') {
                    exportOptions.provisioningProfiles = { [bundleIdentifier]: String(buildOpts.provisioningProfile) };
                } else {
                    events.emit('log', 'Setting multiple provisioning profiles for signing');
                    exportOptions.provisioningProfiles = buildOpts.provisioningProfile;
                }
                exportOptions.signingStyle = 'manual';
            }`;

        // Replace the old provisioning profile block with the new one
        const modifiedBuildJsContent = buildJsContent.replace(oldProvisioningBlock, newProvisioningProfileBlock);

        // Write the updated build.js back to disk
        fs.writeFile(buildJsPath, modifiedBuildJsContent, 'utf8', (err) => {
            if (err) {
                console.error(`🚨 Error writing modified build.js: ${err.message}`);
                return;
            }

            console.log('✅ Successfully updated build.js with new provisioning profiles.');
        });
    });
};