import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore } from '../firebase.js';
import { userSnippetChanged } from '../utils.js';

// Update user snippet when user document is changed
export const updatePrayerRequestUserSnippet = onDocumentUpdated('/users/{documentId}', async (event) => {
    // Skip writes that don't touch snippet fields (e.g. last_active, search_tokens)
    if (!userSnippetChanged(event.data.before.data(), event.data.after.data())) {
        return;
    }

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
            // Using update inside batch is better than get+set
            batch.update(doc.ref, { 'user_snippet': userSnippet });
        });
        await batch.commit();
    }
});
