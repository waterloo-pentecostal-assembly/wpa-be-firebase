import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

export const forumCommentLiked = onDocumentUpdated('/forums/{forumId}/threads/{threadId}/comments/{commentId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) return;

    const likedByBefore = Array.isArray(pastValue.liked_by) ? pastValue.liked_by : [];
    const likedByAfter = Array.isArray(newValue.liked_by) ? newValue.liked_by : [];

    if (likedByAfter.length <= likedByBefore.length) {
        return;
    }

    const userId = newValue.user_id;
    if (!userId) return;

    // Check if user has notifications turned on
    // Assuming generic check or allowing by default if specialized setting not found
    // mirroring prayerRequestPrayed logic of checking settings doc presence
    const userNotificationSettingsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notification_settings')
        .get();

    if (userNotificationSettingsSnapshot.empty) return;

    const userNotificationSettings = userNotificationSettingsSnapshot.docs[0].data();

    if (!userNotificationSettings.forum_comment_likes) {
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

    if (deviceTokens.length === 0) return;

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

    await messaging.sendEachForMulticast(message);
});
