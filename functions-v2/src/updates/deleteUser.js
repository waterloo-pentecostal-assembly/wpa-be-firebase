import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { firestore, auth, storage, storageBucket } from '../firebase.js';

// Collections whose docs are owned by a user via `user_id`
const USER_OWNED_COLLECTIONS = ['completions', 'prayer_requests'];

// Storage folders holding a user's files
const USER_STORAGE_PREFIXES = ['responses', 'users'];

export const deleteUser = onDocumentDeleted('/users/{documentId}', async (event) => {
    const deletedUserId = event.params.documentId;
    await auth.deleteUser(deletedUserId);

    // Delete user-owned documents
    const batch = firestore.batch();
    for (const collection of USER_OWNED_COLLECTIONS) {
        const snapshot = await firestore
            .collection(collection)
            .where('user_id', '==', deletedUserId)
            .get();

        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
    }
    await batch.commit();

    // Delete stored files
    for (const prefix of USER_STORAGE_PREFIXES) {
        await storage.bucket(storageBucket).deleteFiles({
            prefix: `${prefix}/${deletedUserId}/`
        });
    }
});
