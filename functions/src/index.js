// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');
admin.initializeApp();

const firestore = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();
const Timestamp = admin.firestore.Timestamp;

module.exports = {
    firestore,
    storage,
    functions,
    messaging,
    Timestamp,
};

/**
 * Features:
 *  - load data
 *  - manage users (See https://firebase.google.com/docs/auth/admin/manage-users#update_a_user managing users)
 *      - verify
 *      - disable
 */