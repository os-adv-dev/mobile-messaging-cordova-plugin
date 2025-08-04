const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const axios = require('axios');
const base64 = require('base-64');
const Q = require('q');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

module.exports = function(context) {
    console.log('✅ -- Executing Hook to upload APK and manage Cordova plugin for HUAWEI.');

    // Get variables from huawei_info.json file
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    console.log("✅ -- Reading Huawei info from file: " + jsonFilePath);

    const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { credentials, webServiceUrl, huaweiSenderId, isBuildHuawei } = huaweiInfo;

       // Check if isBuildHuawei is false
       if (!isBuildHuawei) {
        console.log('ℹ️ -- isBuildHuawei is false. Skipping upload process, but proceeding with plugin management.');

        // Run only the Hms build hook and plugin management when isBuildHuawei is false
        return runHmsBuildHook(context)
            .then(() => {
                console.log('✅ -- Hms Build Hook executed successfully for build without Huawei.');

                // Remove the existing plugin
                return execShellCommand('cordova plugin remove com-infobip-plugins-mobilemessaging --verbose');
            })
            .then(() => {
                console.log("✅ -- Plugin HUAWEI removed successfully.");

                // Add the alternative plugin
                const addPluginCommand = `cordova plugin add https://github.com/os-adv-dev/mobile-messaging-cordova-plugin.git#7.2.1-os-android --variable CREDENTIALS=${credentials} --variable WEBSERVICEURL=${webServiceUrl} --variable HUAWEI_SENDER_ID=${huaweiSenderId} --verbose`;
                console.log("🔄 -- Adding plugin from specific branch...");
                return execShellCommand(addPluginCommand);
            })
            .then(() => {
                console.log("✅ -- Plugin WITHOUT HUAWEI added successfully.");
            })
            .catch(error => {
                console.error(`❌ -- Error during plugin management: ${error}`);
            });
    } else {
        // Continue with the full process if isBuildHuawei is true
        console.log('ℹ️ -- isBuildHuawei is true. Proceeding with full plugin management process.');

        // Upload do APK
        return runUploadBinaryScript(context)
            .then(() => {
                console.log('✅ -- APK uploaded successfully.');
                // Remover o plugin após o upload ser concluído
                return execShellCommand('cordova plugin remove com-infobip-plugins-mobilemessaging --verbose');
            })
            .then(() => {
                console.log("✅ -- Plugin HUAWEI removed successfully.");
                // Add again the plugin using another branch
                const addPluginCommand = `cordova plugin add https://github.com/os-adv-dev/mobile-messaging-cordova-plugin.git#7.2.1-os-android --variable CREDENTIALS=${credentials} --variable WEBSERVICEURL=${webServiceUrl} --variable HUAWEI_SENDER_ID=${huaweiSenderId} --verbose`;
                console.log("🔄 -- Adding plugin from specific branch...");
                return execShellCommand(addPluginCommand);
            })
            .then(() => {
                console.log("✅ -- Plugin WITHOUT HUAWEI added successfully.");
                return runHmsBuildHook(context);
            })
            .then(() => runHuaweiDependencyHook(context))
            .then(() => runAfterBuildHook(context))
            .then(() => {
                console.log('✅ -- All Hooks executed successfully APP EXECUTE FINISH --- .');
            })
            .catch(error => {
                console.error(`❌ -- Error during plugin management: ${error}`);
            });
    }
};

