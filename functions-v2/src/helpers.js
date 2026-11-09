import * as logger from 'firebase-functions/logger';
import { firestore, messaging } from './firebase.js';
import { errorDetails, tokenFailures } from './utils.js';

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
export const getOptedInDeviceTokens = async (userId, settingKey) => {
    const settings = await getNotificationSettings(userId);
    if (!settings || !settings[settingKey]) {
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
