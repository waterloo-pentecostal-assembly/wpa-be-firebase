import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newTestimonyForApproval = onDocumentCreated('/testimonies/{documentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

    // Use default values if fields are missing. Assuming 'testimony' or 'body' is the field.
    const testimonyText = data.testimony || data.body || 'New testimony waiting for approval.';

    // Truncate request text for body if it's too long
    const bodyText = testimonyText.length > 50 ? `${testimonyText.substring(0, 47)}...` : testimonyText;

    const notificationPayload = {
        notification: {
            title: 'New Testimony For Approval',
            body: bodyText,
        },
        data: {
            notificationType: 'newTestimonyForApproval',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: 'new_testimony_for_approval'
    };

    await messaging.send(notificationPayload);
});
