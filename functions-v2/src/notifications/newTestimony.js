import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { sendToTopic } from '../helpers.js';
import { becameApproved, buildNotification, truncateText } from '../utils.js';

export const newTestimony = onDocumentWritten('/testimonies/{documentId}', async (event) => {
    const newData = event.data.after.data();

    // Only notify once, when the testimony is first approved
    if (!becameApproved(event.data.before.data(), newData)) return;

    // Assuming 'testimony' or 'body' is the field.
    await sendToTopic(buildNotification({
        title: 'New Testimony',
        body: truncateText(newData.testimony || newData.body, 50, 'New testimony shared.'),
        notificationType: 'newTestimony',
        topic: 'new_testimony'
    }));
});
