const { firestore, functions, messaging } = require('../index');

exports.newUserNotification = functions
    .firestore
    .document('/users/{userId}')
    .onCreate( async (snapshot, context) => {
        const notificationPayload = {
            notification: {
                title: 'New User Sign-Up!',
                body: `Please take time to review and verify new users`,
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            },
            data: {
                notificationType: 'userSignUp',
            }
        };
        await messaging.sendToTopic('user_signup_notifications', notificationPayload);
    });
    