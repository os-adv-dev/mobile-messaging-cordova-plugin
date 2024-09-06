#!/usr/bin/env node

// Credit: https://gist.github.com/kkleokrish/ac794fc3280bf23e81cce9b6a7f138f9
// Define hook in your config <hook src="scripts/cordova-classpath-deps-fix.js" type="before_prepare" />

var Q = require('./q.js');
var fs = require('fs');
var path = require('path');
var readline = require("readline");
var resourcesRelativeRoots = [
    'platforms/android/app/src/main/res/values', // cordova 8
    'platforms/android/res/values'               // cordova 7
];

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

    var args = process.argv.slice(2);
    var hmsBuild = true; // In this case it is always TRUE because I am forcing build Huawei.
    if (hmsBuild) {
        console.log("HMS enabled. Start checking app_id");
        return updateConfig("HUAWEI_SENDER_ID", "app_id");
    }

    function updateConfig(appIdParamName, configParamName) {

        var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
        var pluginConfig = new ConfigParser('config.xml').getPlugin(ctx.opts.plugin.id);

        const projectRoot = ctx.opts.projectRoot;
        const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
        console.log(" ✅ -- get file huawei info to build: "+jsonFilePath);

        // Check if the Huawei JSON file exists
        if (!fs.existsSync(jsonFilePath)) {
            throw new Error(`HUAWEI file info JSON file not found at ${jsonFilePath}`);
        }

        // Read the JSON file
        const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

        const { huaweiSenderId } = huaweiInfo;
        console.log(" ✅ -- after read Json file huaweiSenderId: "+huaweiSenderId);

        if (huaweiSenderId === undefined) {
            console.log("ERROR: Missing plugin variables. It's required to provide '" + appIdParamName + "'");
            console.log('-----------------------------');
            return;
        }
        
        var providedStringsXmlPath = ctx.opts.options.ANDROID_STRINGS_XML_RELATIVE_PATH;
        console.log(" ✅ -- providedStringsXmlPath: "+providedStringsXmlPath);

        var appId = huaweiSenderId;
        console.log("-- ✅ -- appId: "+appId);
        if (!appId) {
            console.log("ERROR: '" + appIdParamName + "' not defined");
            console.log('-----------------------------');
            return;
        }

        console.log('-----------------------------');
        console.log('Cordova ' + appIdParamName + ' fix');

        var resourcesRelativeRoot = providedStringsXmlPath || resourcesRelativeRoots.find(function(relativePath) {
            return fs.existsSync(path.join(ctx.opts.projectRoot, relativePath));
        });

        if (!resourcesRelativeRoot) {
            console.log('ERROR: cannot find `strings.xml` for android platform, firebase integration might be broken. Please supply path to `strings.xml` relative to your project root via `ANDROID_STRINGS_XML_RELATIVE_PATH` plugin parameter.');
            console.log('-----------------------------');
            return;
        }

        var deferred = Q.defer();
        var resourcesRoot = path.join(ctx.opts.projectRoot, resourcesRelativeRoot);
        var strings = path.join(resourcesRoot, 'strings.xml');
        console.log(strings);
        fs.readFile(strings, 'utf8', function (err,data) {
            if (err) {
                console.log(err);
                deferred.reject(err);
                return;
            }

            // check if already there
            var re = new RegExp("(\\\"" + configParamName + ")", 'g');
            if (data.match(re)) {
                console.log('complete, no changes needed');
                console.log('-----------------------------');
                deferred.resolve();
                return;
            }

            var result = data.replace(/(\<\/resources\>)/,
                '    <string name=\"' + configParamName + '\">' + appId + '</string>\n$1');

            fs.writeFile(strings, result, 'utf8', function (err) {
                if (err) {
                    console.log('error');
                    console.log('-----------------------------');
                    deferred.reject(err);
                }
                console.log('complete');
                console.log('-----------------------------');
                deferred.resolve();
            });
        });

        return deferred.promise;
    }
};
