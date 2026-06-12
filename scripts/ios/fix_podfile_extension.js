#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var EXTENSION_NAME = 'MobileMessagingNotificationServiceExtension';

module.exports = function (ctx) {
    return new Promise((resolve, reject) => {
        try {
            if (ctx.opts.platforms.indexOf('ios') < 0) {
                resolve();
                return;
            }

            var projectRoot = ctx.opts.projectRoot;
            var iosPlatformPath = path.join(projectRoot, 'platforms', 'ios');
            var podfilePath = path.join(iosPlatformPath, 'Podfile');

            if (!fs.existsSync(podfilePath)) {
                console.log('WARNING: Podfile not found at ' + podfilePath);
                resolve();
                return;
            }

            // Get project name from config.xml
            var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
            var config = new ConfigParser('config.xml');
            var projectName = config.name().normalize('NFD');

            // Get MobileMessaging version from plugin.xml
            var pluginDir = ctx.opts.plugin ? ctx.opts.plugin.dir : path.join(projectRoot, 'plugins', 'com-infobip-plugins-mobilemessaging');
            var mmVersion = getMobileMessagingVersion(pluginDir);

            addExtensionTargetToPodfile(podfilePath, projectName, mmVersion);
            resolve();
        } catch (error) {
            console.error('Error in fix_podfile_extension.js:', error);
            reject(error);
        }
    });
};

function getMobileMessagingVersion(pluginDir) {
    var pluginXmlPath = path.join(pluginDir, 'plugin.xml');
    if (!fs.existsSync(pluginXmlPath)) return null;

    var content = fs.readFileSync(pluginXmlPath, 'utf-8');
    var match = content.match(/<pod\s+name="MobileMessaging"\s+spec="([^"]+)"/);
    return match ? match[1] : null;
}

function addExtensionTargetToPodfile(podfilePath, projectName, mmVersion) {
    var podfileContent = fs.readFileSync(podfilePath, 'utf-8');

    // Check if extension target already exists
    if (podfileContent.indexOf("target '" + EXTENSION_NAME + "'") !== -1) {
        console.log('Infobip: Extension target already in Podfile, skipping.');
        return;
    }

    var podLine = mmVersion
        ? "\tpod 'MobileMessagingNotificationExtension', '" + mmVersion + "'\n"
        : "\tpod 'MobileMessagingNotificationExtension'\n";

    var extensionBlock = "\ntarget '" + EXTENSION_NAME + "' do\n" +
        "\tproject '" + projectName + ".xcodeproj'\n" +
        podLine +
        "end\n";

    podfileContent += extensionBlock;
    fs.writeFileSync(podfilePath, podfileContent, 'utf-8');
    console.log('Infobip: Re-added extension target to Podfile (after Cordova regeneration)');

    // Run pod install to install the extension pod
    runPodInstall(path.dirname(podfilePath));
}

function runPodInstall(iosPlatformPath) {
    var execSync = require('child_process').execSync;
    try {
        console.log('Infobip: Running pod install for extension target...');
        execSync('pod install', { cwd: iosPlatformPath, stdio: 'inherit' });
        console.log('Infobip: Pod install completed for extension target');
    } catch (e) {
        console.log('WARNING: pod install failed: ' + (e.message || e) + '. Run manually in: ' + iosPlatformPath);
    }
}
