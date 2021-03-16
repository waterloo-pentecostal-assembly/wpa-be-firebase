const { firestore, functions, admin, auth, storage } = require('../index');

exports.deleteUser = functions
    .firestore
    .document('/users/{documentId}')
    .onDelete(async (snapshot, context) => {
        const deletedUserId = snapshot.id;
        // auth.deleteUser(deletedUserId).then(() => {
        //     console.log('Successfully deleted User');
        // }).catch((e) => {
        //     console.log(e);
        // });
        
        //Deleting user completions
        firestore.collection('completions').where('user_id', '==', deletedUserId).get()
            .then(function(querySnapshot) {
                var batch = firestore.batch();

                querySnapshot.forEach(function(doc){
                    batch.delete(doc.ref);
                })

                return batch.commit();
            });
        
        //Deleting user prayer requests
        firestore.collection('prayer_requests').where('user_id', '==', deletedUserId).get()
        .then(function(querySnapshot) {
            var batch = firestore.batch();

            querySnapshot.forEach(function(doc){
                batch.delete(doc.ref);
            })

            return batch.commit();
        });

        const bucket = storage.bucket();
        bucket.deleteFiles({
            prefix: 'users/${deletedUserId}/'
        });
        bucket.deleteFiles({
            prefix: 'responses/${deletedUserId}/'
        });
    })