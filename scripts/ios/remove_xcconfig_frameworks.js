#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;

    // Path to xcconfig files for the Notification Extension target
    const xcconfigPaths = [
        path.join(projectRoot, 'platforms', 'ios', 'Pods', 'Target Support Files', 'Pods-MobileMessagingNotificationExtension', 'Pods-MobileMessagingNotificationExtension.debug.xcconfig'),
        path.join(projectRoot, 'platforms', 'ios', 'Pods', 'Target Support Files', 'Pods-MobileMessagingNotificationExtension', 'Pods-MobileMessagingNotificationExtension.release.xcconfig')
    ];

    // Unwanted frameworks to remove
    const unwantedFrameworks = [
        'CocoaLumberjack',
        'FLEX',
        'PureeOS',
        'YapDatabase'
    ];

    // Function to remove frameworks from xcconfig content
    const removeFrameworks = (content) => {
        unwantedFrameworks.forEach(framework => {
            const frameworkRegex = new RegExp(`.*${framework}.*\\n`, 'g');
            content = content.replace(frameworkRegex, '');
        });
        return content;
    };

    // Modify each xcconfig file
    xcconfigPaths.forEach(xcconfigPath => {
        if (fs.existsSync(xcconfigPath)) {
            let xcconfigContent = fs.readFileSync(xcconfigPath, 'utf8');
            xcconfigContent = removeFrameworks(xcconfigContent);
            fs.writeFileSync(xcconfigPath, xcconfigContent, 'utf8');
            console.log(`Updated ${xcconfigPath}`);
        }
    });
};