import * as logger from 'firebase-functions/logger';
import { firestore } from '../firebase.js';
import { sendToUser } from '../helpers.js';
import { fullName, isVerified } from './logic.js';

export const usersCollection = () => firestore.collection('users');
export const groupsCollection = () => firestore.collection('challenge_groups');

const NOTHING_SENT = { tokens: 0, successCount: 0, failureCount: 0 };

// Send a challenge-group push to a verified user. Pass `user` when the user
// doc is already loaded. Unverified, opted-out and token-less users are a
// silent no-op. A missing setting counts as opted in.
export const sendToVerifiedUser = async (uid, settingKey, message, user) => {
    const data = user !== undefined ? user : (await usersCollection().doc(uid).get()).data();
    if (!isVerified(data)) {
        logger.info('User is not verified, skipping', { userId: uid, settingKey });
        return NOTHING_SENT;
    }
    return sendToUser(uid, settingKey, message, { defaultWhenMissing: true });
};

// fullName of users/{uid}, or '' if it can't be found.
export const userFullName = async (uid) => {
    if (typeof uid !== 'string' || !uid) return '';
    const snapshot = await usersCollection().doc(uid).get();
    return fullName(snapshot.data());
};
