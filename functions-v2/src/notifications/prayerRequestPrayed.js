import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getOptedInDeviceTokens, sendToDevices } from '../helpers.js';
import { arrayField, buildNotification } from '../utils.js';

export const prayerRequestPrayed = onDocumentUpdated('/prayer_requests/{documentId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) return;

    if (arrayField(newValue, 'prayed_by').length <= arrayField(pastValue, 'prayed_by').length) {
        return;
    }

    // Check if user has prayer notifications turned on
    const deviceTokens = await getOptedInDeviceTokens(newValue.user_id, 'prayers');
    if (deviceTokens.length === 0) return;

    await sendToDevices(deviceTokens, buildNotification({
        title: 'Someone prayed for you!',
        body: `Prayer Request: ${newValue.request}`,
        notificationType: 'prayerRequestPrayed'
    }));
});
