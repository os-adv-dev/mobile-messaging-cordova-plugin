const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const buildJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'build.js');
    const jsonFilePath = path.join(projectRoot, 'provisioning_info.json');

    console.log(`📄 Project Root: ${projectRoot}`);
    console.log(`📄 Path to build.js: ${buildJsPath}`);
    console.log(`📄 Path to provisioning_info.json: ${jsonFilePath}`);

    // Reading provisioning information from JSON file
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

    // Read build.js content
    fs.readFile(buildJsPath, 'utf8', (err, buildJsContent) => {
        if (err) {
            console.error(`🚨 Error reading build.js: ${err.message}`);
            return;
        }

        console.log('📄 Successfully read build.js content.');

        // Regex to find where exportOptions are created in build.js
        const exportOptionsRegex = /const exportOptions = \{(.|\n)*?method: 'development',/;

        if (!exportOptionsRegex.test(buildJsContent)) {
            console.error('🚨 Could not find exportOptions block in build.js.');
            console.log('🔍 Here is a snippet from build.js for inspection:\n', buildJsContent.slice(0, 1000)); // Print the first 1000 chars for inspection
            return;
        }

        console.log('✅ Found exportOptions block in build.js.');

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