var axios;
var base64;
const path = require("path")
const fs = require('fs');

module.exports = function(context) {

	if(isCordovaAbove(context,8)){
        axios = require('axios');
        base64 = require('base-64');
	}else{
        base64 = context.requireCordovaModule('base-64');
        axios = context.requireCordovaModule('axios');
	}

	process.chdir(context.opts.projectRoot);

    var mode = 'debug';
	if (context.cmdLine.indexOf('release') >= 0) {
	    mode = 'release';
	}

    // get variables form huawei json file
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    console.log(" ✅ -- get file huawei info to build: "+jsonFilePath);

    // Check if the Huawei JSON file exists
    if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`HUAWEI file info JSON file not found at ${jsonFilePath}`);
    }

    // Read the JSON file
    const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { credentials, webServiceUrl } = huaweiInfo;

    console.log(" ✅ -- after read Json file credentials: "+credentials);
    console.log(" ✅ -- after read Json file webServiceUrl: "+webServiceUrl);

    var encryptedAuth = credentials;

    if(encryptedAuth.includes(":")){
        encryptedAuth = "Basic "+base64.encode(encryptedAuth);
        console.log("✅ -- Ecrypted Auth Encode: "+encryptedAuth);
    }

    var baseUrl = webServiceUrl;
    console.log("✅ -- MODE: "+mode);
    console.log("✅ -- BASE_URL: "+baseUrl);
    console.log("✅ -- encryptedAuth: "+encryptedAuth);

    var binaryFile;
    
    if(fs.existsSync("platforms/android")){
        if(mode == "release") {
            var instantAppFileRelease = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk/release/app-release.apk');
            console.log("✅ -- APK build type RELEASE: "+instantAppFileRelease);
            baseUrl += "?type=release&platform=android&name=app-release.apk";
            binaryFile = fs.readFileSync(instantAppFileRelease);
        } else {
            var instantAppFileDebug = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk/debug/app-debug.apk');
            console.log("✅ -- APK build type DEBUG: "+instantAppFileDebug);
            baseUrl += "?type=debug&platform=android&name=app-debug.apk";
            binaryFile = fs.readFileSync(instantAppFileDebug);
        }

        console.log("✅ -- baseUrl : "+baseUrl);
    }

    axios.post(baseUrl,binaryFile,{
        headers:{
            "Authorization": encryptedAuth,
            "Content-Type": "application/octet-stream"
        },
	maxContentLength: Infinity,
	maxBodyLength: Infinity
    }).then((response) => {
        console.log("✅ -- Successfully sent file: "+response);
    }).catch((error) => {
        console.log("❌ -- Failed to send file: "+error);
        log(error);
    });
}

function isCordovaAbove (context, version) {
	var cordovaVersion = context.opts.cordova.version;
	console.log(cordovaVersion);
	var sp = cordovaVersion.split('.');
	return parseInt(sp[0]) >= version;
}