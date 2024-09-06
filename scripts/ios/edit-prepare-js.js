const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        const projectRoot = context.opts.projectRoot;
        const prepareJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'prepare.js');

        console.log(`🔍 Checking for prepare.js at ${prepareJsPath}`);

        if (!fs.existsSync(prepareJsPath)) {
            console.error(`🚨 prepare.js not found at ${prepareJsPath}`);
            return reject(new Error(`prepare.js not found at ${prepareJsPath}`));
        }

        try {
            let prepareJsContent = fs.readFileSync(prepareJsPath, 'utf8');
            console.log('📄 prepare.js content read successfully.');

            // Define the modification snippet to manipulate the Podfile template in memory
            const podfileTemplateModificationSnippet = `
            // Modify Podfile template before saving to disk
            if (podfileContent) {
                console.log('🛠 Adding second target to Podfile template before saving...');
                const newTargetBlock = "\\ntarget 'MobileMessagingNotificationExtension' do\\n\\tinherit! :search_paths\\nend\\nend";
                podfileContent = podfileContent.replace(/end\\s*$/, newTargetBlock);
            }
            `;

            // Check if the prepare.js content already has the modification
            if (!prepareJsContent.includes('Modify Podfile template before saving')) {
                console.log('🛠 Modifying prepare.js to inject Podfile template modification before saving...');
                
                // Locate where the Podfile template is read in prepare.js
                const insertPoint = "const podfileContent = fs.readFileSync(podPath, 'utf8');";

                // Inject the podfile template modification logic after reading the template
                prepareJsContent = prepareJsContent.replace(insertPoint, `${insertPoint}\n${podfileTemplateModificationSnippet}`);

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