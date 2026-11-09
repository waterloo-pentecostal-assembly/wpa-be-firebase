import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getDeviceTokens, updateTopicSubscriptions } from '../helpers.js';
import { ADMIN_TOPICS } from '../utils.js';

export const adminUserSub = onDocumentUpdated('/users/{userId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Handle undefined data just in case
    if (!pastValue || !newValue) return;

    if (pastValue.is_admin !== newValue.is_admin) {
        const deviceTokens = await getDeviceTokens(event.params.userId);
        if (deviceTokens.length === 0) return;

        // subscribeToTopic handles up to 1000 tokens per call.
        // Assuming user doesn't have > 1000 devices.
        await updateTopicSubscriptions(deviceTokens, ADMIN_TOPICS, newValue.is_admin === true);
    }
});
