require 'fileutils'

# Define the path to your Podfile
podfile_path = File.join(Dir.pwd, 'platforms', 'ios', 'Podfile')

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
    # Add any specific pods here
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