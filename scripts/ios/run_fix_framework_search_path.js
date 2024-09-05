const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        const projectRoot = context.opts.projectRoot;
        
        // Path to the Ruby script
        const rubyScriptPath = path.resolve(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging', 'scripts', 'ios', 'add_framework_search_path.rb');
        
        console.log('👉 Running Ruby script to modify Podfile...');

        // Check if the Ruby script exists
        if (!fs.existsSync(rubyScriptPath)) {
            console.error(`🚨 Ruby script not found at ${rubyScriptPath}`);
            return reject(new Error(`Ruby script not found at ${rubyScriptPath}`));
        }

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

                console.log('✅ 🎉 🚀 Ruby script ran successfully!');
                console.log(stdout);
                if (stderr) {
                    console.error(stderr);
                }

                resolve();
            });
        });
    });
};