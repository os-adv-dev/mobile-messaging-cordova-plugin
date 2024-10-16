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

            // Remove problematic lines (just declarations) using regex
            projectFileContent = projectFileContent
                .replace(/^\s*var\s+plist_file_entry.*\n/gm, '')  // Remove var plist_file_entry declaration
                .replace(/^\s*var\s+plist_file.*\n/gm, '')        // Remove var plist_file declaration
                .replace(/^\s*var\s+config_file.*\n/gm, '');      // Remove var config_file declaration

            // Get the project name
            const projectName = getProjectName();
            if (!projectName) {
                throw new Error('Could not retrieve project name');
            }

            // Define the new code snippet to handle plist_file and config_file with fallback logic
            const cleanupSnippet = `
                // Ensure plist_file and config_file point to the correct folder
                const projectName = '${projectName}';
                const plist_file_entry = Object.values(xcBuildConfiguration).find(entry => {
                    if (entry.buildSettings && entry.buildSettings.INFOPLIST_FILE && entry.buildSettings.PRODUCT_NAME) {
                        console.log('Checking entry:', entry.buildSettings.PRODUCT_NAME);
                        return entry.buildSettings.PRODUCT_NAME.includes(projectName);
                    }
                    return false;
                });

                // If no entry is found, log details for debugging
                if (!plist_file_entry) {
                    console.error('CordovaError: Could not find *-Info.plist file for main target.');
                    console.error('Available xcBuildConfiguration entries:', Object.values(xcBuildConfiguration).map(entry => entry.buildSettings));

                    // Fallback logic: Attempt to locate an entry based on alternate conditions
                    const fallback_entry = Object.values(xcBuildConfiguration).find(entry => {
                        if (entry.buildSettings && entry.buildSettings.INFOPLIST_FILE) {
                            console.warn('Falling back to INFOPLIST_FILE:', entry.buildSettings.INFOPLIST_FILE);
                            return true;  // Fallback to any entry with INFOPLIST_FILE if PRODUCT_NAME is missing
                        }
                        return false;
                    });

                    if (fallback_entry) {
                        console.warn('Using fallback entry:', fallback_entry.buildSettings.INFOPLIST_FILE);
                        var plist_file = path.join(project_dir, fallback_entry.buildSettings.INFOPLIST_FILE.replace(/^"(.*)"$/g, '$1').replace(/\\&/g, '&'));
                    } else {
                        throw new CordovaError('Could not find any valid *-Info.plist file in the build settings.');
                    }
                } else {
                    var plist_file = path.join(project_dir, plist_file_entry.buildSettings.INFOPLIST_FILE.replace(/^"(.*)"$/g, '$1').replace(/\\&/g, '&'));
                    console.log('Found plist_file:', plist_file);
                }

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

            // Find the location before the `if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {`
            const insertPoint = 'if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {';

            // Ensure that the code is not already injected
            if (!projectFileContent.includes('📝 plist_file')) {
                // Insert the cleanup snippet before the if condition
                projectFileContent = projectFileContent.replace(insertPoint, `${cleanupSnippet}\n${insertPoint}`);
            } else {
                console.log('⚠️ projectFile.js already modified, skipping modification.');
            }

            // Log the content to be saved before saving it
            console.log('🔍 Modified content to be saved:\n', projectFileContent);

            // Write the modified content back to the projectFile.js
            fs.writeFileSync(projectFilePath, projectFileContent, 'utf8');

            console.log('✅ projectFile.js updated successfully with cleanup code!');

            // Read the projectFile.js again to verify if the changes are there
            const savedContent = fs.readFileSync(projectFilePath, 'utf8');
            console.log('🔍 Rechecking content after saving:\n', savedContent);

            resolve();
        } catch (error) {
            console.error(`🚨 Error modifying projectFile.js: ${error.message}`);
            reject(error);
        }
    });
};