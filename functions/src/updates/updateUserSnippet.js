const { firestore, functions } = require('../index');

// Update user snippet when user document is changed
exports.updateUserSnippet = functions
    .firestore
    .document('/users/{documentId}')
    .onUpdate(async (change, context) => {
        // Get user data
        const newData = change.after.data();
        const userId = change.after.id;

        // Create new snippet
        const userSnippet = {
            'first_name': newData['first_name'],
            'last_name': newData['last_name'],
            'profile_photo_gs_location': newData['profile_photo_gs_location'],
        };

        // --------------------------------------------------
        // ----- Update user_snippet in prayer_requests -----
        // --------------------------------------------------
        // Get all the Prayer Requests for that user
        const prayerRequestSnapshot = await firestore
            .collection('prayer_requests')
            .where('user_id', '==', userId)
            .get();

        // Loop through all snapshots and update user snippet
        if (!prayerRequestSnapshot.empty) {
            prayerRequestSnapshot.forEach(async (doc) => {
                // Get current data
                const currentData = doc.data();

                // Update user snippet
                currentData['user_snippet'] = userSnippet;

                // Update prayer request data
                await firestore.collection('prayer_requests').doc(doc.id).set(currentData);
            });
        }
    });