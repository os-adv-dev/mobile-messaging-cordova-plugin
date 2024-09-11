const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        try {
            // Define the path to the projectFile.js
            const projectRoot = context.opts.projectRoot;
            const projectFilePath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'projectFile.js');

            // Check if the projectFile.js file exists
            if (!fs.existsSync(projectFilePath)) {
                console.error(`🚨 projectFile.js not found at ${projectFilePath}`);
                return reject(new Error(`projectFile.js not found at ${projectFilePath}`));
            }

            // Read the current contents of projectFile.js
            let projectFileContent = fs.readFileSync(projectFilePath, 'utf8');

            // Define the new code snippet to remove $(PROJECT_DIR) from plist_file and config_file
            const cleanupSnippet = `
                // Remove $(PROJECT_DIR) from plist_file if present
                if (plist_file.includes('$(PROJECT_DIR)/')) {
                    plist_file = plist_file.replace('$(PROJECT_DIR)/', '');
                }
                
                // Remove $(PROJECT_DIR)/ from config_file if present
                if (config_file.includes('$(PROJECT_DIR)/')) {
                    config_file = config_file.replace('$(PROJECT_DIR)/', '');
                }
            `;

            // Define the console.log statements for plist_file and config_file
            const consoleLogSnippet = `
                console.log('📝 plist_file:', plist_file);
                console.log('📝 config_file:', config_file);
            `;

            // Find the location before the `if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {`
            const insertPoint = 'if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {';

            if (!projectFileContent.includes('📝 plist_file')) {
                projectFileContent = projectFileContent.replace('const plist_file = ','var plist_file = ');
                projectFileContent = projectFileContent.replace('const config_file = ','var config_file = ');

                // Insert the cleanup and console log snippets before the if condition
                projectFileContent = projectFileContent.replace(insertPoint, `${cleanupSnippet}\n${consoleLogSnippet}\n${insertPoint}`);

                // Write the modified content back to the projectFile.js
                fs.writeFileSync(projectFilePath, projectFileContent, 'utf8');

                console.log('✅ projectFile.js updated successfully with cleanup code!');
            } else {
                console.log('⚠️ projectFile.js already modified, skipping modification.');
            }

            resolve();
        } catch (error) {
            console.error(`🚨 Error modifying projectFile.js: ${error.message}`);
            reject(error);
        }
    });
};