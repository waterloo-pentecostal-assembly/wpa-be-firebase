import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { messaging } from '../firebase.js';

export const newForumComment = onDocumentCreated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    logger.info('newForumComment triggered', {
        forumId: event.params.forumId,
        threadId: event.params.threadId,
        commentId: event.params.commentId
    });

    const data = event.data.data();
    if (!data) {
        logger.info('No data found in event, exiting.');
        return;
    }

    logger.info('Comment data', { data });

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

    logger.info('Sending notification', { notificationPayload });

    try {
        const response = await messaging.send(notificationPayload);
        logger.info('Successfully sent message', { response });
    } catch (error) {
        logger.error('Error sending message', error);
    }
});
