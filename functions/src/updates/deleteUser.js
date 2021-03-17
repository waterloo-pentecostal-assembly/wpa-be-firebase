const { firestore, functions, admin, auth, storage } = require('../index');

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
           
        completionsSnapshot.forEach(function(doc){
            batch.delete(doc.ref);
        });
        
        //Deleting user prayer requests
        const prayerRequestCollection = await firestore.collection('prayer_requests')
            .where('user_id', '==', deletedUserId)
            .get();
        
        prayerRequestCollection.forEach(function(doc){
            batch.delete(doc.ref);
        });

        batch.commit();

        const bucket = storage.bucket();
        bucket.deleteFiles({
            prefix: 'users/${deletedUserId}/'
        });
        bucket.deleteFiles({
            prefix: 'responses/${deletedUserId}/'
        });
    });