const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

module.exports = function(context) {
    console.log('✅ -- Hook: after_plugin_install -- Repository to Huawei ONLY');
    console.log('📂 -- Starting cordova build android --hms --verbose...');

    const buildCommand = 'cordova build android --hms --verbose';

    // Execute cordova build
    exec(buildCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(`❌ -- Error during 'cordova build android --hms': ${err}`);
            console.error(stderr);
            return;
        }

        console.log(`📦 -- Cordova Build Output:\n${stdout}`);
        console.log('✅ -- Cordova build android --hms completed successfully.');

        // Display the path to the generated APK(s)
        const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
        const buildOutputPath = path.join(platformRoot, 'app/build/outputs/apk');

        console.log(`📂 -- The platformRoot: ${platformRoot}`);
        console.log(`📂 -- The buildOutputPath: ${buildOutputPath}`);

        if (fs.existsSync(buildOutputPath)) {
            console.log(`📂 -- The APK(s) are located at: ${buildOutputPath}`);

            // Assuming successful completion, execute the module function
            var afterBuildModulePath = path.join(__dirname, 'UploadBinary.js');
            if (fs.existsSync(afterBuildModulePath)) {
                var afterBuildFunction = require(afterBuildModulePath);
                afterBuildFunction(context);
            } else {
                console.error('❌ --- UploadBinary.js script not found.');
            }

        } else {
            console.warn('⚠️ -- Could not locate the APK build output directory.');
        }
    });
};