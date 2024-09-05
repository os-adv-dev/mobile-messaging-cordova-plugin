#!/usr/bin/env ruby
require 'xcodeproj'

# Define the path to the .xcodeproj file
project_path = 'platforms/ios/*.xcodeproj'  # Replace with the correct path if necessary
project_file = Dir[project_path].first
project = Xcodeproj::Project.open(project_file)

# Dynamically find the main target (assuming it's the first target)
main_target = project.targets.first

# Specify the secondary target name
secondary_target_name = 'MobileMessagingNotificationExtension'  # Secondary target name

# Locate the secondary target by name
secondary_target = project.targets.find { |target| target.name == secondary_target_name }

if main_target && secondary_target
  main_target.build_configurations.each do |main_config|
    corresponding_secondary_config = secondary_target.build_configurations.find { |config| config.name == main_config.name }

    if corresponding_secondary_config
      # Copy FRAMEWORK_SEARCH_PATHS from main to secondary target
      framework_search_paths = main_config.build_settings['FRAMEWORK_SEARCH_PATHS']

      if framework_search_paths
        corresponding_secondary_config.build_settings['FRAMEWORK_SEARCH_PATHS'] = framework_search_paths
        puts "✅ Copied FRAMEWORK_SEARCH_PATHS from #{main_target.name} to #{secondary_target_name} for configuration #{main_config.name}"
      else
        puts "⚠️ No FRAMEWORK_SEARCH_PATHS found for #{main_target.name} in configuration #{main_config.name}"
      end
    else
      puts "⚠️ No corresponding build configuration found for #{secondary_target_name} in #{main_config.name}"
    end
  end

  # Save the changes to the project
  project.save
  puts "🚀 Successfully updated FRAMEWORK_SEARCH_PATHS for target #{secondary_target_name}"
else
  puts "🚨 Could not find one or both targets: #{main_target&.name}, #{secondary_target_name}"
end