import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { sendToTopic } from '../helpers.js';
import { becameApproved, buildNotification, truncateText } from '../utils.js';

export const newPrayerRequest = onDocumentWritten('/prayer_requests/{documentId}', async (event) => {
    const newData = event.data.after.data();

    // Only notify once, when the request is first approved
    if (!becameApproved(event.data.before.data(), newData)) return;

    await sendToTopic(buildNotification({
        title: 'New Prayer Request',
        body: truncateText(newData.request, 50, 'New prayer request shared.'),
        notificationType: 'newPrayerRequest',
        topic: 'new_prayer_request'
    }));
});
