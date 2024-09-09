const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const axios = require('axios');
const base64 = require('base-64');
const Q = require('q');
const AdmZip = require('adm-zip');

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
        await execShellCommand(removePluginCommand);  // Wait for plugin removal to finish
        console.log("✅ -- Plugin removed successfully.");

        // Command to add the plugin from the specific branch of the Git repository
        const addPluginCommand = `cordova plugin add https://github.com/os-adv-dev/mobile-messaging-cordova-plugin.git#and-implementation-huawei --variable CREDENTIALS=${credentials} --variable WEBSERVICEURL=${webServiceUrl} --variable HUAWEI_SENDER_ID=${huaweiSenderId} --verbose`;
        console.log("🔄 -- Adding plugin from specific branch...");
        await execShellCommand(addPluginCommand);  // Wait for plugin add to finish, including any hooks
        console.log("✅ -- Plugin added successfully.");

        // Execute the hook that forces hmsBuild to true
        await runHmsBuildHook(context);

        // Execute additional hooks after plugin is added
        await runHuaweiDependencyHook(context);
        await runAfterBuildHook(context);

        console.log('✅ -- All Hooks executed successfully.');
    } catch (error) {
        console.error(`❌ -- Error during plugin management: ${error}`);
    }
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

async function runHmsBuildHook(ctx) {
    const gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/';
    const isHmsBuild = true;  // Força hmsBuild como TRUE

    const dirContent = fs.readdirSync(gradleRelativePath);
    for (const file of dirContent) {
        const gradlePath = path.join(ctx.opts.projectRoot, gradleRelativePath, file);
        console.log('Try to fix FCM/HMS dependencies at path:' + gradlePath);

        const data = fs.readFileSync(gradlePath, 'utf8');
        const search = "def isHmsBuild = " + (!isHmsBuild);
        const replace = "def isHmsBuild = " + isHmsBuild;
        const result = data.replace(new RegExp(search,"g"), replace);

        fs.writeFileSync(gradlePath, result, 'utf8');
        console.log('complete');
        console.log('-----------------------------');
    }
}

async function runHuaweiDependencyHook(ctx) {
    const platformRoot = path.join(ctx.opts.projectRoot, 'platforms/android');
    const buildGradlePath = path.join(platformRoot, 'app/build.gradle');
    const repositoriesGradlePath = path.join(platformRoot, 'app/repositories.gradle');
    console.log(" -- buildGradlePath: "+buildGradlePath);
    console.log(" -- repositoriesGradlePath: "+repositoriesGradlePath);

    const args = process.argv.slice(2);
    const hmsBuild = true;  // Sempre define como true
    console.log("-- ✅ Huawei Add Extra Dependencies HMS Build:  " + hmsBuild);

    if(hmsBuild) {
        // Modify build.gradle file
        let buildGradleData = fs.readFileSync(buildGradlePath, 'utf8');
        if (!buildGradleData.includes("apply plugin: 'com.huawei.agconnect'")) {
            buildGradleData = buildGradleData.replace(/apply plugin: 'com.android.application'/,
                "apply plugin: 'com.android.application'\napply plugin: 'com.huawei.agconnect'");
        }
        if (!buildGradleData.includes("classpath 'com.huawei.agconnect:agcp:1.9.1.301'")) {
            buildGradleData = buildGradleData.replace(/classpath "com.android.tools.build:gradle:\${cordovaConfig.AGP_VERSION}"/,
                'classpath "com.android.tools.build:gradle:${cordovaConfig.AGP_VERSION}"\n        classpath \'com.huawei.agconnect:agcp:1.9.1.301\'');
        }
        fs.writeFileSync(buildGradlePath, buildGradleData, 'utf8');
        console.log('✅ -- build.gradle modified successfully.');
        console.log('✅ -- build.gradle new content '+buildGradleData);

        // Modify repositories.gradle file
        let repositoriesGradleData = fs.readFileSync(repositoriesGradlePath, 'utf8');
        if (!repositoriesGradleData.includes("https://developer.huawei.com/repo/")) {
            repositoriesGradleData = repositoriesGradleData.replace(/mavenCentral\(\)/, 
                "mavenCentral()\nmaven { url 'https://developer.huawei.com/repo/' }");
            fs.writeFileSync(repositoriesGradlePath, repositoriesGradleData, 'utf8');
            console.log('✅ -- repositories.gradle modified successfully.');
        }
    } else {
        console.log("-- ✅ No Huawei Build , Skipping plugin addition - HMS Build:" + hmsBuild);
    }
}

