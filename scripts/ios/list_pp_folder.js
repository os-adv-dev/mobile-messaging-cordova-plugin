const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = function (context) {
    return new Promise((resolve, reject) => {
        try {
            // Get the user's home directory and path to Provisioning Profiles
            const provisioningProfilesDir = path.join(os.homedir(), 'Library', 'MobileDevice', 'Provisioning Profiles');
            
            console.log('📂 Checking Provisioning Profiles folder...');

            // Check if the directory exists
            if (!fs.existsSync(provisioningProfilesDir)) {
                console.log('❌ The Provisioning Profiles directory does not exist!');
                return resolve(); // Not rejecting to avoid breaking the hook
            }

            // Read the contents of the directory
            const files = fs.readdirSync(provisioningProfilesDir);
            
            if (files.length === 0) {
                console.log('📁 The Provisioning Profiles directory is empty.');
            } else {
                console.log('📄 Listing files in Provisioning Profiles directory:');
                files.forEach(file => {
                    console.log(`✅ ${file}`);
                });
            }

            resolve();
        } catch (error) {
            console.error(`🚨 An error occurred while listing the files: ${error.message}`);
            reject(error);
        }
    });
};