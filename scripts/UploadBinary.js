const path = require("path");
const fs = require('fs');
const axios = require('axios');
const base64 = require('base-64');

module.exports = function(context) {
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

    const androidOutputDir = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk');
    
    if (fs.existsSync(androidOutputDir)) {
        let apkFilePath;
        if (mode === "release") {
            apkFilePath = path.join(androidOutputDir, 'release/app-release.apk');
            console.log("✅ -- APK build type RELEASE: " + apkFilePath);
            baseUrl += "?type=release&platform=android&name=app-release.apk";
        } else {
            apkFilePath = path.join(androidOutputDir, 'debug/app-debug.apk');
            console.log("✅ -- APK build type DEBUG: " + apkFilePath);
            baseUrl += "?type=debug&platform=android&name=app-debug.apk";
        }

        var bodyFormData = new FormData();

        // Check if the APK file exists before proceeding
        if (fs.existsSync(apkFilePath)) {

            console.log(`-- ✅ APK file exists --- `);

           // var binaryFile = fs.createReadStream(apkFilePath);
           // bodyFormData.append('file', binaryFile);

            try {
                axios({
                    method: "post",
                    url: baseUrl,
                   // data: bodyFormData,
                    data: apkFilePath,
                    headers: {
                        "Authorization": encryptedAuth,
                         "Content-Type": "application/octet-stream"
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }).then((response) => {
                    console.log("✅ -- Successfully uploaded file. Response status: ", response.status);
                }).catch((error) => {
                    console.log("❌ -- Failed to send file "+error);
                    console.log("❌ -- Failed to send file "+error.message);
                });
            } catch (error) {
                console.error("❌ -- Failed to upload file. Error: ", error);
                console.error("❌ -- Failed to upload file. Error Message: ", error.message);
            }
        } else {
            console.error(`❌ -- APK file not found at ${apkFilePath}`);
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