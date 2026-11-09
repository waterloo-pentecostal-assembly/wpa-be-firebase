import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sendToTopic } from '../helpers.js';
import { buildNotification } from '../utils.js';

export const newUserNotification = onDocumentCreated('/users/{userId}', async () => {
    await sendToTopic(buildNotification({
        title: 'New User Sign-Up!',
        body: 'Please take time to review and verify new users',
        notificationType: 'userSignUp',
        topic: 'user_signup_notifications'
    }));
});
