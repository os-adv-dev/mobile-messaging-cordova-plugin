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

            const xcBuildConfiguration = `
                console.log("👉 locations: " + JSON.stringify(locations));
                console.log("👉 project_dir: " + project_dir);
                console.log("👉 pbxPath: " + pbxPath);
                console.log("👉 xcodeproj: " + xcodeproj);
                console.log("👉 xcBuildConfiguration: " + xcBuildConfiguration);
                console.log("👉 plist_file_entry: " + plist_file_entry);
                console.log("👉 plist_file: " + plist_file);
                console.log("👉 config_file: " + config_file);
                console.log("👉 : " + );
            `;

            // Define the new code snippet to ensure plist_file and config_file point to the correct folder
            const cleanupSnippet = `
                // Ensure plist_file and config_file point to the main target folder (which should match the project name)
                const projectName = '${projectName}';
                const plistFileDir = path.basename(path.dirname(plist_file));
                const expectedPlistFile = path.join('source', 'platforms', 'ios', projectName, \`\${projectName}-Info.plist\`);

                if (plistFileDir !== projectName) {
                    console.log('🚨 plist_file is pointing to the wrong folder:', plistFileDir);
                    plist_file = expectedPlistFile;
                    console.log('✅ plist_file corrected to:', plist_file);
                } else { 
                    console.log('😍 plist_file is pointing to the correct folder:', plistFileDir);
                }

                const configFileDir = path.basename(path.dirname(config_file));
                if (configFileDir !== projectName) {
                    console.log('🚨 config_file is pointing to the wrong folder:', configFileDir);
                    config_file = path.join(path.dirname(config_file).replace(configFileDir, projectName), path.basename(config_file));
                    console.log('✅ config_file corrected to:', config_file);
                } else {
                    console.log('😍 config_file is pointing to the correct folder:', configFileDir);
                }
            `;

            // Define the console.log statements for plist_file and config_file, including "ls" command to list directory contents
            const consoleLogSnippet = `
                console.log('📝 plist_file:', plist_file);
                console.log('📝 config_file:', config_file);

                // Extract the directory from the plist_file and config_file (both files should be in the same directory)
                const commonDir = path.dirname(plist_file);

                // Check if the directory exists, then list its contents
                if (fs.existsSync(commonDir)) {
                    const dirContents = fs.readdirSync(commonDir);
                    console.log('📂 Directory contents for commonDir', commonDir, ':', dirContents);
                } else {
                    const iosFolderPath = path.join('${projectRoot}', 'platforms', 'ios');
                    const dirContents = fs.readdirSync(iosFolderPath);
                    console.log('📂 Directory contents for iosFolderPath', iosFolderPath, ':', dirContents);
                    console.log('🚨 Directory not found:', commonDir);
                }
            `;

            // Find the location before the `if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {`
            const insertPoint = 'if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {';
            const insertPoint2 = 'var config_file = path.join(path.dirname(plist_file), \'config.xml\');';

            // Ensure that the code is not already injected
            if (!projectFileContent.includes('📝 plist_file')) {
                // Change const to var for plist_file and config_file to allow reassignments
                projectFileContent = projectFileContent.replace('const plist_file = ', 'var plist_file = ');
                projectFileContent = projectFileContent.replace('const config_file = ', 'var config_file = ');

                // Insert the cleanup and console log snippets before the if condition
                projectFileContent = projectFileContent.replace(insertPoint, `${cleanupSnippet}\n${consoleLogSnippet}\n${insertPoint}`);
                projectFileContent = projectFileContent.replace(insertPoint2, `${insertPoint2}\n${xcBuildConfiguration}`);

                // Write the modified content back to the projectFile.js
                fs.writeFileSync(projectFilePath, projectFileContent, 'utf8');

                console.log('✅ projectFile.js updated successfully with cleanup and directory listing code!');
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