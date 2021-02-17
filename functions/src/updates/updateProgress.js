const { firestore, functions, admin } = require('../index');

// Update user snippet when user document is changed
exports.updateProgress = functions
    .firestore
    .document('/completions/{documentId}')
    .onWrite(async (change) => {
        let userId;
        let seriesId;

        // If completion was deleted
        if (!change.after.data()) {
            userId = change.before.data().user_id;
            seriesId = change.before.data().series_id;
        } else {
            const isDraft = change.after.data().is_draft || false;
            if (isDraft) {
                return;
            }
            userId = change.after.data().user_id;
            seriesId = change.after.data().series_id;
        }

        // Get current bible series id
        let bibleSeriesId;
        let bibleSeriesData;

        const bibleSeriesSnapshot = await firestore
            .collection('bible_series')
            .where('is_active', '==', true)
            .orderBy('start_date', 'desc')
            .limit(1)
            .get();

        if (!bibleSeriesSnapshot.empty) {
            const bibleSeriesDoc = bibleSeriesSnapshot.docs[0];
            bibleSeriesData = bibleSeriesDoc.data();

            // Failover: Return if end date has passed
            // const endDate = bibleSeriesData['end_date'].toDate();
            // if (endDate < new Date()) {
            //     return;
            // }
            bibleSeriesId = bibleSeriesDoc.id;
        } else {
            return;
        }

        if (seriesId !== bibleSeriesId) {
            return;
        }

        // Get all completions for current bible series
        const allSeriesCompletions = await firestore
            .collection('completions')
            .where('series_id', '==', seriesId)
            .where('user_id', '==', userId)
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
            engagedSet.add(contentMap[contentId]);
        });

        const progressPercentage = Math.ceil(100 * (engagedSet.size / totalEngagementDays));


        const userAchievements = await firestore
            .collection('achievements')
            .where('user_id', '==', userId)
            .get();

        if(userAchievements.exists){
             await firestore
            .collection('achievements')
            .doc(userId)
            .update({ 'series_progress': progressPercentage });
        }else{
            await firestore
            .collection('achievements')
            .doc(userId)
            .set({ 'series_progress': progressPercentage });
        }

       
    });