const { firestore, functions, messaging } = require('../index');

exports.logOutUnsubscribeToTopic = functions
    .firestore
    .document('/users/{userId}/devices/{devicesId}')
    .onDelete(async (snapshot, context) => {
        const deviceToken = snapshot.id;
        console.log(deviceToken);
        await messaging.unsubscribeFromTopic(deviceToken, 'daily_engagement_reminder');
        return 0;
    });
