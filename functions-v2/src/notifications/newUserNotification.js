import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { messaging } from '../firebase.js';

export const newUserNotification = onDocumentCreated('/users/{userId}', async (event) => {
    const notificationPayload = {
        notification: {
            title: 'New User Sign-Up!',
            body: `Please take time to review and verify new users`,
        },
        data: {
            notificationType: 'userSignUp',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
        },
        topic: 'user_signup_notifications'
    };
    await messaging.send(notificationPayload);
});
