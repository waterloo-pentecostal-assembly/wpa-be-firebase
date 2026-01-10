import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { firestore, messaging } from '../firebase.js';

export const newForumReply = onDocumentCreated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    logger.info('newForumReply triggered', {
        forumId: event.params.forumId,
        threadId: event.params.threadId,
        commentId: event.params.commentId
    });

    const data = event.data.data();
    if (!data) {
        logger.warn('Missing data in event');
        return;
    }

    const parentId = data.parent_comment_id;
    if (!parentId) {
        logger.info('Not a reply (no parent_comment_id), exiting');
        return;
    }

    // Fetch parent comment to find the author
    const threadId = event.params.threadId;
    const forumId = event.params.forumId;
    const parentCommentSnapshot = await firestore
        .collection('forums')
        .doc(forumId)
        .collection('threads')
        .doc(threadId)
        .collection('comments')
        .doc(parentId)
        .get();

    if (!parentCommentSnapshot.exists) {
        logger.warn('Parent comment not found', { forumId, threadId, parentId });
        return;
    }

    const parentCommentData = parentCommentSnapshot.data();
    const parentAuthorId = parentCommentData.author_id;

    // Don't notify if replying to own comment
    if (parentAuthorId === data.author_id) {
        logger.info('Replied to self, no notification needed');
        return;
    }

    // Check user settings
    const userNotificationSettingsSnapshot = await firestore
        .collection('users')
        .doc(parentAuthorId)
        .collection('notification_settings')
        .get();

    if (userNotificationSettingsSnapshot.empty) {
        logger.info('User has no notification settings, exiting', { parentAuthorId });
        return;
    }

    const userNotificationSettings = userNotificationSettingsSnapshot.docs[0].data();
    if (!userNotificationSettings.forum_comment_replies) {
        logger.info('User has disabled forum_comment_replies notifications, exiting', { parentAuthorId });
        return;
    }

    // Get device tokens
    const deviceTokenSnapshot = await firestore
        .collection('users')
        .doc(parentAuthorId)
        .collection('devices')
        .get();

    const deviceTokens = [];
    if (!deviceTokenSnapshot.empty) {
        deviceTokenSnapshot.forEach((doc) => {
            deviceTokens.push(doc.id);
        });
    }

    if (deviceTokens.length === 0) {
        logger.info('User has no device tokens, exiting', { parentAuthorId });
        return;
    }

    const replyBody = data.body || 'New reply.';
    const bodyPreview = replyBody.length > 50 ? `${replyBody.substring(0, 47)}...` : replyBody;

    const message = {
        notification: {
            title: 'New reply to your comment',
            body: bodyPreview,
        },
        data: {
            notificationType: 'forumCommentReply',
            threadId: threadId,
            forumId: forumId,
            commentId: event.params.commentId,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        tokens: deviceTokens
    };

    logger.info('Sending forumCommentReply notification', { message, parentAuthorId, deviceTokenCount: deviceTokens.length });

    try {
        const response = await messaging.sendEachForMulticast(message);
        logger.info('Successfully sent forumCommentReply notification', {
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses
        });
    } catch (error) {
        logger.error('Error sending forumCommentReply notification', error);
    }
});
