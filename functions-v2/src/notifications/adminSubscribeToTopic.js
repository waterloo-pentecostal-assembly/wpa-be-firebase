import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

export const adminUserSub = onDocumentUpdated('/users/{userId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Handle undefined data just in case
    if (!pastValue || !newValue) return;

    if (pastValue.is_admin !== newValue.is_admin) {
        const userId = event.params.userId;
        const deviceTokensSnapshot = await firestore
            .collection('users')
            .doc(userId)
            .collection('devices')
            .get();
        const deviceTokens = [];
        if (!deviceTokensSnapshot.empty) {
            deviceTokensSnapshot.forEach((doc) => {
                deviceTokens.push(doc.id);
            });
        } else {
            return;
        }

        // Limit tokens to 1000 per call if necessary, but subscribeToTopic handles up to 1000.
        // Assuming user doesn't have > 1000 devices.
        if (newValue.is_admin === true) {
            await messaging.subscribeToTopic(deviceTokens, 'user_signup_notifications');
            await messaging.subscribeToTopic(deviceTokens, 'user_delete_request');
            await messaging.subscribeToTopic(deviceTokens, 'new_testimony_for_approval');
            await messaging.subscribeToTopic(deviceTokens, 'new_prayer_request_for_approval');
        } else {
            await messaging.unsubscribeFromTopic(deviceTokens, 'user_signup_notifications');
            await messaging.unsubscribeFromTopic(deviceTokens, 'user_delete_request');
            await messaging.unsubscribeFromTopic(deviceTokens, 'new_testimony_for_approval');
            await messaging.unsubscribeFromTopic(deviceTokens, 'new_prayer_request_for_approval');
        }
    }
});
