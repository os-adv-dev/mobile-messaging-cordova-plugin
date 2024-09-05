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

# Define the specific framework search paths
custom_framework_search_paths = [
  "$(inherited)",
  "$(PODS_CONFIGURATION_BUILD_DIR)/CocoaLumberjack",
  "$(PODS_CONFIGURATION_BUILD_DIR)/FLEX",
  "$(PODS_CONFIGURATION_BUILD_DIR)/FirebaseCore",
  "$(PODS_CONFIGURATION_BUILD_DIR)/FirebaseCoreInternal",
  "$(PODS_CONFIGURATION_BUILD_DIR)/GoogleUtilities",
  "$(PODS_CONFIGURATION_BUILD_DIR)/FirebaseInstallations",
  "$(PODS_CONFIGURATION_BUILD_DIR)/MobileMessaging",
  "$(PODS_CONFIGURATION_BUILD_DIR)/PromisesObjC",
  "$(PODS_CONFIGURATION_BUILD_DIR)/PureeOS",
  "$(PODS_CONFIGURATION_BUILD_DIR)/YapDatabase",
  "$(PODS_CONFIGURATION_BUILD_DIR)/nanopb",
  "$(PODS_ROOT)/FirebaseAnalytics/Frameworks",
  "$(PODS_ROOT)/GoogleAppMeasurement/Frameworks",
  "$(PODS_XCFRAMEWORKS_BUILD_DIR)/FirebaseAnalytics/AddIdSupport",
  "$(PODS_XCFRAMEWORKS_BUILD_DIR)/GoogleAppMeasurement/AddIdSupport",
  "$(PODS_XCFRAMEWORKS_BUILD_DIR)/GoogleAppMeasurement/WithoutAdIdSupport"
]

if main_target && secondary_target
  main_target.build_configurations.each do |main_config|
    corresponding_secondary_config = secondary_target.build_configurations.find { |config| config.name == main_config.name }

    if corresponding_secondary_config
      # Apply custom FRAMEWORK_SEARCH_PATHS for secondary target
      corresponding_secondary_config.build_settings['FRAMEWORK_SEARCH_PATHS'] = custom_framework_search_paths
      puts "✅ Applied custom FRAMEWORK_SEARCH_PATHS to #{secondary_target_name} for configuration #{main_config.name}"
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