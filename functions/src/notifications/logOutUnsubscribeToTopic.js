const { firestore, functions, messaging } = require('../index');

exports.logOutUnsubscribeToTopic = functions
    .firestore
    .document('/users/{userId}/devices/{devicesId}')
    .onDelete(async (snapshot, context) => {
        
        const deviceToken = snapshot.id;
        await messaging.unsubscribeFromTopic(deviceToken, 'daily_engagement_reminder');
        await messaging.unsubscribeFromTopic(deviceToken, 'user_signup_notifications');
        await messaging.unsubscribeFromTopic(deviceToken, 'user_delete_request');
        return 0;
    });
    
