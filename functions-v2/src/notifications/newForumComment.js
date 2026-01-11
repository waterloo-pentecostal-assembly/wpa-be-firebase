import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { firestore, messaging } from '../firebase.js';

export const newForumComment = onDocumentCreated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    logger.info('newForumComment triggered', {
        forumId: event.params.forumId,
        threadId: event.params.threadId,
        commentId: event.params.commentId
    });

    const data = event.data.data();
    if (!data) {
        logger.warn('Missing data in event');
        return;
    }

    const { forumId, threadId, commentId } = event.params;
    const authorId = data.author_id;
    const parentId = data.parent_comment_id;
    const commentBody = data.body || 'New comment.';
    // Truncate body text
    const bodyPreview = commentBody.length > 50 ? `${commentBody.substring(0, 47)}...` : commentBody;

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

            const parentCommentData = parentCommentSnapshot.data();
            const parentAuthorId = parentCommentData.author_id;

            // Don't notify if replying to own comment
            if (parentAuthorId === authorId) {
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

            const message = {
                notification: {
                    title: 'New reply to your comment',
                    body: bodyPreview,
                },
                data: {
                    notificationType: 'forumCommentReply',
                    threadId: threadId,
                    forumId: forumId,
                    commentId: commentId,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                android: {
                    notification: {
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                tokens: deviceTokens
            };

            logger.info('Sending forumCommentReply notification', { parentAuthorId, deviceTokenCount: deviceTokens.length });
            const response = await messaging.sendEachForMulticast(message);
            logger.info('Successfully sent reply notification', { successCount: response.successCount, failureCount: response.failureCount });
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
                // The parent of the notification_settings subcollection is the user document
                // Path: users/{userId}/notification_settings/{settingId}
                // doc.ref.parent = notification_settings collection
                // doc.ref.parent.parent = user document
                const userDocRef = doc.ref.parent.parent;
                if (userDocRef) {
                    const userId = userDocRef.id;
                    const settings = doc.data();

                    // conditions:
                    // 1. Not the author
                    // 2. forum_thread_comments setting is true (or undefined? assuming true if subscribed? implementation plan said check logic)
                    // The 'threads_followed' implies intent, but 'forum_thread_comments' might be a master switch.
                    // Let's allow if 'forum_thread_comments' is true or missing (backwards compat) - but strictly if we want to honor the switch we should check it.
                    // User Request "update all users... forum_thread_comments set to true" implies we rely on it.

                    if (userId !== authorId && (settings.forum_thread_comments === true)) {
                        targetUserIds.push(userId);
                    }
                }
            });

            logger.info('Found target users for thread notification', { count: targetUserIds.length, targetUserIds });

            if (targetUserIds.length === 0) {
                logger.info('No valid targets after filtering (author/settings)');
                return;
            }

            // Fetch tokens for all targets
            // We can do this in parallel
            const tokenPromises = targetUserIds.map(async (uid) => {
                const snap = await firestore.collection('users').doc(uid).collection('devices').get();
                return snap.docs.map((d) => d.id);
            });

            const tokensArrays = await Promise.all(tokenPromises);
            const allTokens = tokensArrays.flat(); // Flatten array of arrays

            if (allTokens.length === 0) {
                logger.info('No device tokens found for target users');
                return;
            }

            // Remove duplicates just in case (though unlikely across users, but good practice)
            const uniqueTokens = [...new Set(allTokens)];

            const message = {
                notification: {
                    title: 'New Comment',
                    body: bodyPreview,
                },
                data: {
                    notificationType: 'newForumComment',
                    threadId: threadId,
                    commentId: commentId,
                    forumId: forumId,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                android: {
                    notification: {
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                tokens: uniqueTokens
            };

            logger.info('Sending newForumComment notification', { tokenCount: uniqueTokens.length });
            const response = await messaging.sendEachForMulticast(message);
            logger.info('Successfully sent comment notification', { successCount: response.successCount, failureCount: response.failureCount });
        }
    } catch (error) {
        logger.error('Error in newForumComment', error);
    }
});
