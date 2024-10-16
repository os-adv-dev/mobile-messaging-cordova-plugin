const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        try {
            // Function to get the project name from config.xml
            function getProjectName() {
                const configFile = path.join(context.opts.projectRoot, 'config.xml');
                if (!fs.existsSync(configFile)) {
                    throw new Error('config.xml not found');
                }

                const config = fs.readFileSync(configFile).toString();
                let projectName;
                xml2js.parseString(config, (err, result) => {
                    if (err) {
                        throw new Error('Error parsing config.xml');
                    }
                    projectName = result.widget.name.toString().trim();
                });
                return projectName || null;
            }

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

            // Get the project name
            const projectName = getProjectName();
            if (!projectName) {
                throw new Error('Could not retrieve project name');
            }

            // Define the new code snippet to ensure plist_file and config_file point to the correct folder
            const cleanupSnippet = `
                // Ensure plist_file and config_file point to the main target folder (which should match the project name)
                const projectName = '${projectName}';
                const plist_file_entry = Object.values(xcBuildConfiguration).find(entry => 
                    entry.buildSettings && 
                    entry.buildSettings.INFOPLIST_FILE && 
                    entry.buildSettings.PRODUCT_NAME && entry.buildSettings.PRODUCT_NAME.includes(projectName)
                );
                // If no entry is found, fallback to the existing logic
                if (!plist_file_entry) {
                    throw new CordovaError('Could not find *-Info.plist file for main target.');
                }
                var plist_file = path.join(project_dir, plist_file_entry.buildSettings.INFOPLIST_FILE.replace(/^"(.*)"$/g, '$1').replace(/\\&/g, '&'));
                var config_file = path.join(path.dirname(plist_file), 'config.xml');

                const plistFileDir = path.basename(path.dirname(plist_file));
                if (plistFileDir !== projectName) {
                    console.log('🚨 plist_file is pointing to the wrong folder:', plistFileDir);
                } else { 
                    console.log('😍 plist_file is pointing to the correct folder:', plistFileDir);
                }
                const configFileDir = path.basename(path.dirname(config_file));
                if (configFileDir !== projectName) {
                    console.log('🚨 config_file is pointing to the wrong folder:', configFileDir);
                } else {
                    console.log('😍 config_file is pointing to the correct folder:', configFileDir);
                }
            `;

            // Use Regular Expressions to remove the original variable declarations
            projectFileContent = projectFileContent.replace(/^\s*const\s+plist_file_entry\s*=.*$/m, "");
            projectFileContent = projectFileContent.replace(/^\s*var\s+plist_file\s*=.*$/m, "");
            projectFileContent = projectFileContent.replace(/^\s*var\s+config_file\s*=.*$/m, "");

            // Find the location before the `if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {`
            const insertPoint = 'if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {';

            // Ensure that the code is not already injected
            if (!projectFileContent.includes('📝 plist_file')) {
                // Insert the cleanup snippet before the if condition                
                projectFileContent = projectFileContent.replace(insertPoint, `${cleanupSnippet}\n${insertPoint}`);

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