function runAfterBuildHook(context) {
    const deferred = Q.defer();
    console.log('✅ -- RUN BUILD APP WITHOUT HUAWEI NORMAL APK TO USE IN QR CODE --');
    
    const isDebug = context.cmdLine.includes('debug');
    const projectRoot = context.opts.projectRoot;
    const platformRoot = path.join(projectRoot, 'platforms/android');
    //const gradlewPath = path.join(projectRoot, 'platforms/android/gradlew');
    // Determine the gradlewPath based on the cordova-android version
    let gradlewPath = path.join(context.opts.projectRoot, 'platforms/android/gradlew');
    const packageJsonPath = path.join(context.opts.projectRoot, 'node_modules/cordova-android/package.json');
    
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = require(packageJsonPath);
        const cordovaAndroidVersion = packageJson.version;
        console.log(`📦 -- Detected cordova-android version: ${cordovaAndroidVersion}`);
        
        if (parseInt(cordovaAndroidVersion.split('.')[0], 10) >= 13) {
            gradlewPath = path.join(context.opts.projectRoot, 'platforms/android/tools/gradlew');
        }
    } else {
        console.warn("⚠️ -- Could not determine cordova-android version. Defaulting to version 12 path.");
    }

    console.log(`📂 -- Using gradlewPath: ${gradlewPath}`);
    
    console.log(`📂  📦  📦  📦 ------  Starting Gradle build: ${isDebug ? 'Debug' : 'Release'}...`);

    // Define the command based on whether it's debug or release
    const gradleCommand = isDebug ? `${gradlewPath} cdvBuildDebug` : `${gradlewPath} cdvBuildRelease`;    

    // Save the current directory
    const initialDir = process.cwd();
    console.log(`✅ -- Initial directory: ${initialDir}`);

    // Change to the correct directory (platforms/android)
    process.chdir(platformRoot);
    console.log(`✅ -- Changed directory to: ${process.cwd()}`);

    // Execute the Gradle command
    execShellCommand(gradleCommand)
        .then(buildOutput => {
            console.log(`📦 -- Gradle Build Output:\n${buildOutput}`);
            console.log(`✅ -- Gradle build android ${isDebug ? 'Debug' : 'Release'} completed successfully.`);
            const buildOutputPath = path.join(platformRoot, 'app/build/outputs/apk');
            console.log(`📦 -- buildOutputPath Output:\n${buildOutputPath}`);
        })
        .then(() => {
            // Change back to the initial directory after the command execution
            process.chdir(initialDir);
            console.log(`✅ -- Reverted back to initial directory: ${initialDir}`);
            deferred.resolve();
        })
        .catch(error => {
            console.error(`❌ -- Error during build hook: ${error}`);
            // Always revert back to the initial directory on error
            process.chdir(initialDir);
            deferred.reject(error);
        });

    return deferred.promise;
}

function runHuaweiDependencyHook(ctx) {
    const deferred = Q.defer();
    const platformRoot = path.join(ctx.opts.projectRoot, 'platforms/android');
    const buildGradlePath = path.join(platformRoot, 'app/build.gradle');
    const repositoriesGradlePath = path.join(platformRoot, 'app/repositories.gradle');
    console.log(" -- buildGradlePath: " + buildGradlePath);
    console.log(" -- repositoriesGradlePath: " + repositoriesGradlePath);

    const hmsBuild = false;  // Force build android without HUAWEI things
    console.log("-- ✅ Huawei Add Extra Dependencies HMS Build:  " + hmsBuild);

    if (!hmsBuild) {
        // Remove specific lines from build.gradle
        let buildGradleData = fs.readFileSync(buildGradlePath, 'utf8');

        // Remove 'apply plugin: com.huawei.agconnect'
        if (buildGradleData.includes("apply plugin: 'com.huawei.agconnect'")) {
            buildGradleData = buildGradleData.replace(/apply plugin: 'com.huawei.agconnect'\n?/, '');
            console.log("✅ -- Removed 'apply plugin: com.huawei.agconnect' from build.gradle.");
        }

        // Remove 'classpath com.huawei.agconnect:agcp:1.9.1.301'
        if (buildGradleData.includes("classpath 'com.huawei.agconnect:agcp:1.9.1.301'")) {
            buildGradleData = buildGradleData.replace(/classpath 'com.huawei.agconnect:agcp:1.9.1.301'\n?/, '');
            console.log("✅ -- Removed 'classpath com.huawei.agconnect:agcp:1.9.1.301' from build.gradle.");
        }

        fs.writeFileSync(buildGradlePath, buildGradleData, 'utf8');
        console.log('✅ -- build.gradle updated successfully.');

        // Modify repositories.gradle file to remove Huawei repository
        let repositoriesGradleData = fs.readFileSync(repositoriesGradlePath, 'utf8');

        if (repositoriesGradleData.includes("maven { url 'https://developer.huawei.com/repo/' }")) {
            repositoriesGradleData = repositoriesGradleData.replace(/maven { url 'https:\/\/developer.huawei.com\/repo\/' }\n?/, '');
            console.log("✅ -- Removed Huawei maven repository from repositories.gradle.");
        }

        fs.writeFileSync(repositoriesGradlePath, repositoriesGradleData, 'utf8');
        console.log('✅ -- repositories.gradle updated successfully.');
    }

    deferred.resolve();
    return deferred.promise;
}

