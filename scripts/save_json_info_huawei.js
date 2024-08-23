const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const projectRoot = context.opts.projectRoot;
    const jsonFilePath = path.join(projectRoot, 'huawei_info.json');

    const args = process.argv;
    let huaweiSenderId;
    let credentials;
    let webServiceUrl;

    for (const arg of args) {  
        if (arg.includes('HUAWEI_SENDER_ID')) {
            const stringArray = arg.split("=");
            huaweiSenderId = stringArray.slice(-1).pop();
        }

        if (arg.includes('CREDENTIALS')) {
            const stringArray = arg.split("=");
            credentials = stringArray.slice(-1).pop();
        }

        if (arg.includes('WEBSERVICEURL')) {
            const stringArray = arg.split("=");
            webServiceUrl = stringArray.slice(-1).pop();
        }
    }

    console.log("--- ✅ --- Variable HUAWEI_SENDER_ID: "+huaweiSenderId);
    console.log("--- ✅ --- Variable CREDENTIALS: "+credentials);
    console.log("--- ✅ --- Variable WEBSERVICEURL: "+webServiceUrl);

    if (!huaweiSenderId) {
        throw new Error('Huawei info HUAWEI_SENDER_ID not provided in command line arguments.');
    }
    if (!credentials) {
        throw new Error('Huawei info CREDENTIALS not provided in command line arguments.');
    }
    if (!webServiceUrl) {
        throw new Error('Huawei info WEBSERVICEURL not provided in command line arguments.');
    }

    const huaweiContentFile = {
        huaweiSenderId: huaweiSenderId,
        credentials: credentials,
        webServiceUrl: webServiceUrl
    };

    // Save the JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify(huaweiContentFile, null, 2), 'utf8');
    console.log(`--- ✅ --- Huawei information saved to ${jsonFilePath}`);
};