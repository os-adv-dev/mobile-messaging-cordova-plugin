const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    // Adjust the path to match the same one we used for prepare.js and Podfile.js
    const buildJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'build.js');
    const jsonFilePath = path.join(projectRoot, 'provisioning_info.json');

    // Reading provisioning information from JSON file
    const provisioningInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

    const { firstTargetId, firstTargetPP, secondTargetId, secondTargetPP } = provisioningInfo;

    // Check if essential info is available
    if (!(firstTargetId && firstTargetPP && secondTargetId && secondTargetPP)) {
        throw new Error('Required provisioning profile information not found in provisioning_info.json');
    }

    // Read build.js content
    fs.readFile(buildJsPath, 'utf8', (err, buildJsContent) => {
        if (err) {
            console.error(`🚨 Error reading build.js: ${err.message}`);
            return;
        }

        // Regex to find where exportOptions are created in build.js
        const exportOptionsRegex = /const exportOptions = \{(.|\n)*?method: 'development',/;

        if (!exportOptionsRegex.test(buildJsContent)) {
            console.error(`🚨 Could not find exportOptions block in build.js.`);
            return;
        }

        // Build the provisioning profiles dictionary to inject
        const provisioningProfileBlock = `
            provisioningProfiles: {
                "${firstTargetId}": "${firstTargetPP}",
                "${secondTargetId}": "${secondTargetPP}"
            },`;

        // Inject the provisioning profiles into the exportOptions object
        const modifiedBuildJsContent = buildJsContent.replace(
            exportOptionsRegex,
            match => match + provisioningProfileBlock
        );

        // Write the modified build.js content back
        fs.writeFile(buildJsPath, modifiedBuildJsContent, 'utf8', (err) => {
            if (err) {
                console.error(`🚨 Error writing modified build.js: ${err.message}`);
                return;
            }

            console.log(`✅ Successfully updated build.js with provisioning profiles.`);
        });
    });
};