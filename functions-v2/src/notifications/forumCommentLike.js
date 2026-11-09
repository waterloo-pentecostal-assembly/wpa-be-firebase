import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getOptedInDeviceTokens, sendToDevices } from '../helpers.js';
import { arrayField, buildNotification, truncateText } from '../utils.js';

export const forumCommentLiked = onDocumentUpdated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    const { forumId, threadId, commentId } = event.params;
    logger.info('forumCommentLiked triggered', { forumId, threadId, commentId });

    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) {
        logger.warn('Missing data in event', { hasPastValue: !!pastValue, hasNewValue: !!newValue });
        return;
    }

    const likedByBefore = arrayField(pastValue, 'liked_by');
    const likedByAfter = arrayField(newValue, 'liked_by');

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

    const deviceTokens = await getOptedInDeviceTokens(userId, 'forum_comment_likes');
    if (deviceTokens.length === 0) return;

    await sendToDevices(deviceTokens, buildNotification({
        title: 'Someone liked your comment!',
        body: truncateText(newValue.body, 30, 'your comment'),
        notificationType: 'forumCommentLike',
        data: { threadId, forumId, commentId }
    }));
});
