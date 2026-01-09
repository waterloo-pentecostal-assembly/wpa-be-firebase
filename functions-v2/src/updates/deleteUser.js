import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { firestore, auth, storage, storageBucket } from '../firebase.js';

export const deleteUser = onDocumentDeleted('/users/{documentId}', async (event) => {
    const deletedUserId = event.params.documentId;
    await auth.deleteUser(deletedUserId);

    const batch = firestore.batch();

    // Deleting user completions
    const completionsSnapshot = await firestore
        .collection('completions')
        .where('user_id', '==', deletedUserId)
        .get();

    completionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Deleting user prayer requests
    const prayerRequestCollection = await firestore.collection('prayer_requests')
        .where('user_id', '==', deletedUserId)
        .get();

    prayerRequestCollection.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    // Delete stored files
    await storage.bucket(storageBucket).deleteFiles({
        prefix: `responses/${deletedUserId}/`
    });
    await storage.bucket(storageBucket).deleteFiles({
        prefix: `users/${deletedUserId}/`
    });
});
