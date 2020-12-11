const { firestore, functions, messaging } = require('../index');

// Subscribe to or unsubscribe from daily_engagement_reminder topic when switch is toggled 
exports.handleEngagementReminderSubscription = functions
    .firestore
    .document('/users/{userId}/notification_settings/{notificationSettingsId}')
    .onUpdate(async (change, context) => {
        // might need to do on write and handle undefined
        // Get setting
        const newSetting = change.after.data()['daily_engagement_reminder'];
        const oldSetting = change.before.data()['daily_engagement_reminder'];

        // Handle subscription if daily_engagement_reminder was changed
        if (oldSetting !== newSetting) {

            // Get userId
            const userId = context.params.userId;

            // Get device tokens 
            const deviceTokensSnapshot = await firestore
                .collection('users')
                .doc(userId)
                .collection('devices')
                .get();

            const deviceTokens = [];
            if (!deviceTokensSnapshot.empty) {
                deviceTokensSnapshot.forEach((doc) => {
                    // doc IDs are the device tokens 
                    deviceTokens.push(doc.id);
                });
            }

            if (newSetting) {
                // Subscribe
                await messaging.subscribeToTopic(deviceTokens, 'daily_engagement_reminder');
            } else {
                // Unsubscribe
                await messaging.unsubscribeFromTopic(deviceTokens, 'daily_engagement_reminder');
            }
        }
    });