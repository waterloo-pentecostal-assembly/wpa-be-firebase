const { firestore, functions } = require('../index');

exports.progressReset = functions
    .firestore
    .document('/bible_series/{bibleSeriesId}')
    .onUpdate( async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        
        if(newData['is_active'] && !oldData['is_active']){
            const bibleSeriesId = change.after.id;
            const achievementsSnapshot = await firestore
                .collection('achievements')
                .get();

            achievementsSnapshot.forEach(async (doc) => {
                await firestore.collection('achievements').doc(doc.id).update({'series_progress': 0});
            });

            const bibleSeriesSnapshot = await firestore
                .collection('bible_series')
                .get();

            bibleSeriesSnapshot.forEach(async (doc) => {
                if(doc.id !== bibleSeriesId){
                    await firestore.collection('bible_series').doc(doc.id).update({'is_active': false});
                }
            });
        }
        return;
    });