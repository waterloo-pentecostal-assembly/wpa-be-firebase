import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import { getConfig } from './config/config.js';
// import * as params from 'firebase-functions/params';

// Trigger this to ensure config is loaded
// In v2 we prefer using params but to keep backward compat with the existing config logic:
// We need to know the 'env'.
// In v1 it was functions.config().app.env
// In v2, we should use defineString or process.env.
// For now, let's try to read it from process.env if set, or default.
// But the existing code relies on `functions.config()`.
// Warning: `functions.config()` is available in v2 but discouraged.
// Let's assume we use an environment variable 'APP_ENV' for v2.

const env = process.env.APP_ENV || 'local_dev';
// NOTE: We might need to set this env var in .env files or deploy command.

const config = getConfig(env);

const app = initializeApp({
    credential: cert(config.serviceAccount),
    storageBucket: config.storageBucket
});

export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const auth = getAuth(app);
export const storageBucket = config.storageBucket;
export const admin = app;

// For client SDK (used in email verification)
import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth as getClientAuth } from 'firebase/auth';

const clientApp = initClientApp(config.firebaseClientConfig);
export const clientAuth = getClientAuth(clientApp);
