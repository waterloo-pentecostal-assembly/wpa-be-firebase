
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
        if(!notificationSettingSnapshot.empty){
            const notificationSettings = notificationSettingSnapshot.docs[0].data();
            if(notificationSettings.daily_engagement_reminder){
                await messaging.subscribeToTopic(deviceToken, 'daily_engagement_reminder');
            }
        }
        return 0;
    });