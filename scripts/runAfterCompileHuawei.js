const fs = require('fs');
const path = require('path');
var exec = require('child_process').exec;

module.exports = function(context) {
    console.log('✅ -- Executing after_compile hook to manage Cordova plugin.');

    // Get variables from huawei_info.json file
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    console.log("✅ -- Reading Huawei info from file: " + jsonFilePath);
    
    const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { credentials, webServiceUrl, huaweiSenderId, isBuildHuawei } = huaweiInfo;

    // Check if isBuildHuawei is true
    if (isBuildHuawei !== true) {
        console.log('ℹ️ -- isBuildHuawei is not true. Skipping plugin management.');
        return;
    }

    // Command to remove the existing plugin
    const removePluginCommand = 'cordova plugin remove com-infobip-plugins-mobilemessaging --verbose';

    exec(removePluginCommand, function(error, stdout, stderr) {
        if (error) {
            console.error(`❌ -- Error removing plugin: ${error}`);
            console.error(stderr);
            return;
        }

        console.log(`📦 -- Plugin removed successfully: ${stdout}`);

        // Command to add the plugin from the specific branch of the Git repository
        const addPluginCommand = `cordova plugin add https://github.com/os-adv-dev/mobile-messaging-cordova-plugin.git#and-implementation-huawei --variable CREDENTIALS=${credentials} --variable WEBSERVICEURL=${webServiceUrl} --variable HUAWEI_SENDER_ID=${huaweiSenderId} --verbose`;

        exec(addPluginCommand, function(error, stdout, stderr) {
            if (error) {
                console.error(`❌ -- Error adding plugin: ${error}`);
                console.error(stderr);
                return;
            }

            console.log(`📦 -- Plugin added successfully: ${stdout}`);
            console.log('✅ -- Plugin management completed.');
        });
    });
};