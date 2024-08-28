const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

module.exports = function(context) {
    console.log('✅ -- Hook: after_plugin_install');
    console.log('📂 -- Starting cordova prepare android --verbose...');

    const prepareCommand = 'cordova prepare android --verbose';
    const buildCommand = 'cordova build android --hms --verbose';

    // Step 1: Execute cordova prepare
    exec(prepareCommand, (err, stdout, stderr) => {
        if (err) {
            console.error(`❌ -- Error during 'cordova prepare android': ${err}`);
            console.error(stderr);
            return;
        }

        console.log(`📦 -- Cordova Prepare Output:\n${stdout}`);
        console.log('✅ -- Cordova prepare android completed successfully.');

        // Step 2: Execute cordova build after prepare completes
        console.log('📂 -- Starting cordova build android --hms --verbose...');
        exec(buildCommand, (err, stdout, stderr) => {
            if (err) {
                console.error(`❌ -- Error during 'cordova build android --hms': ${err}`);
                console.error(stderr);
                return;
            }

            console.log(`📦 -- Cordova Build Output:\n${stdout}`);
            console.log('✅ -- Cordova build android --hms completed successfully.');

            // Step 3: Display the path to the generated APK(s)
            const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
            const buildOutputPath = path.join(platformRoot, 'app/build/outputs/apk');
            console.log(`📦 -- buildOutputPath Output:\n${buildOutputPath}`);

            if (fs.existsSync(buildOutputPath)) {
                console.log(`📂 -- The APK(s) are located at: ${buildOutputPath}`);

                // Assuming successful completion, execute the module function
               /** var afterBuildModulePath = path.join(__dirname, 'UploadBinary.js');
                if (fs.existsSync(afterBuildModulePath)) {
                    var afterBuildFunction = require(afterBuildModulePath);
                    afterBuildFunction(context);
                } else {
                    console.error('❌ --- UploadBinary.js script not found.');
                } */

            } else {
                console.warn('⚠️ -- Could not locate the APK build output directory.');
            }
        });
    });
};