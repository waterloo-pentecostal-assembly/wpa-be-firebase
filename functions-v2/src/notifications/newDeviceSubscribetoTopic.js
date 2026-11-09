import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { firestore } from '../firebase.js';
import { getNotificationSettings, updateTopicSubscriptions } from '../helpers.js';
import { ADMIN_TOPICS, NOTIFICATION_TOPICS } from '../utils.js';

// When a device registers, subscribe it to every topic the user already
// has enabled. Previously this only handled daily_engagement_reminder, so
// devices added after notification_settings was created never joined
// new_forum_thread / new_prayer_request / new_testimony and silently
// received nothing even when the sender ran successfully.
export const newDeviceEngagementSub = onDocumentCreated('/users/{userId}/devices/{deviceId}', async (event) => {
    const userId = event.params.userId;
    const deviceToken = event.params.deviceId;
    const notificationSettings = await getNotificationSettings(userId);

    const userSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .get();

    const topicsToSubscribe = notificationSettings ?
        NOTIFICATION_TOPICS.filter((topic) => notificationSettings[topic] === true) :
        [];

    if (userSnapshot.exists && userSnapshot.data().is_admin) {
        topicsToSubscribe.push(...ADMIN_TOPICS);
    }

    await updateTopicSubscriptions(deviceToken, topicsToSubscribe, true);
});
