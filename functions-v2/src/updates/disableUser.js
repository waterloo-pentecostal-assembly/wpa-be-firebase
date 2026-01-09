import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { auth } from '../firebase.js';

export const disableUser = onDocumentCreated('/account_deletion_requests/{documentId}', async (event) => {
    const data = event.data.data();
    if (!data) return;
    const userId = data.user_id; // Fixed typo 'date.user_id' from original
    await auth.updateUser(userId, { disabled: true });
});
