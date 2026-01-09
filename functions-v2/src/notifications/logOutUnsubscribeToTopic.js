import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const logOutUnsubscribeToTopic = onDocumentDeleted('/users/{userId}/devices/{devicesId}', async (event) => {
    const deviceToken = event.params.devicesId;
    await messaging.unsubscribeFromTopic(deviceToken, 'daily_engagement_reminder');
    await messaging.unsubscribeFromTopic(deviceToken, 'user_signup_notifications');
    await messaging.unsubscribeFromTopic(deviceToken, 'user_delete_request');
    return 0; // Functions don't need to return values but async func returns promise.
});
