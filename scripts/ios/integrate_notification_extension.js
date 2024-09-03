const fs = require('fs');
const { exec } = require('child_process');
const parseString = require('xml2js').parseString;
const path = require('path');

function getProjectName() {
    const config = fs.readFileSync('config.xml').toString();
    let name;
    parseString(config, function (err, result) {
        if (err) {
            throw new Error(`Error parsing config.xml: ${err.message}`);
        }
        name = result.widget.name[0].trim();
    });
    return name || null;
}

module.exports = function(ctx) {
    const completionFilePath = path.join(ctx.opts.projectRoot, 'target_addition_complete');

    var ConfigParser = ctx.requireCordovaModule('cordova-common').ConfigParser;
    var appConfig = new ConfigParser('config.xml');
    var pluginConfig = appConfig.getPlugin(ctx.opts.plugin.id);

    const args = process.argv;
    var iosExtensionAppCode;
    var iosExtensionAppGroup;
    for (const arg of args) {
        if (arg.includes('IOS_EXTENSION_APP_CODE')) {
            const stringArray = arg.split("=");
            iosExtensionAppCode = stringArray.slice(-1).pop();
        }
        if (arg.includes('IOS_EXTENSION_APP_GROUP')) {
            const stringArray = arg.split("=");
            iosExtensionAppGroup = stringArray.slice(-1).pop();
        }
    }

    console.log(" --- ✅ --- Variables --- IOS_EXTENSION_APP_GROUP: " + iosExtensionAppGroup);
    console.log(" --- ✅ --- Variables --- IOS_EXTENSION_APP_CODE: " + iosExtensionAppCode);

    var appCode = iosExtensionAppCode;
    var appGroup = iosExtensionAppGroup;
    var projectPath = `platforms/ios/${getProjectName()}.xcodeproj`;
    var projectMainTarget = getProjectName();
    var overrideSigning = false;

    console.log(" --- ✅ --- Variables --- projectPath: " + projectPath);
    console.log(" --- ✅ --- Variables --- projectMainTarget: " + projectMainTarget);
    console.log(" --- ✅ --- Variables --- overrideSigning: " + overrideSigning);

    if (!(appCode && appGroup && projectPath && projectMainTarget)) {
        console.log("ERROR: 'IOS_EXTENSION_APP_CODE' or 'IOS_EXTENSION_APP_GROUP' or 'IOS_EXTENSION_PROJECT_PATH' or 'IOS_EXTENSION_PROJECT_MAIN_TARGET' not defined");
        console.log('-----------------------------');
        return;
    }

    var command = `export GEM_HOME=plugins/${ctx.opts.plugin.id}/gems; \
                   gem install --install-dir plugins/${ctx.opts.plugin.id}/gems mmine -v 0.13.0; \
                   ./plugins/${ctx.opts.plugin.id}/gems/bin/mmine integrate -a ${appCode} \
                   -p "${ctx.opts.projectRoot}/${projectPath}" \
                   -t "${projectMainTarget}" \
                   -g ${appGroup} \
                   -c`;

    if (overrideSigning === "true") {
        command += ' -s';
    }

    console.log("Command:  " + command);

    var exec = require('child_process').exec, child;
    child = exec(command, { maxBuffer: 1024 * 1024 }, function (error, stdout, stderr) {
        if (stdout) {
            console.log('stdout: ' + stdout);
        }
        if (stderr) {
            console.log('stderr: ' + stderr);
        }
        if (error !== null) {
            console.log('exec error: ' + error);
            return;
        }
        console.log("Target integration completed successfully.");
        // Create a completion file
        fs.writeFileSync(completionFilePath, 'done');
    });

    // Ensure proper logging during long-running process
    child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    child.on('close', (code) => {
        if (code !== 0) {
            console.log(`Process exited with code: ${code}`);
        } else {
            console.log("Target integration process closed successfully.");
        }
    });
}
