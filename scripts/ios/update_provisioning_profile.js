const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getProjectName() {
    const config = fs.readFileSync('config.xml', 'utf8');
    const match = config.match(/<name[^>]*>([\s\S]*?)<\/name>/);
    return match && match[1] ? match[1].trim() : null;
}

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'provisioning_info.json');

    let codeSignIdentity = 'iPhone Developer';
    if (context.cmdLine.toLowerCase().indexOf('release') >= 0) {
        codeSignIdentity = 'iPhone Distribution';
    }

    console.log(`Setting CODE_SIGN_IDENTITY to: ${codeSignIdentity}`);
    
    const projectName = getProjectName();
    console.log(`Setting CODE_SIGN_IDENTITY to: ${codeSignIdentity}`);
    console.log(`Project Name: ${projectName}`);
    if (!projectName) {
        throw new Error('Could not retrieve project name from config.xml');
    }

    if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`Provisioning info JSON file not found at ${jsonFilePath}`);
    }

    const provisioningInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { provisioningProfileUUID, provisioningProfileName, secondTargetPP, teamID } = provisioningInfo;

    if (!(secondTargetPP && provisioningProfileName && teamID)) {
        throw new Error('Provisioning profile UUID, name, or team ID not found in JSON file.');
    }

    // Dynamically resolve plugin directory (essential for OutSystems/MABS workspace structures)
    const pluginDir = context.opts.plugin ? context.opts.plugin.dir : path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging');
    const rubyScriptPath = path.join(pluginDir, 'scripts', 'update_provisioning_profile.rb');

    // Update Ruby script with new target name, SWIFT_VERSION, and RUNPATH search paths
    const rubyScriptContent = `
require 'xcodeproj'

begin
  project_path = 'platforms/ios/${projectName}.xcodeproj'
  target_name = 'MobileMessagingNotificationServiceExtension'
  provisioning_profile_uuid = '${secondTargetPP}'
  provisioning_profile_name = '${provisioningProfileName}'
  development_team = '${teamID}'
  code_sign_identity = '${codeSignIdentity}'

  puts "Opening project: #{project_path}"
  project = Xcodeproj::Project.open(project_path)

  puts "Finding target: #{target_name}"
  target = project.targets.find { |t| t.name == target_name }

  if target.nil? then
    puts "Target '#{target_name}' not found."
    exit 1
  end

  target.build_configurations.each do |config|
    puts "Updating settings for: #{config.name}"
    config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = provisioning_profile_name
    config.build_settings['PROVISIONING_PROFILE'] = provisioning_profile_uuid
    config.build_settings['CODE_SIGN_IDENTITY'] = code_sign_identity
    config.build_settings['DEVELOPMENT_TEAM'] = development_team
    config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
    config.build_settings['SWIFT_VERSION'] = '5.0'
    config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '@executable_path/../../Frameworks'
  end

  project.save
  puts "Successfully updated provisioning profile for target '#{target_name}'."
rescue => e
  puts "An error occurred: #{e.message}"
  exit 1
end
`;

console.log('Generating Ruby script to update provisioning profile2...');
console.log(`Ruby script content:\n${rubyScriptContent}`); 

    fs.writeFileSync(rubyScriptPath, rubyScriptContent, 'utf8');
    console.log('✅ Ruby script generated successfully.');

    // We do NOT override GEM_HOME here because v8.3.0 does not local-install gems.
    // Leaving GEM_HOME untouched allows Ruby to load the system-installed 'xcodeproj' gem preloaded on MABS.
    console.log(`Applying signing settings to target...`);
    try {
        execSync(`ruby "${rubyScriptPath}"`, { stdio: 'inherit' });
        console.log('✅ Ruby script completed successfully!');
    } catch (error) {
        console.error(`🚨 Error running Ruby script: ${error.message}`);
        throw error;
    }
};
