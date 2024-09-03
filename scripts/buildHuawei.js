const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject({ err, stderr });
            } else {
                resolve(stdout);
            }
        });
    });
}

function runAfterBuildScript(context) {
    return new Promise((resolve, reject) => {
        const afterBuildModulePath = path.join(__dirname, 'UploadBinary.js');
        if (fs.existsSync(afterBuildModulePath)) {
            try {
                const afterBuildFunction = require(afterBuildModulePath);
                afterBuildFunction(context);
                resolve();
            } catch (err) {
                reject(`❌ -- Error running UploadBinary.js: ${err}`);
            }
        } else {
            reject('❌ -- UploadBinary.js script not found.');
        }
    });
}

module.exports = function(context) {
    console.log('✅ -- Hook: after_plugin_install -- HUAWEI');
    console.log('📂 -- Starting cordova prepare android HUAWEI --verbose...');

    const prepareCommand = 'cordova prepare android HUAWEI --verbose';
    const buildCommand = 'cordova build android --hms --verbose';

    // Step 1: Execute cordova prepare
    runCommand(prepareCommand)
        .then((prepareOutput) => {
            console.log(`📦 -- Cordova Prepare Output HUAWEI :\n${prepareOutput}`);
            console.log('✅ -- Cordova prepare android HUAWEI completed successfully.');

            // Step 2: Execute cordova build after prepare completes
            console.log('📂 -- Starting cordova build android HUAWEI --hms --verbose...');
            return runCommand(buildCommand);
        })
        .then((buildOutput) => {
            console.log(`📦 -- Cordova Build Output HUAWEI :\n${buildOutput}`);
            console.log('✅ -- Cordova build android --hms HUAWEI completed successfully.');

            // Step 3: Display the path to the generated APK(s)
            const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
            const buildOutputPath = path.join(platformRoot, 'app/build/outputs/apk');
            console.log(`📦 -- buildOutputPath Output:\n${buildOutputPath}`);

            if (fs.existsSync(buildOutputPath)) {
                console.log(`📂 -- The APK(s) HUAWEI are located at: ${buildOutputPath}`);

                // Step 4: Run after build script
                return runAfterBuildScript(context);
            } else {
                console.warn('⚠️ -- Could not locate the APK build output directory.');
                return Promise.reject('❌ -- APK build output directory not found.');
            }
        })
        .then(() => {
            console.log('✅ -- UploadBinary.js HUAWEI script executed successfully.');
        })
        .catch((error) => {
            if (error.err) {
                console.error(`❌ -- Error: ${error.err}`);
                console.error(error.stderr);
            } else {
                console.error(`❌ -- ${error}`);
            }
        });
};