import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { firestore, messaging } from '../firebase.js';

export const forumCommentLiked = onDocumentUpdated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    logger.info('forumCommentLiked triggered', {
        forumId: event.params.forumId,
        threadId: event.params.threadId,
        commentId: event.params.commentId
    });

    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) {
        logger.warn('Missing data in event', { hasPastValue: !!pastValue, hasNewValue: !!newValue });
        return;
    }

    const likedByBefore = Array.isArray(pastValue.liked_by) ? pastValue.liked_by : [];
    const likedByAfter = Array.isArray(newValue.liked_by) ? newValue.liked_by : [];

    if (likedByAfter.length <= likedByBefore.length) {
        logger.info('No new likes, exiting');
        return;
    }

    // Find the user who liked the comment
    const newLikerId = likedByAfter.find((id) => !likedByBefore.includes(id));

    const userId = newValue.author_id;
    if (!userId) {
        logger.warn('No userId associated with comment, exiting');
        return;
    }

    if (newLikerId === userId) {
        logger.info('User liked their own comment, exiting', { userId });
        return;
    }

    // Check if user has notifications turned on
    // Assuming generic check or allowing by default if specialized setting not found
    // mirroring prayerRequestPrayed logic of checking settings doc presence
    const userNotificationSettingsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notification_settings')
        .get();

    if (userNotificationSettingsSnapshot.empty) {
        logger.info('User has no notification settings, exiting', { userId });
        return;
    }

    const userNotificationSettings = userNotificationSettingsSnapshot.docs[0].data();

    if (!userNotificationSettings.forum_comment_likes) {
        logger.info('User has disabled forum_comment_likes notifications, exiting', { userId });
        return;
    }

    const deviceTokenSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('devices')
        .get();

    const deviceTokens = [];
    if (!deviceTokenSnapshot.empty) {
        deviceTokenSnapshot.forEach((doc) => {
            deviceTokens.push(doc.id);
        });
    }

    if (deviceTokens.length === 0) {
        logger.info('User has no device tokens, exiting', { userId });
        return;
    }

    const commentBody = newValue.body || 'your comment';
    const bodyPreview = commentBody.length > 30 ? `${commentBody.substring(0, 27)}...` : commentBody;

    const message = {
        notification: {
            title: 'Someone liked your comment!',
            body: bodyPreview,
        },
        data: {
            notificationType: 'forumCommentLike',
            threadId: event.params.threadId,
            forumId: event.params.forumId,
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

    logger.info('Sending forumCommentLike notification', { message, userId, deviceTokenCount: deviceTokens.length });

    try {
        const response = await messaging.sendEachForMulticast(message);
        logger.info('Successfully sent forumCommentLike notification', {
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses
        });
    } catch (error) {
        logger.error('Error sending forumCommentLike notification', error);
    }
});
