const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        console.log("PATH: " + path);
        const projectRoot = context.opts.projectRoot;
        const prepareJsPath = path.join(projectRoot, 'node_modules', 'cordova-ios', 'lib', 'prepare.js');

        // Check if prepare.js exists
        if (!fs.existsSync(prepareJsPath)) {
            console.error(`🚨 prepare.js not found at ${prepareJsPath}`);
            return reject(new Error(`prepare.js not found at ${prepareJsPath}`));
        }

        try {
            // Read the existing prepare.js file
            let prepareJsContent = fs.readFileSync(prepareJsPath, 'utf8');

            // Add code to copy Podfile to Podfile-custom within the prepare function
            const podfileCopyCode = `
    console.log("PATH: ", path);
    console.log("cordovaProject.projectRoot: ", ${projectRoot});
    const podfilePath = path.join(${projectRoot}, 'platforms', 'ios', 'Podfile');
    console.log("podfilePath: " + podfilePath);
    const podfileCustomPath = path.join(${projectRoot}, 'platforms', 'ios', 'Podfile-custom');
    console.log("podfilePath: " + podfilePath);
    console.log("podfileCustomPath: " + podfileCustomPath);

    if (fs.existsSync(podfilePath)) {
        fs.copyFileSync(podfilePath, podfileCustomPath);
        console.log('✅ Copied Podfile to Podfile-custom');

        // Modify Podfile-custom by adding the target block
        let podfileCustomContent = fs.readFileSync(podfileCustomPath, 'utf8');
        const newTargetBlock = "\\ttarget 'MobileMessagingNotificationExtension' do\\n\\t\\tinherit! :search_paths\\n\\t\\t# pod 'MobileMessaging', '12.6.2'\\n\\tend\\nend";
        podfileCustomContent = podfileCustomContent.replace(/end\\s*$/, newTargetBlock);

        // Write the modified content back to Podfile-custom
        fs.writeFileSync(podfileCustomPath, podfileCustomContent, 'utf8');
        console.log('✅ Podfile-custom updated successfully with target block!');

        // Dynamically require the Podfile-custom after it has been created
        const Podfile = require('./Podfile-custom').Podfile;
    } else {
        console.log('⚠️ Podfile not found, skipping copy and modification');
    }`;

            // Insert the podfileCopyCode after the "module.exports.prepare" line
            prepareJsContent = prepareJsContent.replace(
                "module.exports.prepare = function (cordovaProject, options) {",
                `module.exports.prepare = function (cordovaProject, options) {\n${podfileCopyCode}`
            );

            // Replace the original require for 'Podfile'
            prepareJsContent = prepareJsContent.replace(
                "const Podfile = require('./Podfile').Podfile;",
                "// const Podfile = require('./Podfile-custom').Podfile;  // This has been moved to later in the function"
            );

            // Write the modified prepare.js back to the file
            fs.writeFileSync(prepareJsPath, prepareJsContent, 'utf8');

            console.log('✅ prepare.js updated successfully!');
            resolve();
        } catch (error) {
            console.error(`🚨 Error updating prepare.js: ${error.message}`);
            reject(new Error(`Error updating prepare.js: ${error.message}`));
        }
    });
};