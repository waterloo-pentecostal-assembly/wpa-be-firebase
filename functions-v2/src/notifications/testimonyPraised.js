import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getOptedInDeviceTokens, sendToDevices } from '../helpers.js';
import { arrayField, buildNotification } from '../utils.js';

export const testimonyPraised = onDocumentUpdated('/testimonies/{documentId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) return;

    if (arrayField(newValue, 'praised_by').length <= arrayField(pastValue, 'praised_by').length) {
        return;
    }

    // Check if user has testimony notifications turned on
    const deviceTokens = await getOptedInDeviceTokens(newValue.user_id, 'testimonies');
    if (deviceTokens.length === 0) return;

    await sendToDevices(deviceTokens, buildNotification({
        title: 'Someone praised your testimony!',
        body: `Testimony: ${newValue.testimony || newValue.body || 'Testimony'}`,
        notificationType: 'testimonyPraised'
    }));
});
