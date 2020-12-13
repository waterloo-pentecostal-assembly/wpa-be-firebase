// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');
admin.initializeApp();

const firestore = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();

module.exports = {
    firestore,
    storage,
    functions,
    messaging,
};
