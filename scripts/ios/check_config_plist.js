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

            // Define the console.log statements for plist_file and config_file
            const consoleLogSnippet = `
                console.log('📝 plist_file:', plist_file);
                console.log('📝 config_file:', config_file);
            `;

            // Find the location before the `if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {`
            const insertPoint = 'if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {';

            if (!projectFileContent.includes('📝 plist_file')) {
                // Insert the console log statements before the if condition
                projectFileContent = projectFileContent.replace(insertPoint, `${consoleLogSnippet}\n${insertPoint}`);

                // Write the modified content back to the projectFile.js
                fs.writeFileSync(projectFilePath, projectFileContent, 'utf8');

                console.log('✅ projectFile.js updated successfully!');
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