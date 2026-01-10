import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newPrayerRequest = onDocumentWritten('/prayer_requests/{documentId}', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    // If deleted, return
    if (!newData) return;

    // Check if currently approved
    if (newData.is_approved !== true) return;

    // Check if it was already approved (prevent duplicate notifications on subsequent updates)
    const wasApproved = oldData && oldData.is_approved === true;
    if (wasApproved) return;

    // Use default values if fields are missing, though 'request' should likely exist
    const requestText = newData.request || 'New prayer request shared.';

    // Truncate request text for body if it's too long
    const bodyText = requestText.length > 50 ? `${requestText.substring(0, 47)}...` : requestText;

    const notificationPayload = {
        notification: {
            title: 'New Prayer Request',
            body: bodyText,
        },
        data: {
            notificationType: 'newPrayerRequest',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: 'new_prayer_request'
    };

    await messaging.send(notificationPayload);
});
