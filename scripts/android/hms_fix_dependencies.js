#!/usr/bin/env node

var Q = require('./q.js');
var fs = require('fs');
var path = require('path');
var gradleRelativePath = 'platforms/android/com-infobip-plugins-mobilemessaging/';

module.exports = function(ctx) {

    if (ctx.opts.platforms.indexOf('android') < 0) {
        return;
    }

    var args = process.argv.slice(2);

    // Get variables from huawei_info.json file
    const projectRoot = ctx.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');
    if (fs.existsSync(jsonFilePath) === false) {
        console.error(`❌ -- Huawei info JSON file not found at ${jsonFilePath}`);
        return;
    }
    console.log("✅ -- Reading Huawei info from file: " + jsonFilePath);

    const huaweiInfo = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { isBuildHuawei } = huaweiInfo;
    var hmsBuild = isBuildHuawei;

    console.log(" ✅ ---- SET HMS Build TRUE :  " + hmsBuild);

    function updateIsHmsBuild(isHmsBuild) {
        var deferred = Q.defer();

        var dirContent = fs.readdirSync( gradleRelativePath );
        for (var i = 0; i < dirContent.length; i++) {
            var gradlePath = path.join(ctx.opts.projectRoot, gradleRelativePath, dirContent[i]);
            console.log('Try to fix FCM/HMS dependencies at path:' + gradlePath);
            fs.readFile(gradlePath, 'utf8', function (err,data) {
                if (err) {
                    console.log(err);
                    deferred.reject(err);
                    return;
                }

                var search = "def isHmsBuild = " + (!isHmsBuild);
                var replace = "def isHmsBuild = " + isHmsBuild;
                var result = data.replace(new RegExp(search,"g"), replace);

                fs.writeFile(gradlePath, result, 'utf8', function (err) {
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
        }

        return deferred.promise;
    }

    if (hmsBuild) {
        return updateIsHmsBuild(true);
    } else {
        return updateIsHmsBuild(false);
    }
}