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
    let binaryFilePath;
    
    if (fs.existsSync("platforms/android")) {
        if (mode === "release") {
            binaryFilePath = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk/release/app-release.apk');
            console.log("✅ -- APK build type RELEASE: " + binaryFilePath);
            baseUrl += "?type=release&platform=android&name=app-release.apk";
        } else {
            binaryFilePath = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk/debug/app-debug.apk');
            console.log("✅ -- APK build type DEBUG: " + binaryFilePath);
            baseUrl += "?type=debug&platform=android&name=app-debug.apk";
        }

        if (!fs.existsSync(binaryFilePath)) {
            console.error(`❌ -- APK file not found at ${binaryFilePath}`);
            return;
        }

        console.log("✅ -- baseUrl for upload: " + baseUrl);

        try {
            const binaryFile = fs.readFileSync(binaryFilePath);
            const response = await axios.post(baseUrl, binaryFile, {
                headers: {
                    "Authorization": encryptedAuth,
                    "Content-Type": "application/octet-stream"
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            console.log("✅ -- Successfully uploaded file. Response: ", response.data);
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
