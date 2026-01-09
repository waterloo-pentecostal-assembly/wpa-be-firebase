import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

export const prayerRequestPrayed = onDocumentUpdated('/prayer_requests/{documentId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) return;

    const prayedByBefore = Array.isArray(pastValue.prayed_by) ? pastValue.prayed_by : [];
    const prayedByAfter = Array.isArray(newValue.prayed_by) ? newValue.prayed_by : [];

    if (prayedByAfter.length <= prayedByBefore.length) {
        return;
    }
    const userId = newValue.user_id;

    // Check if user has prayer notifications turned on
    const userNotificationSettingsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notification_settings')
        .get();

    if (userNotificationSettingsSnapshot.empty) return;

    const userNotificationSettings = userNotificationSettingsSnapshot.docs[0].data();

    if (!userNotificationSettings.prayers) {
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

    const message = {
        notification: {
            title: 'Someone prayed for you!',
            body: `Prayer Request: ${newValue.request}`,
        },
        data: {
            notificationType: 'prayerRequestPrayed',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        tokens: deviceTokens
    };

    // Replaced sendToDevice with sendEachForMulticast
    // sendToDevice(tokens, payload) -> sendEachForMulticast({ tokens, ... })
    // OR sendMulticast({ tokens, ... }) which calls sendEachForMulticast.
    // 'messaging.sendEachForMulticast' is the modern API.
    await messaging.sendEachForMulticast(message);
});
