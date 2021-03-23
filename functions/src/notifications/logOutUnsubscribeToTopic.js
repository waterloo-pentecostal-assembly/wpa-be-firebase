const { firestore, functions, messaging } = require('../index');

exports.logOutUnsubscribeToTopic = functions
    .firestore
    .document('/users/{userId}/devices/{devicesId}')
    .onDelete(async (snapshot, context) => {
        const deviceToken = snapshot.id;
        await messaging.unsubscribeFromTopic(deviceToken, 'daily_engagement_reminder');
        const userSnapshot = await firestore.collection('users').doc(context.params.userId).get();
        if(userSnapshot.data().is_admin){
            await messaging.unsubscribeFromTopic(deviceToken, 'user_signup_notifications');
        }
        return 0;
    });
    
