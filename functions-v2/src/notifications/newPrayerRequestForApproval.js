import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newPrayerRequestForApproval = onDocumentCreated('/prayer_requests/{documentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

    // Use default values if fields are missing.
    const requestText = data.request || 'New prayer request waiting for approval.';

    // Truncate request text for body if it's too long
    const bodyText = requestText.length > 50 ? `${requestText.substring(0, 47)}...` : requestText;

    const notificationPayload = {
        notification: {
            title: 'New Prayer Request For Approval',
            body: bodyText,
        },
        data: {
            notificationType: 'newPrayerRequestForApproval',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: 'new_prayer_request_for_approval'
    };

    await messaging.send(notificationPayload);
});
