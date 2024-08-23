#!/usr/bin/env node

var Q = require('./q.js');
var fs = require('fs');
var path = require('path');
var gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/';

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

    const platformRoot = path.join(ctx.opts.projectRoot, 'platforms/android');
    const buildGradlePath = path.join(platformRoot, 'app/build.gradle');
    const repositoriesGradlePath = path.join(platformRoot, 'app/repositories.gradle');
    console.log(" -- buildGradlePath: "+buildGradlePath);
    console.log(" -- repositoriesGradlePath: "+repositoriesGradlePath);

    var args = process.argv.slice(2);
    var hmsBuild = args.includes("--hms");
    console.log("-- ✅ Huawei Add Extra Dependencies HMS Build:  " + hmsBuild);

    if(hmsBuild) {
        // Read the build.gradle file
        fs.readFile(buildGradlePath, 'utf8', (err, data) => {
            if (err) {
                throw new Error('Unable to read build.gradle file: ' + err);
            }

            let updatedData = data;

            // Check if the plugin is already added
            if (!data.includes("apply plugin: 'com.huawei.agconnect'")) {
                // Insert the plugin after 'com.android.application'
                updatedData = updatedData.replace(/apply plugin: 'com.android.application'/,
                    "apply plugin: 'com.android.application'\napply plugin: 'com.huawei.agconnect'");
            } else {
                console.log('Huawei AGConnect plugin already applied.');
            }

            // Check if the classpath is already added
            if (!data.includes("classpath 'com.huawei.agconnect:agcp:1.6.0.300'")) {
                // Insert the classpath after the AGP classpath
                updatedData = updatedData.replace(/classpath "com.android.tools.build:gradle:\${cordovaConfig.AGP_VERSION}"/,
                    'classpath "com.android.tools.build:gradle:${cordovaConfig.AGP_VERSION}"\n        classpath \'com.huawei.agconnect:agcp:1.6.0.300\'');
            } else {
                console.log('Huawei AGConnect classpath already added.');
            }

            // Write the changes back to build.gradle if any changes were made
            if (updatedData !== data) {
                fs.writeFile(buildGradlePath, updatedData, 'utf8', (err) => {
                    if (err) {
                        throw new Error('Unable to write to build.gradle file: ' + err);
                    }
                    console.log('Huawei AGConnect plugin and/or classpath added successfully.');
                });
            }
        });

        // Read the repositories.gradle file
        fs.readFile(repositoriesGradlePath, 'utf8', (err, data) => {
            if (err) {
                throw new Error('Unable to read repositories.gradle file: ' + err);
            }

            // Check if the Huawei maven repository is already added
            if (data.includes("https://developer.huawei.com/repo/")) {
                console.log('Huawei Maven repository already added.');
            } else {
                // Insert the Huawei Maven repository below mavenCentral()
                const result = data.replace(/mavenCentral\(\)/, 
                    "mavenCentral()\nmaven { url 'https://developer.huawei.com/repo/' }");

                // Write the changes back to repositories.gradle
                fs.writeFile(repositoriesGradlePath, result, 'utf8', (err) => {
                    if (err) {
                        throw new Error('Unable to write to repositories.gradle file: ' + err);
                    }
                    console.log('Huawei Maven repository added successfully below mavenCentral().');
                });
            }
        });

    } else {
        console.log("-- ✅ No Huawei Build , Skipping plugin addition - HMS Build:" + hmsBuild);
    }

};