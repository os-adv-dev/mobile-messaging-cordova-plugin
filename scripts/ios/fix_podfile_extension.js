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

            var addedExtension = addExtensionTargetToPodfile(podfilePath, projectName, mmVersion);
            var addedPostInstall = addPostInstallHookToPodfile(podfilePath);

            if (addedExtension || addedPostInstall) {
                runPodInstall(iosPlatformPath);
            }

            fixXcodeProjectOrdering(iosPlatformPath, projectName);
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
        return false;
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
    return true;
}

function addPostInstallHookToPodfile(podfilePath) {
    var podfileContent = fs.readFileSync(podfilePath, 'utf-8');
    if (podfileContent.indexOf("post_install do |installer|") !== -1) {
        console.log('Infobip: post_install block already in Podfile.');
        return false;
    }

    var postInstallBlock = "\npost_install do |installer|\n" +
        "  installer.pods_project.targets.each do |target|\n" +
        "    if target.name == 'MobileMessaging' || target.name == 'MobileMessagingNotificationExtension'\n" +
        "      target.build_configurations.each do |config|\n" +
        "        config.build_settings['SWIFT_VERSION'] = '6'\n" +
        "      end\n" +
        "    end\n" +
        "  end\n" +
        "end\n";

    podfileContent += postInstallBlock;
    fs.writeFileSync(podfilePath, podfileContent, 'utf-8');
    console.log('Infobip: Added post_install hook to Podfile for SWIFT_VERSION');
    return true;
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

function fixXcodeProjectOrdering(iosPlatformPath, projectName) {
    var xcodeProjectPath = path.join(iosPlatformPath, projectName + '.xcodeproj', 'project.pbxproj');
    if (!fs.existsSync(xcodeProjectPath)) return;

    var pbxContent = fs.readFileSync(xcodeProjectPath, 'utf-8');
    var sectionStartMarker = '/* Begin XCBuildConfiguration section */';
    var sectionEndMarker = '/* End XCBuildConfiguration section */';
    var sectionStart = pbxContent.indexOf(sectionStartMarker);
    var sectionEnd = pbxContent.indexOf(sectionEndMarker);
    if (sectionStart === -1 || sectionEnd === -1) return;

    var sectionContent = pbxContent.substring(sectionStart + sectionStartMarker.length, sectionEnd);
    var blockPattern = /(\t\t[0-9A-Fa-f]{24}\s+\/\*[^*]*\*\/\s+=\s+\{[\s\S]*?\n\t\t\};)/g;
    var blocks = [];
    var m;
    while ((m = blockPattern.exec(sectionContent)) !== null) {
        blocks.push(m[1]);
    }
    if (blocks.length === 0) return;

    var mainInfoPlist = projectName + '-Info.plist';
    var mainBlocks = [];
    var otherBlocks = [];

    blocks.forEach(function (block) {
        if (block.indexOf(mainInfoPlist) !== -1) {
            mainBlocks.push(block);
        } else {
            otherBlocks.push(block);
        }
    });

    if (mainBlocks.length === 0) return;

    var reorderedSection = '\n' + mainBlocks.concat(otherBlocks).join('\n') + '\n';
    var before = pbxContent.substring(0, sectionStart + sectionStartMarker.length);
    var after = pbxContent.substring(sectionEnd);

    fs.writeFileSync(xcodeProjectPath, before + reorderedSection + after, 'utf-8');
    console.log('Infobip: Corrected build configuration ordering in project.pbxproj');
}
