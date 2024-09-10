const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

module.exports = function (context) {
    console.log('✅ -- Executing Hook to copy build.json and android.keystore to platforms/android/huawei-keystore');

    const projectRoot = context.opts.projectRoot;

    // Caminho dos arquivos de origem
    const keysPath = path.join(projectRoot, 'keys');
    const buildJsonPath = path.join(keysPath, 'build.json');
    const keystorePath = path.join(keysPath, 'android.keystore');

    // Caminho de destino
    const platformAndroidPath = path.join(projectRoot, 'platforms/android');
    const huaweiKeystorePath = path.join(platformAndroidPath, 'huawei-keystore');

    // Verifica se o arquivo build.json existe
    if (!fs.existsSync(buildJsonPath)) {
        console.error(`❌ -- File build.json not found at ${buildJsonPath}`);
        return;
    }

    // Verifica se o arquivo android.keystore existe
    if (!fs.existsSync(keystorePath)) {
        console.error(`❌ -- File android.keystore not found at ${keystorePath}`);
        return;
    }

    // Lê o conteúdo do build.json e exibe no console
    const buildJsonContent = fs.readFileSync(buildJsonPath, 'utf8');
    console.log('📂 -- Content of build.json:');
    console.log(buildJsonContent);

    // Cria a pasta huawei-keystore dentro de platforms/android caso não exista
    if (!fs.existsSync(huaweiKeystorePath)) {
        shell.mkdir('-p', huaweiKeystorePath);
        console.log(`📁 -- Created directory: ${huaweiKeystorePath}`);
    }

    // Copia build.json e android.keystore para a pasta huawei-keystore
    shell.cp(buildJsonPath, huaweiKeystorePath);
    shell.cp(keystorePath, huaweiKeystorePath);
    console.log(`✅ -- Copied build.json and android.keystore to ${huaweiKeystorePath}`);

    // Verifica e lê os arquivos de signing properties dentro de platforms/android
    const debugSigningPath = path.join(platformAndroidPath, 'debug-signing.properties');
    const releaseSigningPath = path.join(platformAndroidPath, 'release-signing.properties');

    // Função para ler e exibir o conteúdo dos arquivos de signing properties
    function readAndLogSigningFile(filePath, fileType) {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            console.log(`📂 -- Content of ${fileType}:`);
            console.log(fileContent);
        } else {
            console.warn(`⚠️ -- ${fileType} not found at ${filePath}`);
        }
    }
    // Ler e exibir os arquivos debug-signing.properties e release-signing.properties
    readAndLogSigningFile(debugSigningPath, 'debug-signing.properties');
    readAndLogSigningFile(releaseSigningPath, 'release-signing.properties');
};