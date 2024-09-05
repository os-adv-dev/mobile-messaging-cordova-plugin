const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        // Define the path to the prepare.js file
        const projectRoot = context.opts.projectRoot;
        const prepareJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'prepare.js');

        // Log the prepare.js path for debugging
        console.log(`Looking for prepare.js at: ${prepareJsPath}`);

        // Check if the prepare.js file exists
        if (!fs.existsSync(prepareJsPath)) {
            console.error(`🚨 prepare.js not found at ${prepareJsPath}`);
            return reject(new Error(`prepare.js not found at ${prepareJsPath}`));
        }

        try {
            // Read the current contents of prepare.js
            let prepareJsContent = fs.readFileSync(prepareJsPath, 'utf8');

            // Log the length of prepare.js for verification
            console.log(`prepare.js file size: ${prepareJsContent.length} characters`);

            // Corrected snippet with proper escaping and logging
            const podfileModificationSnippet = `
                // Modify Podfile to add second target
                const podfilePath = path.join('${projectRoot}', 'platforms', 'ios', 'Podfile');
                console.log('Checking if Podfile exists at:', podfilePath);

                if (fs.existsSync(podfilePath)) {
                    let podfileContent = fs.readFileSync(podfilePath, 'utf8');
                    console.log('Podfile content loaded successfully.');

                    const newTargetBlock = "\\ttarget 'MobileMessagingNotificationExtension' do\\n\\t\\tinherit! :search_paths\\n\\tend\\nend";
                    console.log('New target block:', newTargetBlock);

                    podfileContent = podfileContent.replace(/end\\s*$/, newTargetBlock);
                    fs.writeFileSync(podfilePath, podfileContent, 'utf8');
                    console.log('✅ Podfile updated successfully!');
                } else {
                    console.log('⚠️ Podfile not found, skipping modification');
                }
            `;

            // Check if the snippet is already present in prepare.js
            if (!prepareJsContent.includes('Modify Podfile to add second target')) {
                // Find the location in the prepare.js where we want to insert the modification
                const insertPoint = "module.exports.prepare = function (cordovaProject, options) {";

                // Insert the podfile modification snippet after the module.exports.prepare declaration
                prepareJsContent = prepareJsContent.replace(insertPoint, `${insertPoint}\n${podfileModificationSnippet}`);

                // Write the modified prepare.js back to the file
                fs.writeFileSync(prepareJsPath, prepareJsContent, 'utf8');

                console.log('✅ prepare.js updated successfully!');
            } else {
                console.log('⚠️ prepare.js already modified, skipping modification');
            }

            resolve();
        } catch (error) {
            console.error(`🚨 Error modifying prepare.js: ${error.message}`);
            reject(new Error(`Error modifying prepare.js: ${error.message}`));
        }
    });
};