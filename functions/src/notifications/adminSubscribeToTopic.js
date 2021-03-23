const { firestore, functions, messaging } = require('../index');

exports.adminUserSub = functions
    .firestore
    .document('/users/{userId}')
    .onUpdate(async (change, context) => {
        const pastValue = change.before.data();
        const newValue = change.after.data();

        if(pastValue.is_admin !== newValue.is_admin){
            const userId = context.params.userId;
            const deviceTokensSnapshot = await firestore
                .collection('users')
                .doc(userId)
                .collection('devices')
                .get();
            const deviceTokens = [];
            if (!deviceTokensSnapshot.empty) {
                deviceTokensSnapshot.forEach((doc) => {
                    deviceTokens.push(doc.id);
                });
            } else {
                return;
            }
            if(newValue.is_admin === true){
                await messaging.subscribeToTopic(deviceTokens, 'user_signup_notifications');
            }else{
                await messaging.unsubscribeFromTopic(deviceTokens, 'user_signup_notifications');
            }
            
        }
    });
    