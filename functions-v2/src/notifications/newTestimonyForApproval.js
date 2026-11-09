import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sendToTopic } from '../helpers.js';
import { buildNotification, truncateText } from '../utils.js';

export const newTestimonyForApproval = onDocumentCreated('/testimonies/{documentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

    // Assuming 'testimony' or 'body' is the field.
    await sendToTopic(buildNotification({
        title: 'New Testimony For Approval',
        body: truncateText(data.testimony || data.body, 50, 'New testimony waiting for approval.'),
        notificationType: 'newTestimonyForApproval',
        topic: 'new_testimony_for_approval'
    }));
});
