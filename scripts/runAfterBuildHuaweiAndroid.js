const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const axios = require('axios');
const base64 = require('base-64');
const Q = require('q');
const AdmZip = require('adm-zip');

module.exports = function(context) {
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

    // Encadeamento das Promises usando Q
    return execShellCommand('cordova plugin remove com-infobip-plugins-mobilemessaging --verbose')
        .then(() => {
            console.log("✅ -- Plugin removed successfully.");

            const addPluginCommand = `cordova plugin add https://github.com/os-adv-dev/mobile-messaging-cordova-plugin.git#and-implementation-huawei --variable CREDENTIALS=${credentials} --variable WEBSERVICEURL=${webServiceUrl} --variable HUAWEI_SENDER_ID=${huaweiSenderId} --verbose`;
            console.log("🔄 -- Adding plugin from specific branch...");
            return execShellCommand(addPluginCommand);
        })
        .then(() => {
            console.log("✅ -- Plugin added successfully.");
            return runHmsBuildHook(context);
        })
        .then(() => runHuaweiDependencyHook(context))
        .then(() => runAfterBuildHook(context))
        .then(() => {
            console.log('✅ -- All Hooks executed successfully.');
        })
        .catch(error => {
            console.error(`❌ -- Error during plugin management: ${error}`);
        });
};

function execShellCommand(cmd) {
    const deferred = Q.defer();
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ -- Error: ${stderr}`);
            deferred.reject(`Error: ${error}`);
        } else {
            console.log(stdout);
            deferred.resolve(stdout);
        }
    });
    return deferred.promise;
}

function runHmsBuildHook(ctx) {
    const deferred = Q.defer();
    const gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/';
    const isHmsBuild = true;  // Força hmsBuild como TRUE

    const dirContent = fs.readdirSync(gradleRelativePath);
    dirContent.forEach(file => {
        const gradlePath = path.join(ctx.opts.projectRoot, gradleRelativePath, file);
        console.log('Try to fix FCM/HMS dependencies at path:' + gradlePath);

        const data = fs.readFileSync(gradlePath, 'utf8');
        const search = "def isHmsBuild = " + (!isHmsBuild);
        const replace = "def isHmsBuild = " + isHmsBuild;
        const result = data.replace(new RegExp(search, "g"), replace);

        fs.writeFileSync(gradlePath, result, 'utf8');
        console.log('complete');
        console.log('-----------------------------');
    });
    deferred.resolve();
    return deferred.promise;
}

function runHuaweiDependencyHook(ctx) {
    const deferred = Q.defer();
    const platformRoot = path.join(ctx.opts.projectRoot, 'platforms/android');
    const buildGradlePath = path.join(platformRoot, 'app/build.gradle');
    const repositoriesGradlePath = path.join(platformRoot, 'app/repositories.gradle');
    console.log(" -- buildGradlePath: " + buildGradlePath);
    console.log(" -- repositoriesGradlePath: " + repositoriesGradlePath);

    const hmsBuild = true;  // Sempre define como true
    console.log("-- ✅ Huawei Add Extra Dependencies HMS Build:  " + hmsBuild);

    if (hmsBuild) {
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

        // Modify repositories.gradle file
        let repositoriesGradleData = fs.readFileSync(repositoriesGradlePath, 'utf8');
        if (!repositoriesGradleData.includes("https://developer.huawei.com/repo/")) {
            repositoriesGradleData = repositoriesGradleData.replace(/mavenCentral\(\)/,
                "mavenCentral()\nmaven { url 'https://developer.huawei.com/repo/' }");
            fs.writeFileSync(repositoriesGradlePath, repositoriesGradleData, 'utf8');
            console.log('✅ -- repositories.gradle modified successfully.');
        }
    }
    deferred.resolve();
    return deferred.promise;
}

function runAfterBuildHook(context) {
    const deferred = Q.defer();
    console.log('✅ -- Hook: after_plugin_install -- HUAWEI');
    console.log('📂 -- Starting cordova prepare android HUAWEI --verbose...');

    const prepareCommand = 'cordova prepare android --verbose';
    const buildCommand = 'cordova build android --hms --verbose';

    execShellCommand(prepareCommand)
        .then(prepareOutput => {
            console.log(`📦 -- Cordova Prepare Output HUAWEI :\n${prepareOutput}`);
            console.log('✅ -- Cordova prepare android HUAWEI completed successfully.');

            return execShellCommand(buildCommand);
        })
        .then(buildOutput => {
            console.log(`📦 -- Cordova Build Output HUAWEI :\n${buildOutput}`);
            console.log('✅ -- Cordova build android --hms HUAWEI completed successfully.');

            const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
            const buildOutputPath = path.join(platformRoot, 'app/build/outputs/apk');
            console.log(`📦 -- buildOutputPath Output:\n${buildOutputPath}`);

            if (fs.existsSync(buildOutputPath)) {
                console.log(`📂 -- The APK(s) HUAWEI are located at: ${buildOutputPath}`);
                return runUploadBinaryScript(context);
            } else {
                console.warn('⚠️ -- Could not locate the APK build output directory.');
                deferred.reject('❌ -- APK build output directory not found.');
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .catch(error => {
            console.error(`❌ -- Error during after build hook: ${error}`);
            deferred.reject(error);
        });

    return deferred.promise;
}

function runUploadBinaryScript(context) {
    const deferred = Q.defer();
    console.log('🚀 ------ Starting Upload Process ----- 🚀 ');

    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    console.log("✅ -- Retrieved Huawei info file path: " + jsonFilePath);

    if (!fs.existsSync(jsonFilePath)) {
        deferred.reject(`❌ -- HUAWEI info JSON file not found at ${jsonFilePath}`);
        return deferred.promise;
    }

    const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { credentials, webServiceUrl } = huaweiInfo;

    console.log("✅ -- Credentials and WebService URL retrieved from JSON.");
    
    let encryptedAuth = credentials.includes(":") ? "Basic " + base64.encode(credentials) : credentials;
    console.log("✅ -- Encrypted Authorization: " + encryptedAuth);

    const androidOutputDir = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk');
    if (fs.existsSync(androidOutputDir)) {
        const apkFilePath = path.join(androidOutputDir, 'debug/huawei-app-debug.apk');
        if (fs.existsSync(apkFilePath)) {
            console.log(`-- ✅ APK HUAWEI file exists at path: ${apkFilePath}`);

            try {
                const zip = new AdmZip();
                zip.addLocalFile(apkFilePath);
                const outputZipPath = path.join(androidOutputDir, 'debug/huawei-app-debug.zip');
                zip.writeZip(outputZipPath);

                const fileData = fs.readFileSync(outputZipPath);
                const baseUrl = `${webServiceUrl}?type=debug&platform=android&name=huawei-app-debug.apk`;

                axios.post(baseUrl, fileData, {
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "Authorization": encryptedAuth,
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 300000
                }).then(response => {
                    console.log(`✅ -- Successfully sent file with status: ${response.status}`);
                    deferred.resolve();
                }).catch(error => {
                    console.error(`❌ -- Failed to upload file. Error: ${error.message}`);
                    deferred.reject(error);
                });
            } catch (error) {
                console.error(`❌ -- Error zipping APK file: ${error.message}`);
                deferred.reject(error);
            }
        } else {
            console.error(`❌ -- APK file not found at ${apkFilePath}`);
            deferred.reject('❌ -- APK file not found.');
        }
    } else {
        console.error('❌ -- Android platform directory not found.');
        deferred.reject('❌ -- Android platform directory not found.');
    }

    return deferred.promise;
}