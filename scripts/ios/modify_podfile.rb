require 'fileutils'

# Define the path to your Podfile
ios_platform_path = File.join(Dir.pwd, 'platforms', 'ios')
podfile_path = File.join(ios_platform_path, 'Podfile')

# Check if Podfile exists
unless File.exist?(podfile_path)
  puts "🚨 Podfile not found at #{podfile_path}"
  exit(1)
end

# Read the existing Podfile content
podfile_content = File.read(podfile_path)

# Define the secondary target block that we want to add
secondary_target_block = <<-PODBLOCK
target 'MobileMessagingNotificationExtension' do
    inherit! :search_paths
    # pod 'MobileMessaging', '12.6.2'
end
PODBLOCK

# Check if the secondary target already exists
unless podfile_content.include?("target 'MobileMessagingNotificationExtension'")
  # Insert the new target block before the last 'end'
  updated_podfile_content = podfile_content.sub(/end\s*$/, "#{secondary_target_block}\nend")
  
  # Write the updated content back to the Podfile
  File.open(podfile_path, 'w') { |file| file.puts updated_podfile_content }
  puts '✅ Podfile updated successfully!'
else
  puts '👉 Secondary target already exists in Podfile, no changes made.'
end

# Print the updated Podfile content
puts '👉 Updated Podfile content:'
puts File.read(podfile_path)

# Run 'pod deintegrate' to clean up old Pods
puts '👉 Running pod deintegrate...'
if system('pod deintegrate', chdir: ios_platform_path)
  puts '✅ pod deintegrate completed successfully!'
else
  puts '🚨 Error running pod deintegrate.'
  exit(1)
end

# Run 'pod install' to install dependencies
puts '👉 Running pod install...'
if system('pod install', chdir: ios_platform_path)
  puts '✅ pod install completed successfully!'
else
  puts '🚨 Error running pod install.'
  exit(1)
end