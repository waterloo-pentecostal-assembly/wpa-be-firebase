import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore } from '../firebase.js';

export const progressReset = onDocumentUpdated('/bible_series/{bibleSeriesId}', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    if (newData['is_active'] && !oldData['is_active']) {
        const bibleSeriesId = event.params.bibleSeriesId;
        const achievementsSnapshot = await firestore
            .collection('achievements')
            .get();

        const achievementUpdates = [];
        achievementsSnapshot.forEach((doc) => {
            achievementUpdates.push(firestore.collection('achievements').doc(doc.id).update({ 'series_progress': 0 }));
        });
        await Promise.all(achievementUpdates);

        const bibleSeriesSnapshot = await firestore
            .collection('bible_series')
            .get();

        const seriesUpdates = [];
        bibleSeriesSnapshot.forEach((doc) => {
            if (doc.id !== bibleSeriesId) {
                seriesUpdates.push(firestore.collection('bible_series').doc(doc.id).update({ 'is_active': false }));
            }
        });
        await Promise.all(seriesUpdates);
    }
});
