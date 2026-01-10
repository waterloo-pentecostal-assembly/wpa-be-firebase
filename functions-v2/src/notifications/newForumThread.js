import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newForumThread = onDocumentWritten('/forums/{forumId}/threads/{threadId}', async (event) => {
    const newData = event.data.after.data();

    // If deleted, return
    if (!newData) return;

    // Use default values if fields are missing.
    const threadTitle = newData.title;
    const bodyText = threadTitle.length > 50 ? `${threadTitle.substring(0, 47)}...` : threadTitle;

    const notificationPayload = {
        notification: {
            title: 'New Thread',
            body: bodyText,
        },
        data: {
            notificationType: 'newForumThread',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: 'new_forum_thread'
    };

    await messaging.send(notificationPayload);
});
