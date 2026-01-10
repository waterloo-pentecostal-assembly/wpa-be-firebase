
const { firestore, functions, messaging } = require('../index');

exports.newDeviceEngagementSub = functions
    .firestore
    .document('/users/{userId}/devices/{deviceId}')
    .onCreate( async (snapshot, context) => {
        const userId = context.params.userId;
        const deviceToken = context.params.deviceId;
        const notificationSettingSnapshot = await firestore
            .collection('users')
            .doc(userId)
            .collection('notification_settings')
            .get();

        const userSnapshot = await firestore
            .collection('users')
            .doc(userId)
            .get();
        if(!notificationSettingSnapshot.empty){
            const notificationSettings = notificationSettingSnapshot.docs[0].data();
            if(notificationSettings.daily_engagement_reminder){
                await messaging.subscribeToTopic(deviceToken, 'daily_engagement_reminder');
            }
        }
        if(userSnapshot.data().is_admin){
            await messaging.subscribeToTopic(deviceToken, 'user_signup_notifications');
            await messaging.subscribeToTopic(deviceToken, 'user_delete_request');
        }
        return 0;
    });
