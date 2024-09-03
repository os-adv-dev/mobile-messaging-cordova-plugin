const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

module.exports = async function(context) {
    console.log('✅ -- Executing Hook to manage Cordova plugin in Another branch to HUAWEI.');

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

    try {
        // Command to remove the existing plugin
        const removePluginCommand = 'cordova plugin remove com-infobip-plugins-mobilemessaging --verbose';
        console.log("🔄 -- Removing existing plugin...");
        await execShellCommand(removePluginCommand);
        console.log("✅ -- Plugin removed successfully.");

        // Command to add the plugin from the specific branch of the Git repository
        const addPluginCommand = `cordova plugin add https://github.com/os-adv-dev/mobile-messaging-cordova-plugin.git#and-implementation-huawei --variable CREDENTIALS=${credentials} --variable WEBSERVICEURL=${webServiceUrl} --variable HUAWEI_SENDER_ID=${huaweiSenderId} --verbose`;
        console.log("🔄 -- Adding plugin from specific branch...");
        await execShellCommand(addPluginCommand);
        console.log("✅ -- Plugin added successfully.");

    } catch (error) {
        console.error(`❌ -- Error during plugin management: ${error}`);
    }

    console.log('✅ -- Plugin management completed.');
};

function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ -- Error: ${stderr}`);
                reject(`Error: ${error}`);
            } else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
