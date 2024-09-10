const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
const parseString = require('xml2js').parseString;

// Function to dynamically get the project name from config.xml
function getProjectName() {
    return new Promise((resolve, reject) => {
        console.log('Reading project name from config.xml...');
        fs.readFile('config.xml', (err, data) => {
            if (err) {
                console.error('Error reading config.xml:', err.message);
                return reject(err);
            }

            parseString(data.toString(), (err, result) => {
                if (err) {
                    console.error('Error parsing config.xml:', err.message);
                    return reject(err);
                }

                const name = result.widget.name.toString().trim();
                console.log('Project name:', name);
                resolve(name || null);
            });
        });
    });
}

module.exports = function(context) {
    return getProjectName().then(projectName => {
        if (!projectName) {
            throw new Error('Project name not found.');
        }

        const projectRoot = context.opts.projectRoot;
        const projectPath = path.join(projectRoot, 'platforms', 'ios', `${projectName}.xcodeproj`, 'project.pbxproj');
        const project = xcode.project(projectPath);

        project.parseSync();

        const mainTarget = projectName; // The main target name is usually the same as the project name
        const extensionTarget = 'MobileMessagingNotificationExtension'; // Replace with your extension target name

        const frameworkPath = 'libs/ios/MobileMessaging.framework';

        // Add framework to main target
        project.addFramework(frameworkPath, { customFramework: true, embed: true, target: mainTarget });

        // Add framework to extension target
        project.addFramework(frameworkPath, { customFramework: true, embed: true, target: extensionTarget });

        // Save changes
        fs.writeFileSync(projectPath, project.writeSync());
        console.log('Framework added to both main and extension targets.');
    }).catch(err => {
        console.error('Error occurred:', err.message);
    });
};