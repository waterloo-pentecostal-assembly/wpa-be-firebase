const { firestore, functions, messaging } = require('../index');

exports.prayerRequestPrayed = functions
    .firestore
    .document('/prayer_requests/{documentId}')
    .onUpdate(async (change) => {
        const pastValue = change.before.data();
        const newValue = change.after.data();

        const prayedByBefore = Array.isArray(pastValue.prayed_by) || [];
        const prayedByAfter = Array.isArray(newValue.prayed_by) || [];

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

        const notificationPayload = {
            notification: {
                title: 'Someone prayed for you!',
                body: `Prayer Request: ${newValue.request}`,
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            },
            data: {
                notificationType: 'prayerRequestPrayed',
            }
        };
        messaging.sendToDevice(deviceTokens, notificationPayload);
        return;
    });