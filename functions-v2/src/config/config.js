import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dev credentials come from env vars (CI) or local JSON files.
function loadDevCredentials() {
    const serviceAccountFile = path.resolve(__dirname, 'service-account-dev.json');
    let serviceAccount;

    const clientConfigFile = path.resolve(__dirname, 'client-config-dev.json');
    let clientConfig;

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
        clientConfig = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));
    } else {
        throw new Error('Unable to find client config credentials');
    }

    return {
        databaseUrl: 'https://wpa-be-app-dev.firebaseio.com',
        serviceAccount,
        firebaseClientConfig: clientConfig
    };
}

export function getConfig(env) {
    if (env === 'local_dev') {
        // process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

        return {
            ...loadDevCredentials(),
            storageBucket: ''
        };
    } else if (env === 'dev') {
        delete process.env.FIRESTORE_EMULATOR_HOST;

        return {
            ...loadDevCredentials(),
            storageBucket: 'wpa-be-app-dev.appspot.com'
        };
    } else if (env === 'prod') {
        delete process.env.FIRESTORE_EMULATOR_HOST;

        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, 'service-account.json');

        const clientConfigFile = path.resolve(__dirname, 'client-config.json');
        const clientConfig = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));

        const storageBucket = 'wpa-be-app.appspot.com';

        return {
            databaseUrl: 'https://wpa-be-app.firebaseio.com',
            serviceAccount: path.resolve(__dirname, 'service-account.json'),
            firebaseClientConfig: clientConfig,
            storageBucket: storageBucket
        };
    } else {
        throw new Error(`invalid env: ${env}`);
    }
}
