import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { updateTopicSubscriptions } from '../helpers.js';
import { ADMIN_TOPICS, NOTIFICATION_TOPICS } from '../utils.js';

// When a device/token is removed (logout), drop every topic subscription
// so a stale token cannot keep receiving notifications.
export const logOutUnsubscribeToTopic = onDocumentDeleted('/users/{userId}/devices/{devicesId}', async (event) => {
    const deviceToken = event.params.devicesId;
    await updateTopicSubscriptions(deviceToken, [...NOTIFICATION_TOPICS, ...ADMIN_TOPICS], false);
});
