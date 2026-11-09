import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sendToTopic } from '../helpers.js';
import { buildNotification, truncateText } from '../utils.js';

export const newPrayerRequestForApproval = onDocumentCreated('/prayer_requests/{documentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

    await sendToTopic(buildNotification({
        title: 'New Prayer Request For Approval',
        body: truncateText(data.request, 50, 'New prayer request waiting for approval.'),
        notificationType: 'newPrayerRequestForApproval',
        topic: 'new_prayer_request_for_approval'
    }));
});
