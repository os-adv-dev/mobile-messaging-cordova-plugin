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

            // Remove problematic lines using string.replace()
            projectFileContent = projectFileContent
                .replace(/^\s*(?:var|let|const)\s+plist_file_entry\s*=.*;\s*\n/gm, '')  // Removes line where plist_file_entry is declared
                .replace(/^\s*(?:var|let|const)\s+plist_file\s*=.*;\s*\n/gm, '')        // Removes line where plist_file is declared
                .replace(/^\s*(?:var|let|const)\s+config_file\s*=.*;\s*\n/gm, '');      // Removes line where config_file is declared

            // Get the project name
            const projectName = getProjectName();
            if (!projectName) {
                throw new Error('Could not retrieve project name');
            }

            // Define the new code snippet to handle plist_file and config_file with hardcoded paths
            const cleanupSnippet = `
                // Ensure plist_file and config_file point to the correct hardcoded folder
                const projectName = '${projectName}';
                const plist_file = path.join(project_dir, projectName + '/' + projectName + '-Info.plist');
                const config_file = path.join(project_dir, projectName + '/config.xml');

                // Log the paths for validation
                console.log('Hardcoded plist_file path:', plist_file);
                console.log('Hardcoded config_file path:', config_file);

                // Check if the plist_file and config_file exist
                if (!fs.existsSync(plist_file)) {
                    console.error(\`🚨 plist_file not found at \${plist_file}\`);
                    throw new CordovaError(\`plist_file not found at \${plist_file}\`);
                } else {
                    console.log('😍 plist_file is pointing to the correct path:', plist_file);
                }

                if (!fs.existsSync(config_file)) {
                    console.error(\`🚨 config_file not found at \${config_file}\`);
                    throw new CordovaError(\`config_file not found at \${config_file}\`);
                } else {
                    console.log('😍 config_file is pointing to the correct path:', config_file);
                }
            `;

            // Find the location before the `if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {`
            const insertPoint = 'if (!fs.existsSync(plist_file) || !fs.existsSync(config_file)) {';

            // Ensure that the code is not already injected
            if (!projectFileContent.includes('config_file is pointing to the correct path')) {
                // Insert the cleanup snippet before the if condition
                projectFileContent = projectFileContent.replace(insertPoint, `${cleanupSnippet}\n${insertPoint}`);
            } else {
                console.log('⚠️ projectFile.js already modified, skipping modification.');
            }

            // Log the content to be saved before saving it
            //console.log('🔍 Modified content to be saved:\n', projectFileContent);

            // Write the modified content back to the projectFile.js
            fs.writeFileSync(projectFilePath, projectFileContent, 'utf8');

            console.log('✅ projectFile.js updated successfully with cleanup code!');

            // Read the projectFile.js again to verify if the changes are there
            //const savedContent = fs.readFileSync(projectFilePath, 'utf8');
            //console.log('🔍 Rechecking content after saving:\n', savedContent);

            resolve();
        } catch (error) {
            console.error(`🚨 Error modifying projectFile.js: ${error.message}`);
            reject(error);
        }
    });
};