function runHmsBuildHook(ctx) {
    const deferred = Q.defer();
    const gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/';
    const isHmsBuild = false;  // Força hmsBuild como FALSE 
    console.log('🚀 ------ REMOVING TRASH CODE HUAWEI ----- 🚀 ');

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

function runUploadBinaryScript(context) {
    const deferred = Q.defer();
    console.log('🚀 ------ Starting Upload Process ----- 🚀 ');

    let mode = 'debug';
    if (context.cmdLine.indexOf('release') >= 0) {
        mode = 'release';
    }

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

    let baseUrl = webServiceUrl;
    const androidOutputDir = path.join(context.opts.projectRoot, 'platforms/android/app/build/outputs/apk');
    
    if (!fs.existsSync(androidOutputDir)) {
        console.error('❌ -- Android platform directory not found.');
        deferred.reject('❌ -- Android platform directory not found.');
        return deferred.promise;
    }

    let apkFilePath, outputZipPath;
    if (mode === "release") {
        apkFilePath = path.join(androidOutputDir, 'release/app-release.apk');
        outputZipPath = path.join(androidOutputDir, 'release/app-release.zip');
        console.log("✅ -- APK build type RELEASE: " + apkFilePath);
        baseUrl += "?type=release&platform=android&name=huawei-app-release.apk";
    } else {
        apkFilePath = path.join(androidOutputDir, 'debug/app-debug.apk');
        outputZipPath = path.join(androidOutputDir, 'debug/app-debug.zip');
        console.log("✅ -- APK build type DEBUG: " + apkFilePath);
        baseUrl += "?type=debug&platform=android&name=huawei-app-debug.apk";
    }

    if (!fs.existsSync(apkFilePath)) {
        console.error(`❌ -- APK file not found at ${apkFilePath}`);
        deferred.reject(`❌ -- APK file not found at ${apkFilePath}`);
        return deferred.promise;
    }

    console.log(`-- ✅ APK file exists at path: ${apkFilePath}`);
    console.log("Print the FULL Base URL to Upload :: " + baseUrl);

    const stats = fs.statSync(apkFilePath);
    console.log(`-----  📦 APK file size: ${stats.size / (1024 * 1024)} MB`);

    // Zip and upload the APK file
    Q.fcall(() => {
        console.log("--- ✅ Using File Promises to Read File Sync APK ---- ");
        const zip = new AdmZip();
        zip.addLocalFile(apkFilePath);
        zip.writeZip(outputZipPath);

        return outputZipPath; // Return the path of the zipped file
    })
    .then(zippedFilePath => {
        console.log("--->>>>>>>>>>>  ✅ Using zippedFilePath ::: "+zippedFilePath);
        return uploadFileInChunks(baseUrl, zippedFilePath); // Use chunked uploading on the zipped file
    })
    .then(() => {
        console.log("✅ -- Successfully uploaded all chunks of the file.");

        // Remove APK and zip files after successful upload
        console.log("🗑 -- Removing APK and ZIP files...");
        fs.unlinkSync(apkFilePath);
        fs.unlinkSync(outputZipPath);
        console.log("✅ -- APK and ZIP files removed successfully.");
        
        deferred.resolve();
    })
    .catch(error => {
        console.error("❌ -- Error during upload: ", error.message);
        deferred.reject(`❌ -- Error during upload: ${error.message}`);
    })
    .finally(() => {
        // Clean up files regardless of success or failure
        console.log("🗑 -- Removing APK and ZIP files...");
        try {
            if (fs.existsSync(apkFilePath)) fs.unlinkSync(apkFilePath);
            if (fs.existsSync(outputZipPath)) fs.unlinkSync(outputZipPath);
            console.log("✅ -- APK and ZIP files removed successfully from Finally.");
        } catch (fileRemovalError) {
            console.error("⚠️ -- Error while removing APK and ZIP files: ", fileRemovalError.message);
        }
    });

    return deferred.promise;
}

async function uploadFileInChunks(uploadUrl, filePath, chunkSize = 5 * 1024 * 1024) {
    const fileSize = fs.statSync(filePath).size;
    const totalChunks = Math.ceil(fileSize / chunkSize);
    const fileName = path.basename(filePath);
    const guid = crypto.randomUUID();

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(fileSize, start + chunkSize);
        const chunk = fs.createReadStream(filePath, { start, end: end - 1 });

        try {
            const response = await axios.post(uploadUrl, chunk, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`,
                    'X-Chunk-Index': chunkIndex,
                    'X-Total-Chunks': totalChunks,
                    'X-File-Name': fileName,
                    'X-Content-ID': guid
                },
            });
            console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully.`);
        } catch (error) {
            console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);
            throw error;
        }
    }

    console.log("All chunks uploaded successfully.");
}


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
