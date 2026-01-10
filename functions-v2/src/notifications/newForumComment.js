import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newForumComment = onDocumentCreated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

    // Use body of the comment
    const commentBody = data.body || 'New comment posted.';

    // Truncate body text
    const bodyText = commentBody.length > 50 ? `${commentBody.substring(0, 47)}...` : commentBody;
    const threadId = event.params.threadId;

    const notificationPayload = {
        notification: {
            title: 'New Comment',
            body: bodyText,
        },
        data: {
            notificationType: 'newForumComment',
            threadId: threadId,
            commentId: event.params.commentId,
            forumId: event.params.forumId,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: threadId
    };

    await messaging.send(notificationPayload);
});
