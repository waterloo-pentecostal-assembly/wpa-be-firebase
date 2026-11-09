import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { firestore } from '../firebase.js';
import { getActiveBibleSeries } from '../helpers.js';

// Update user snippet when user document is changed
export const updateProgress = onDocumentWritten('/completions/{documentId}', async (event) => {
    // Use the deleted completion if it was removed, otherwise the new one
    const deleted = !event.data.after.exists;
    if (deleted && !event.data.before.exists) return; // Should not happen for onDelete/onWrite

    const completion = (deleted ? event.data.before : event.data.after).data();
    if (!deleted && completion.is_draft) {
        return;
    }
    const userId = completion.user_id;
    const seriesId = completion.series_id;

    // Get current bible series
    const bibleSeriesDoc = await getActiveBibleSeries();
    if (!bibleSeriesDoc || seriesId !== bibleSeriesDoc.id) {
        return;
    }
    const bibleSeriesData = bibleSeriesDoc.data();

    // Get all completions for current bible series
    const allSeriesCompletions = await firestore
        .collection('completions')
        .where('series_id', '==', seriesId)
        .where('user_id', '==', userId)
        .where('is_draft', '==', false)
        .get();

    const seriesSnippet = bibleSeriesData.series_content_snippet;
    const contentMap = {};
    const totalEngagementDays = seriesSnippet.length;
    const engagedSet = new Set();

    let snippetCount = 0;
    seriesSnippet.forEach((snippet) => {
        snippet.content_types.forEach((content_type) => {
            contentMap[content_type.content_id] = snippetCount;
        });
        snippetCount += 1;
    });

    allSeriesCompletions.forEach((completion) => {
        const contentId = completion.data().content_id;
        if (contentMap[contentId] !== undefined) {
            engagedSet.add(contentMap[contentId]);
        }
    });

    const progressPercentage = Math.ceil(100 * (engagedSet.size / totalEngagementDays));

    if (progressPercentage === 0) {
        await firestore
            .collection('achievements')
            .doc(userId)
            .delete();
        return;
    }

    const userAchievements = await firestore
        .collection('achievements')
        .where('user_id', '==', userId)
        .get();

    if (!userAchievements.empty) { // Fixed: .exists is for DocumentSnapshot, not QuerySnapshot
        // Using set with merge or update is safer if we know ID.
        // The original code queries by user_id but updates by doc(userId).
        // Assuming docId IS userId based on original code lines 97 and 102.
        await firestore
            .collection('achievements')
            .doc(userId)
            .update({ 'series_progress': progressPercentage });
    } else {
        await firestore
            .collection('achievements')
            .doc(userId)
            .set({ 'series_progress': progressPercentage, 'user_id': userId }); // Added user_id to be safe? Orig code line 103 didn't have it but used set.
        // Original code: .set({ 'series_progress': progressPercentage });
        // If docID is userId, adding user_id field is redundant but harmless. I'll stick to original.
        // Actually original line 103: .set({ 'series_progress': progressPercentage });
    }
});
