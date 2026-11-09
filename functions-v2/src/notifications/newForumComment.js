import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { firestore } from '../firebase.js';
import { getDeviceTokens, getOptedInDeviceTokens, sendToDevices } from '../helpers.js';
import { buildNotification, truncateText } from '../utils.js';

export const newForumComment = onDocumentCreated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    const { forumId, threadId, commentId } = event.params;
    logger.info('newForumComment triggered', { forumId, threadId, commentId });

    const data = event.data.data();
    if (!data) {
        logger.warn('Missing data in event');
        return;
    }

    const authorId = data.author_id;
    const parentId = data.parent_id;
    const bodyPreview = truncateText(data.body, 50, 'New comment.');
    const commentData = { threadId, forumId, commentId };

    try {
        if (parentId) {
            // --- HANDLE REPLY ---
            logger.info('Handling as Reply', { parentId });

            // Fetch parent comment to find the author
            const parentCommentSnapshot = await firestore
                .collection('forums')
                .doc(forumId)
                .collection('threads')
                .doc(threadId)
                .collection('comments')
                .doc(parentId)
                .get();

            if (!parentCommentSnapshot.exists) {
                logger.warn('Parent comment not found', { parentId });
                return;
            }

            const parentAuthorId = parentCommentSnapshot.data().author_id;

            // Don't notify if replying to own comment
            if (parentAuthorId === authorId) {
                logger.info('Replied to self, no notification needed');
                return;
            }

            const deviceTokens = await getOptedInDeviceTokens(parentAuthorId, 'forum_comment_replies');
            if (deviceTokens.length === 0) return;

            await sendToDevices(deviceTokens, buildNotification({
                title: 'New reply to your comment',
                body: bodyPreview,
                notificationType: 'forumCommentReply',
                data: commentData
            }));
        } else {
            // --- HANDLE THREAD COMMENT ---
            logger.info('Handling as Thread Comment');

            // Find all users following this thread
            const settingsQuerySnapshot = await firestore
                .collectionGroup('notification_settings')
                .where('threads_followed', 'array-contains', threadId)
                .get();

            if (settingsQuerySnapshot.empty) {
                logger.info('No followers for this thread found');
                return;
            }

            const targetUserIds = [];
            settingsQuerySnapshot.forEach((doc) => {
                // Path: users/{userId}/notification_settings/{settingId}
                // doc.ref.parent.parent is the user document
                const userDocRef = doc.ref.parent.parent;
                if (userDocRef) {
                    const userId = userDocRef.id;

                    // Notify followers other than the author who have the
                    // forum_thread_comments switch turned on.
                    if (userId !== authorId && doc.data().forum_thread_comments === true) {
                        targetUserIds.push(userId);
                    }
                }
            });

            logger.info('Found target users for thread notification', { count: targetUserIds.length, targetUserIds });

            if (targetUserIds.length === 0) {
                logger.info('No valid targets after filtering (author/settings)');
                return;
            }

            // Fetch tokens for all targets in parallel
            const tokensArrays = await Promise.all(targetUserIds.map(getDeviceTokens));
            const uniqueTokens = [...new Set(tokensArrays.flat())];

            if (uniqueTokens.length === 0) {
                logger.info('No device tokens found for target users');
                return;
            }

            await sendToDevices(uniqueTokens, buildNotification({
                title: 'New Comment',
                body: bodyPreview,
                notificationType: 'newForumComment',
                data: commentData
            }));
        }
    } catch (error) {
        logger.error('Error in newForumComment', error);
    }
});
