const { firestore, functions, auth, storage, storageBucket} = require('../index');

exports.deleteUser = functions
    .firestore
    .document('/users/{documentId}')
    .onDelete(async (snapshot, context) => {
        const deletedUserId = snapshot.id;
        await auth.deleteUser(deletedUserId);
        
        var batch = firestore.batch();

        //Deleting user completions
        const completionsSnapshot = await firestore
            .collection('completions')
            .where('user_id', '==', deletedUserId)
            .get();
           
        completionsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        //Deleting user prayer requests
        const prayerRequestCollection = await firestore.collection('prayer_requests')
            .where('user_id', '==', deletedUserId)
            .get();
        
        prayerRequestCollection.forEach((doc) => {
            batch.delete(doc.ref);
        });

        batch.commit();

        // Delete stored files
        await storage.bucket(storageBucket).deleteFiles({
            prefix: `responses/${deletedUserId}/`
        });
        await storage.bucket(storageBucket).deleteFiles({
            prefix: `users/${deletedUserId}/`
        });
       
    });