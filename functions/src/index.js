// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');
const client = require('firebase');

firebaseConfig = functions.config();
const env = firebaseConfig.app.env;

const config = require("./config/config").getConfig('prod');

admin.initializeApp({ 
    credential: admin.credential.cert(config.serviceAccount),
    storageBucket: "wpa-be-app.appspot.com"
});

client.initializeApp(config.firebaseClientConfig);

const firestore = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();
const auth = admin.auth();

module.exports = {
    firestore,
    storage,
    functions,
    messaging,
    admin,
    auth,
    client
};

