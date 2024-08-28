const path = require("path");
const fs = require('fs');
const axios = require('axios');
const base64 = require('base-64');

module.exports = async function(context) {
    console.log('🚀 Starting Upload Process');

    process.chdir(context.opts.projectRoot);

    let mode = 'debug';
    if (context.cmdLine.indexOf('release') >= 0) {
        mode = 'release';
    }

    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    console.log("✅ -- Retrieved Huawei info file path: " + jsonFilePath);

    if (!fs.existsSync(jsonFilePath)) {
        console.error(`❌ -- HUAWEI info JSON file not found at ${jsonFilePath}`);
        return;
    }

    const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { credentials, webServiceUrl } = huaweiInfo;

    console.log("✅ -- Credentials and WebService URL retrieved from JSON.");
    
    let encryptedAuth = credentials.includes(":") ? "Basic " + base64.encode(credentials) : credentials;
    console.log("✅ -- Encrypted Authorization: " + encryptedAuth);

    let baseUrl = webServiceUrl;

    var bodyFormData = new FormData();
    var binaryFile;
    
    if (fs.existsSync("platforms/android")) {
        if (mode === "release") {
            var releaseFile = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk/release/app-release.apk');
            console.log("✅ -- APK build type RELEASE: " + releaseFile);
            baseUrl += "?type=release&platform=android&name=app-release.apk";
            binaryFile = fs.readFileSync(releaseFile);
        } else {
            var debugFile = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk/debug/app-debug.apk');
            console.log("✅ -- APK build type DEBUG: " + debugFile);
            baseUrl += "?type=debug&platform=android&name=app-debug.apk";
            binaryFile = fs.readFileSync(debugFile);
        }

        bodyFormData.append('file', binaryFile);

        try {
            const response = await axios({
                method: "post",
                url: baseUrl,
                data: bodyFormData,
                headers: {
                    "Authorization": encryptedAuth,
                    "Content-Type": "multipart/form-data"
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            console.log("✅ -- Successfully uploaded file. Response status: ", response.status);
        } catch (error) {
            console.error("❌ -- Failed to upload file. Error: ", error.message || error);
        }
    } else {
        console.error('❌ -- Android platform directory not found.');
    }
};

function isCordovaAbove(context, version) {
    const cordovaVersion = context.opts.cordova.version;
    console.log("🔍 -- Cordova version: " + cordovaVersion);
    const sp = cordovaVersion.split('.');
    return parseInt(sp[0]) >= version;
}
