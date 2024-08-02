const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const plist = require('plist');

module.exports = function(context) {
    return new Promise((resolve, reject) => {
        const projectRoot = context.opts.projectRoot;
        const provisioningProfilesPath = path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging', 'provisioning-profiles');
        
        // Identify the provisioning profile file
        const provisioningProfile = fs.readdirSync(provisioningProfilesPath).find(file => file.endsWith('.mobileprovision'));
        
        if (!provisioningProfile) {
            return reject(new Error('No provisioning profile found in the provisioning-profiles directory.'));
        }

        const provisioningProfilePath = path.join(provisioningProfilesPath, provisioningProfile);

        // Extract information from the provisioning profile
        exec(`security cms -D -i "${provisioningProfilePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`🚨 Error extracting provisioning profile information: ${error.message}`);
                return reject(new Error(`Error extracting provisioning profile information: ${error.message}`));
            }

            const profilePlist = plist.parse(stdout);
            const provisioningProfileUUID = profilePlist.UUID;
            const provisioningProfileName = profilePlist.Name;

            // Path to the Ruby script
            const rubyScriptPath = path.join(projectRoot, 'scripts', 'update_provisioning_profile.rb');

            // Update the Ruby script with the extracted information
            const rubyScriptContent = `
require 'xcodeproj'

# Path to your Xcode project (.xcodeproj)
project_path = 'path/to/YourProject.xcodeproj'

# Name of the target you want to update
target_name = 'YourTargetName'

# The UUID of the provisioning profile to assign
provisioning_profile_uuid = '${provisioningProfileUUID}'

# The name of the provisioning profile (from the plist content)
provisioning_profile_name = '${provisioningProfileName}'

# Open the Xcode project
project = Xcodeproj::Project.open(project_path)

# Find the target by name
target = project.targets.find { |t| t.name == target_name }

if target.nil?
  puts "Target '#{target_name}' not found in project."
  exit 1
end

# Update the build settings for each build configuration
target.build_configurations.each do |config|
  config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = provisioning_profile_name
  config.build_settings['PROVISIONING_PROFILE'] = provisioning_profile_uuid
  config.build_settings['CODE_SIGN_IDENTITY'] = 'iPhone Developer'
end

# Save the project file
project.save

puts "Successfully updated provisioning profile for target '#{target_name}'."
`;

            // Write the updated Ruby script
            fs.writeFileSync(rubyScriptPath, rubyScriptContent, 'utf8');

            console.log('✅ Ruby script updated successfully!');

            // Define environment variables if needed
            const env = Object.create(process.env);
            env.GEM_HOME = path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging', 'gems');

            // Path to the xcodeproj binary
            const xcodeprojBinPath = path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging', 'gems', 'bin', 'xcodeproj');

            // Run the Ruby script using the existing xcodeproj binary
            exec(`ruby ${rubyScriptPath}`, { env: env }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`🚨 Error running Ruby script: ${error.message}`);
                    return reject(new Error(`Error running Ruby script: ${error.message}`));
                }

                console.log('✅ Ruby script completed successfully!');
                console.log(stdout);
                if (stderr) {
                    console.error(stderr);
                }

                resolve();
            });
        });
    });
};