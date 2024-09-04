const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        const projectRoot = context.opts.projectRoot;

        // Path to the Ruby script and Podfile
        const rubyScriptPath = path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging', 'scripts', 'ios', 'modify_podfile.rb');
        const iosPlatformPath = path.join(projectRoot, 'platforms', 'ios');
        const podfilePath = path.join(iosPlatformPath, 'Podfile');

        console.log('👉 Running Ruby script to modify Podfile...');

        // Ensure Ruby script has execution permissions
        exec(`chmod +x ${rubyScriptPath}`, (chmodError) => {
            if (chmodError) {
                console.error(`🚨 Failed to set execute permissions for Ruby script: ${chmodError}`);
                return reject(new Error(`Error setting execute permissions for Ruby script: ${chmodError}`));
            }

            // Run the Ruby script
            exec(`ruby ${rubyScriptPath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`🚨 Error running Ruby script: ${error.message}`);
                    return reject(new Error(`Error running Ruby script: ${error.message}`));
                }

                console.log('✅ Ruby script ran successfully!');
                console.log(stdout);
                if (stderr) {
                    console.error(stderr);
                }

                // Read and log the updated Podfile content
                fs.readFile(podfilePath, 'utf8', (err, podfileContent) => {
                    if (err) {
                        console.error(`🚨 Error reading Podfile: ${err.message}`);
                        return reject(new Error(`Error reading Podfile: ${err.message}`));
                    }

                    console.log('👉 Updated Podfile content:');
                    console.log(podfileContent);

                    // Now run 'pod install'
                    console.log('👉 Running pod install to update dependencies...');
                    exec('pod install', { cwd: iosPlatformPath }, (podError, podStdout, podStderr) => {
                        if (podError) {
                            console.error(`🚨 Error running pod install: ${podError.message}`);
                            return reject(new Error(`Error running pod install: ${podError.message}`));
                        }

                        // Log stdout and stderr of pod install
                        console.log('✅ pod install completed successfully!');
                        console.log(podStdout);  // Standard output
                        if (podStderr) {
                            console.error(podStderr);  // Standard error
                        }

                        resolve();
                    });
                });
            });
        });
    });
};