import * as logger from 'firebase-functions/logger';
import { firestore, messaging } from './firebase.js';
import { deadTokens, errorDetails, settingEnabled, tokenFailures } from './utils.js';

const userRef = (userId) => firestore.collection('users').doc(userId);

// Device doc IDs are the FCM tokens.
export const getDeviceTokens = async (userId) => {
    const snapshot = await userRef(userId).collection('devices').get();
    return snapshot.docs.map((doc) => doc.id);
};

// A user has a single notification_settings doc; null if not created yet.
export const getNotificationSettings = async (userId) => {
    const snapshot = await userRef(userId).collection('notification_settings').get();
    return snapshot.empty ? null : snapshot.docs[0].data();
};

// Device tokens for a user who has `settingKey` turned on, otherwise [].
// A user with no settings doc gets nothing. With defaultWhenMissing, a
// missing `settingKey` counts as on (see settingEnabled).
export const getOptedInDeviceTokens = async (userId, settingKey, { defaultWhenMissing = false } = {}) => {
    const settings = await getNotificationSettings(userId);
    if (!settingEnabled(settings, settingKey, defaultWhenMissing)) {
        logger.info('User has not enabled notification setting, skipping', { userId, settingKey });
        return [];
    }

    const tokens = await getDeviceTokens(userId);
    if (tokens.length === 0) {
        logger.info('User has no device tokens, skipping', { userId });
    }
    return tokens;
};

// Most recent active bible series doc, or null if none is active.
export const getActiveBibleSeries = async () => {
    const snapshot = await firestore
        .collection('bible_series')
        .where('is_active', '==', true)
        .orderBy('start_date', 'desc')
        .limit(1)
        .get();
    return snapshot.empty ? null : snapshot.docs[0];
};

// The series the app shows as current: the newest visible series by
// start_date (same query as the app). Null unless that series is active.
export const currentActiveSeries = async () => {
    const snapshot = await firestore
        .collection('bible_series')
        .where('is_visible', '==', true)
        .orderBy('start_date', 'desc')
        .limit(1)
        .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    if (data.is_active !== true) return null;
    return {
        id: doc.id,
        title: typeof data.title === 'string' ? data.title.trim() : '',
        startDate: data.start_date?.toDate ? data.start_date.toDate() : null
    };
};

// Subscribe (or unsubscribe) tokens to each topic. Every topic is attempted
// even if one FCM call fails.
export const updateTopicSubscriptions = async (tokens, topics, subscribe) => {
    const action = subscribe ? 'subscribeToTopic' : 'unsubscribeFromTopic';
    for (const topic of topics) {
        try {
            const response = await messaging[action](tokens, topic);
            if (response.failureCount > 0) {
                logger.warn(`${action} failed for some tokens`, {
                    topic,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                    failures: tokenFailures(response)
                });
            } else {
                logger.info(action, { topic, successCount: response.successCount });
            }
        } catch (error) {
            logger.error(`${action} failed`, { topic, error: errorDetails(error) });
        }
    }
};

// Send a message built with buildNotification({ topic, ... }).
export const sendToTopic = async (message) => {
    const { topic } = message;
    const { notificationType } = message.data;
    try {
        const messageId = await messaging.send(message);
        logger.info('Sent topic notification', { notificationType, topic, messageId });
    } catch (error) {
        logger.error('Error sending topic notification', { notificationType, topic, error: errorDetails(error) });
    }
};

// Send a message built with buildNotification() to specific devices.
export const sendToDevices = async (tokens, message) => {
    const { notificationType } = message.data;
    try {
        const response = await messaging.sendEachForMulticast({ ...message, tokens });
        const summary = {
            notificationType,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
        if (response.failureCount > 0) {
            logger.warn('Device notification failed for some tokens', { ...summary, failures: tokenFailures(response) });
        } else {
            logger.info('Sent device notification', summary);
        }
    } catch (error) {
        logger.error('Error sending device notification', { notificationType, error: errorDetails(error) });
    }
};

// Delete device docs for tokens FCM says are permanently invalid. Best effort:
// failures are logged, never thrown.
const removeDeadTokens = async (userId, tokens, response) => {
    const dead = deadTokens(tokens, response);
    if (dead.length === 0) return;
    try {
        const devices = userRef(userId).collection('devices');
        await Promise.all(dead.map((token) => devices.doc(token).delete()));
        logger.info('Removed dead device tokens', { userId, count: dead.length });
    } catch (error) {
        logger.error('Error removing dead device tokens', { userId, error: errorDetails(error) });
    }
};

// Send a message built with buildNotification() to one user's opted-in
// devices and remove dead tokens. Having no tokens, or being opted out, is a
// silent no-op. Unlike sendToDevices, an unexpected FCM error is thrown so the
// caller can react (per-token failures are reported in the response, not
// thrown). Returns { tokens, successCount, failureCount }.
export const sendToUser = async (userId, settingKey, message, { defaultWhenMissing = false } = {}) => {
    const tokens = await getOptedInDeviceTokens(userId, settingKey, { defaultWhenMissing });
    if (tokens.length === 0) return { tokens: 0, successCount: 0, failureCount: 0 };

    const { notificationType } = message.data;
    const response = await messaging.sendEachForMulticast({ ...message, tokens });
    const summary = {
        userId,
        notificationType,
        successCount: response.successCount,
        failureCount: response.failureCount
    };
    if (response.failureCount > 0) {
        logger.warn('User notification failed for some tokens', { ...summary, failures: tokenFailures(response) });
        await removeDeadTokens(userId, tokens, response);
    } else {
        logger.info('Sent user notification', summary);
    }
    return { tokens: tokens.length, successCount: response.successCount, failureCount: response.failureCount };
};