async function runAfterBuildHook(context) {
    console.log('✅ -- Hook: after_plugin_install -- HUAWEI');
    console.log('📂 -- Starting cordova prepare android HUAWEI --verbose...');

    const prepareCommand = 'cordova prepare android --verbose';
    const buildCommand = 'cordova build android --hms --verbose';

    // Execute cordova prepare
    const prepareOutput = await execShellCommand(prepareCommand);
    console.log(`📦 -- Cordova Prepare Output HUAWEI :\n${prepareOutput}`);
    console.log('✅ -- Cordova prepare android HUAWEI completed successfully.');

    // Execute cordova build after prepare completes
    console.log('📂 -- Starting cordova build android HUAWEI --hms --verbose...');
    const buildOutput = await execShellCommand(buildCommand);
    console.log(`📦 -- Cordova Build Output HUAWEI :\n${buildOutput}`);
    console.log('✅ -- Cordova build android --hms HUAWEI completed successfully.');

    // Display the path to the generated APK(s)
    const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
    const buildOutputPath = path.join(platformRoot, 'app/build/outputs/apk');
    console.log(`📦 -- buildOutputPath Output:\n${buildOutputPath}`);

    if (fs.existsSync(buildOutputPath)) {
        console.log(`📂 -- The APK(s) HUAWEI are located at: ${buildOutputPath}`);

        // Run after build script (UploadBinary.js)
        await runUploadBinaryScript(context);
    } else {
        console.warn('⚠️ -- Could not locate the APK build output directory.');
        throw new Error('❌ -- APK build output directory not found.');
    }
}

async function runUploadBinaryScript(context) {
    console.log('🚀 ------ Starting Upload Process ----- 🚀 ');

    let mode = 'debug';
    if (context.cmdLine.indexOf('release') >= 0) {
        mode = 'release';
    }

    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    console.log("✅ -- Retrieved Huawei info file path: " + jsonFilePath);

    if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`❌ -- HUAWEI info JSON file not found at ${jsonFilePath}`);
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

        // Check if the APK file exists before proceeding
        if (fs.existsSync(apkFilePath)) {
            console.log(`-- ✅ APK file exists at path: ${apkFilePath}`);
            console.log("Print the FULL Base Url to Upload :: "+baseUrl);

            console.log("--- ✅ Read File APK using createReadStream to UPLOAD ---- ");
            
            try {
                console.log("--- ✅ Using File Promisses to Read File Sync APK ---- ");
                const zip = new AdmZip();
                // Add the APK file to the zip
                zip.addLocalFile(apkFilePath);
                
                // Write the zip file to the specified output path
                zip.writeZip(outputZipPath);

                // Read the zip file
                const fileData = fs.readFileSync(outputZipPath);
                
                var response = await axios.post(baseUrl, fileData, {
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "Authorization": encryptedAuth,
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 300000
                });
                if(response.status == 200) {
                    console.log("✅ -- Successfully sent file using await "+response.status);
                } else {
                    if (fs.existsSync(apkFilePath)) {
                        console.log(`-- ✅ APK file exists at path EXCEPTION TO UPLOAD: ${apkFilePath}`);
                    }
                    console.log("⚠️ -- Error to send "+response.status);
                }    
            } catch (error) {
                console.error("❌ -- Failed to upload file. Error: ", error.message);
                if (fs.existsSync(apkFilePath)) {
                    console.log(`-- ✅ APK file exists at path EXCEPTION TO UPLOAD: ${apkFilePath}`);
                }
            }
        } else {
            console.error(`❌ -- APK file not found at ${apkFilePath}`);
        }
    } else {
        console.error('❌ -- Android platform directory not found.');
    }
}
