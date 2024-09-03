"use strict";

const path = require("path");
const AdmZip = require("adm-zip");
const fs = require('fs');

var {
    isCordovaAbove, 
    getPlatformConfigs, 
    getResourcesFolderPath, 
    getZipFile, 
    getFilesFromPath, 
    log,
    copyFromSourceToDestPath,
    checkIfFolderExists
} = require("../utils");

var constants = {
  osTargetFolder: "provisioning-profiles"
};

module.exports = function(context) {
    log('⭐️ Started copying provisioning profiles!', 'start');
    var cordovaAbove8 = isCordovaAbove(context, 8);
    var cordovaAbove7 = isCordovaAbove(context, 7);
    var defer;
    if (cordovaAbove8) {
        defer = require('q').defer();
    } else {
        defer = context.requireCordovaModule("q").defer();
    }

    var platform = context.opts.plugin.platform;
    var platformConfig = getPlatformConfigs(platform);
    if (!platformConfig) {
        log("🚨 Invalid platform", "error")
        defer.reject();
    }

    var wwwPath = getResourcesFolderPath(context, platform, platformConfig);
    var sourceFolderPath;

    sourceFolderPath = path.join(context.opts.projectRoot, "www", constants.osTargetFolder);

    var provisioningProfilesZipFile = getZipFile(sourceFolderPath, constants.osTargetFolder);
    if (!provisioningProfilesZipFile) {
        log("🚨 No zip file found containing provisioning profiles", "error")
        defer.reject();
    }

    var zip = new AdmZip(provisioningProfilesZipFile);

    var targetPath = path.join(wwwPath, constants.osTargetFolder);
    zip.extractAllTo(targetPath, true);

    var files = getFilesFromPath(targetPath);
    if (!files) {
        tils.log("🚨 No directory found: ", "error")
        defer.reject();
    }

    var fileName = files.find(function (name) {
        return name.endsWith('.mobileprovision');
    });
    if (!fileName) {
        log("🚨 No file found: ", "error")
        defer.reject();
    }

    var sourceFilePath = path.join(targetPath, fileName);
    var destFolderPath = path.join(context.opts.plugin.dir, constants.osTargetFolder);
    var destFilePath = path.join(context.opts.plugin.dir, constants.osTargetFolder, fileName);

    // Create the directory if it does not exist
    fs.mkdir(destFolderPath, { recursive: false }, (error) => {
      if (error) {
        console.error('🚨 Error creating directory:', error);
      } else {
        console.log('👍 provisioning-profiles directory created successfully (or already exists)');
      }
    });

    copyFromSourceToDestPath(defer, sourceFilePath, destFilePath);

    var destPath = path.join(context.opts.projectRoot, "platforms", platform, "app");
    if (checkIfFolderExists(destPath)) {
        var destFilePath = path.join(destPath, fileName);
        copyFromSourceToDestPath(defer, sourceFilePath, destFilePath);
    }
        
    log('✅ Successfully copied provisioning profiles! ', 'success');
    return defer.promise;
}