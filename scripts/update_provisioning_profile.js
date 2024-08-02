const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const parseString = require('xml2js').parseString;

function getProjectName() {
    const config = fs.readFileSync('config.xml').toString();
    let name;
    parseString(config, function (err, result) {
        if (err) {
            throw new Error(`Error parsing config.xml: ${err.message}`);
        }
        name = result.widget.name[0].trim();
    });
    return name || null;
}

function waitForFile(filePath, interval = 1000) {
    return new Promise((resolve) => {
        const intervalId = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(intervalId);
                resolve();
            }
        }, interval);
    });
}

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const completionFilePath = path.join(projectRoot, 'target_addition_complete');
    
    return waitForFile(completionFilePath).then(() => {
        const projectName = getProjectName();

        const args = process.argv;
        let provisioningProfileUUID;
        let provisioningProfileName;
        for (const arg of args) {  
            if (arg.includes('IOS_EXTENSION_APP_CODE')) {
                const stringArray = arg.split("=");
                provisioningProfileUUID = stringArray.slice(-1).pop();
            }
            if (arg.includes('IOS_PP_NAME')) {
                const stringArray = arg.split("=");
                provisioningProfileName = stringArray.slice(-1).pop();
            }
        }

        if (!(provisioningProfileUUID && provisioningProfileName)) {
            throw new Error('Provisioning profile UUID or name not provided in command line arguments.');
        }

        // Path to the Ruby script
        const rubyScriptPath = path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging', 'scripts', 'update_provisioning_profile.rb');

        // Update the Ruby script with the extracted information
        const rubyScriptContent = `
require 'xcodeproj'

begin
  # Path to your Xcode project (.xcodeproj)
  project_path = 'platforms/ios/${projectName}.xcodeproj'

  # Name of the target you want to update
  target_name = 'MobileMessagingNotificationExtension'

  # The UUID of the provisioning profile to assign
  provisioning_profile_uuid = '${provisioningProfileUUID}'

  # The name of the provisioning profile (from the plist content)
  provisioning_profile_name = '${provisioningProfileName}'

  puts "Opening project: #{project_path}"
  project = Xcodeproj::Project.open(project_path)
  puts "Project opened successfully"

  puts "Available targets:"
  project.targets.each do |target|
    puts "- #{target.name}"
  end

  puts "Finding target: #{target_name}"
  target = project.targets.find { |t| t.name == target_name }

  if target.nil?
    puts "Target '#{target_name}' not found in project."
    exit 1
  end

  puts "Updating build settings for each build configuration"
  target.build_configurations.each do |config|
    puts "Updating build settings for configuration: #{config.name}"
    config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = provisioning_profile_name
    config.build_settings['PROVISIONING_PROFILE'] = provisioning_profile_uuid
    config.build_settings['CODE_SIGN_IDENTITY'] = 'iPhone Developer'
  end

  puts "Saving project"
  project.save
  puts "Project saved successfully"

  puts "Successfully updated provisioning profile for target '#{target_name}'."
rescue => e
  puts "An error occurred: #{e.message}"
  puts e.backtrace.join("\n")
  exit 1
end
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
        return new Promise((resolve, reject) => {
            exec(`ruby ${rubyScriptPath}`, { env: env }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`🚨 Error running Ruby script: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    console.error(`stdout: ${stdout}`);
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