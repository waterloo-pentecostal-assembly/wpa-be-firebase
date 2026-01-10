import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore, messaging } from '../firebase.js';

export const testimonyPraised = onDocumentUpdated('/testimonies/{documentId}', async (event) => {
    const pastValue = event.data.before.data();
    const newValue = event.data.after.data();

    // Safety checks
    if (!pastValue || !newValue) return;

    const praisedByBefore = Array.isArray(pastValue.praised_by) ? pastValue.praised_by : [];
    const praisedByAfter = Array.isArray(newValue.praised_by) ? newValue.praised_by : [];

    if (praisedByAfter.length <= praisedByBefore.length) {
        return;
    }
    const userId = newValue.user_id;

    // Check if user has notification settings
    const userNotificationSettingsSnapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('notification_settings')
        .get();

    if (userNotificationSettingsSnapshot.empty) return;

    const userNotificationSettings = userNotificationSettingsSnapshot.docs[0].data();

    if (!userNotificationSettings.testimonies) {
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
            title: 'Someone praised your testimony!',
            body: `Testimony: ${newValue.testimony || newValue.body || 'Testimony'}`,
        },
        data: {
            notificationType: 'testimonyPraised',
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
