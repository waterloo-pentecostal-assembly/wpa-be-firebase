import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newTestimony = onDocumentWritten('/testimonies/{documentId}', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    // If deleted, return
    if (!newData) return;

    // Check if currently approved
    if (newData.is_approved !== true) return;

    // Check if it was already approved (prevent duplicate notifications on subsequent updates)
    const wasApproved = oldData && oldData.is_approved === true;
    if (wasApproved) return;

    // Use default values if fields are missing. Assuming 'testimony' or 'body' is the field.
    const testimonyText = newData.testimony || newData.body || 'New testimony shared.';

    // Truncate request text for body if it's too long
    const bodyText = testimonyText.length > 50 ? `${testimonyText.substring(0, 47)}...` : testimonyText;

    const notificationPayload = {
        notification: {
            title: 'New Testimony',
            body: bodyText,
        },
        data: {
            notificationType: 'newTestimony',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: 'new_testimony'
    };

    await messaging.send(notificationPayload);
});
