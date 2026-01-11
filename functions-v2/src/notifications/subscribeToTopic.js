import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

const TOPICS = [
    'daily_engagement_reminder',
    'new_forum_thread',
    'new_prayer_request',
    'new_testimony'
];

// Subscribe to or unsubscribe from topics when switch is toggled
export const engagementSub = onDocumentWritten('/users/{userId}/notification_settings/{notificationSettingsId}', async (event) => {
    // Get setting
    const newData = event.data.after.exists ? event.data.after.data() : {};
    const oldData = event.data.before.exists ? event.data.before.data() : {};

    const userId = event.params.userId;
    let deviceTokens = null;

    for (const topic of TOPICS) {
        const newSetting = newData[topic] === true;
        const oldSetting = oldData[topic] === true;

        // Handle subscription if setting was changed
        if (oldSetting !== newSetting) {
            // Get device tokens if not already fetched
            if (deviceTokens === null) {
                const deviceTokensSnapshot = await firestore
                    .collection('users')
                    .doc(userId)
                    .collection('devices')
                    .get();

                deviceTokens = [];
                if (!deviceTokensSnapshot.empty) {
                    deviceTokensSnapshot.forEach((doc) => {
                        // doc IDs are the device tokens
                        deviceTokens.push(doc.id);
                    });
                }
            }

            if (deviceTokens.length > 0) {
                if (newSetting) {
                    // Subscribe
                    await messaging.subscribeToTopic(deviceTokens, topic);
                } else {
                    // Unsubscribe
                    await messaging.unsubscribeFromTopic(deviceTokens, topic);
                }
            }
        }
    }

    // // Check for changes in threads_followed
    // const oldThreads = Array.isArray(oldData.threads_followed) ? oldData.threads_followed : [];
    // const newThreads = Array.isArray(newData.threads_followed) ? newData.threads_followed : [];

    // const addedThreads = newThreads.filter((x) => !oldThreads.includes(x));
    // const removedThreads = oldThreads.filter((x) => !newThreads.includes(x));

    // if (addedThreads.length > 0 || removedThreads.length > 0) {
    //     // Get device tokens if not already fetched
    //     if (deviceTokens === null) {
    //         const deviceTokensSnapshot = await firestore
    //             .collection('users')
    //             .doc(userId)
    //             .collection('devices')
    //             .get();

    //         deviceTokens = [];
    //         if (!deviceTokensSnapshot.empty) {
    //             deviceTokensSnapshot.forEach((doc) => {
    //                 deviceTokens.push(doc.id);
    //             });
    //         }
    //     }

    //     if (deviceTokens.length > 0) {
    //         if (addedThreads.length > 0) {
    //             for (const threadId of addedThreads) {
    //                 await messaging.subscribeToTopic(deviceTokens, threadId);
    //             }
    //         }
    //         if (removedThreads.length > 0) {
    //             for (const threadId of removedThreads) {
    //                 await messaging.unsubscribeFromTopic(deviceTokens, threadId);
    //             }
    //         }
    //     }
    // }
});
