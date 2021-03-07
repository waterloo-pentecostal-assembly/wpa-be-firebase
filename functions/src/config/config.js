const fs = require('fs');
const path = require('path');

exports.getConfig = (env) => {
    if (env === 'local_dev') {
        const serviceAccountFile = path.resolve(__dirname) + '/service-account-dev.json';
        let serviceAccount;

        const clientConfigFile = path.resolve(__dirname) + '/client-config-dev.json';
        let clientConfig;

        // TODO: Use this once Dart auth package is updated to allow app
        // to point to local auth emulator
        // process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
        process.env.FIRESTORE_EMULATOR_HOST = "localhost:8081";

        // Use environment variable if it exists
        if (process.env.SERVICE_ACCOUNT_CREDENTIALS) {
            serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_CREDENTIALS);
        } else if (fs.existsSync(serviceAccountFile)) {
            serviceAccount = serviceAccountFile;
        } else {
            throw new Error('Unable to find service account credentials');
        }

        if (process.env.CLIENT_CONFIG_CREDENTIALS) {
            clientConfig = JSON.parse(process.env.CLIENT_CONFIG_CREDENTIALS);
        } else if (fs.existsSync(clientConfigFile)) {
            clientConfig = JSON.parse(fs.readFileSync(clientConfigFile));
        } else {
            throw new Error('Unable to find client config credentials');
        }

        return {
            databaseUrl: "https://wpa-be-app-dev.firebaseio.com",
            serviceAccount,
            firebaseClientConfig: clientConfig
        };
    }
    else if (env === 'dev') {
        delete process.env.FIRESTORE_EMULATOR_HOST;

        const serviceAccountFile = path.resolve(__dirname) + '/service-account-dev.json';
        let serviceAccount;

        const clientConfigFile = path.resolve(__dirname) + '/client-config-dev.json';
        let clientConfig;

        // Use environment variable if it exists
        if (process.env.SERVICE_ACCOUNT_CREDENTIALS) {
            serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_CREDENTIALS);
        } else if (fs.existsSync(serviceAccountFile)) {
            serviceAccount = path.resolve(__dirname) + '/service-account-dev.json';
        } else {
            throw new Error('Unable to find service account credentials');
        }

        if (process.env.CLIENT_CONFIG_CREDENTIALS) {
            clientConfig = JSON.parse(process.env.CLIENT_CONFIG_CREDENTIALS);
        } else if (fs.existsSync(clientConfigFile)) {
            clientConfig = JSON.parse(fs.readFileSync(clientConfigFile));
        } else {
            throw new Error('Unable to find client config credentials');
        }

        return {
            databaseUrl: "https://wpa-be-app-dev.firebaseio.com",
            serviceAccount,
            firebaseClientConfig: clientConfig
        };
    } else if (env === 'prod') {
        delete process.env.FIRESTORE_EMULATOR_HOST;

        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname) + '/service-account.json';

        const clientConfigFile = path.resolve(__dirname) + '/client-config.json';
        let clientConfig = JSON.parse(fs.readFileSync(clientConfigFile));

        return {
            databaseUrl: "https://wpa-be-app.firebaseio.com",
            serviceAccount: path.resolve(__dirname) + '/service-account.json',
            firebaseClientConfig: clientConfig
        };
    } else {
        throw new Error(`invalid env: ${env}`);
    }
};