import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

export const newDeviceEngagementSub = onDocumentCreated('/users/{userId}/devices/{deviceId}', async (event) => {
    const userId = event.params.userId;
    const deviceToken = event.params.deviceId;
    const notificationSettingSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notification_settings')
        .get();

    const userSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .get();

    if (!notificationSettingSnapshot.empty) {
        const notificationSettings = notificationSettingSnapshot.docs[0].data();
        if (notificationSettings.daily_engagement_reminder) {
            await messaging.subscribeToTopic(deviceToken, 'daily_engagement_reminder');
        }
    }

    if (userSnapshot.exists && userSnapshot.data().is_admin) {
        await messaging.subscribeToTopic(deviceToken, 'user_signup_notifications');
        await messaging.subscribeToTopic(deviceToken, 'user_delete_request');
    }
});
