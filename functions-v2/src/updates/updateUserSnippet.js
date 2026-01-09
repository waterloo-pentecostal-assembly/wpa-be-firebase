import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore } from '../firebase.js';

// Update user snippet when user document is changed
export const updatePrayerRequestUserSnippet = onDocumentUpdated('/users/{documentId}', async (event) => {
    // Get user data
    const newData = event.data.after.data();
    const userId = event.params.documentId;

    // Create new snippet
    const userSnippet = {
        'first_name': newData['first_name'],
        'last_name': newData['last_name'],
    };

    // Remove profile photo if it was deleted
    if (newData['thumbnail']) {
        userSnippet['thumbnail'] = newData['profile_photo'];
    }

    // Update user_snippet in prayer_request
    // Get all the Prayer Requests for that user
    const prayerRequestSnapshot = await firestore
        .collection('prayer_requests')
        .where('user_id', '==', userId)
        .get();

    // Loop through all snapshots and update user snippet
    if (!prayerRequestSnapshot.empty) {
        const batch = firestore.batch();
        prayerRequestSnapshot.forEach((doc) => {
            // Get current data
            const ref = firestore.collection('prayer_requests').doc(doc.id);
            // Update user snippet
            // Using update inside batch is better than get+set
            batch.update(ref, { 'user_snippet': userSnippet });
        });
        await batch.commit();
    }
});
