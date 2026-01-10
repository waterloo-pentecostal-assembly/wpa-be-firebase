import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

export const newForumReply = onDocumentCreated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

    const parentId = data.parent_comment_id;
    if (!parentId) return;

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

    if (!parentCommentSnapshot.exists) return;

    const parentCommentData = parentCommentSnapshot.data();
    const parentAuthorId = parentCommentData.user_id;

    // Don't notify if replying to own comment
    if (parentAuthorId === data.user_id) return;

    // Check user settings
    const userNotificationSettingsSnapshot = await firestore
        .collection('users')
        .doc(parentAuthorId)
        .collection('notification_settings')
        .get();

    if (userNotificationSettingsSnapshot.empty) return;

    const userNotificationSettings = userNotificationSettingsSnapshot.docs[0].data();
    if (!userNotificationSettings.forum_comment_replies) {
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

    if (deviceTokens.length === 0) return;

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

    await messaging.sendEachForMulticast(message);
});
