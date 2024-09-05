#!/usr/bin/env ruby
require 'xcodeproj'

# Define the path to the .xcodeproj file
project_path = 'platforms/ios/MyApp.xcodeproj'  # Change 'MyApp.xcodeproj' to your actual project name
project = Xcodeproj::Project.open(project_path)

# Specify the target you want to modify
target_name = 'MobileMessagingNotificationExtension'
desired_search_path = '"${PODS_CONFIGURATION_BUILD_DIR}/MobileMessaging"'

# Find the target and update the framework search path
project.targets.each do |target|
  if target.name == target_name
    target.build_configurations.each do |config|
      # Get the current FRAMEWORK_SEARCH_PATHS or initialize it if it doesn't exist
      search_paths = config.build_settings['FRAMEWORK_SEARCH_PATHS'] || '$(inherited)'

      # Check if the search path is an array (it may be a string or an array in Xcode projects)
      if search_paths.is_a?(Array)
        # Add the desired path if it doesn't exist in the array
        unless search_paths.include?(desired_search_path)
          search_paths << desired_search_path
          puts "✅ Added framework search path to #{target_name} for configuration #{config.name}"
        end
      else
        # If it's a string, make it an array and add the desired path
        search_paths = [search_paths, desired_search_path]
      end

      # Update the build setting with the modified search paths
      config.build_settings['FRAMEWORK_SEARCH_PATHS'] = search_paths
    end
  end
end

# Save the project file
project.save
puts "🚀 Successfully updated framework search paths in target #{target_name}"