const { firestore, functions, messaging, Timestamp } = require('../index');

// Docs: https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging-1

const dateToYYYYMMDD = (date) => {
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${(date.getDate()).toString().padStart(2, '0')}`;
};

// exports.dailyEngagementReminderNotification = functions
// WIP
dailyEngagementReminderNotification = functions
    .pubsub
    .schedule("0 10 * * *")  // 10 a.m. everyday
    .timeZone("America/Toronto")
    .onRun(async (context) => {
        // Look into luxon for handling time
        const today = new Date();
        const todayMillis = today.valueOf();
        const todayYYYYMMDD = dateToYYYYMMDD(today);

        // Get the current Bible Series
        const bibleSeriesSnapshot = await firestore
            .collection('bible_series')
            .where('start_date', '<=', Timestamp.fromMillis(todayMillis))
            .orderBy('start_date', 'desc')
            .limit(1)
            .get();

        // Loop through all snapshots and check if engagement exists
        let engagementExists = false;
        let bibleSeriesTitle;
        let bibleSeriesId;

        if (!bibleSeriesSnapshot.empty) {
            const bibleSeriesDoc = bibleSeriesSnapshot[0];
            const bibleSeries = bibleSeriesDoc.data();
            bibleSeriesTitle = bibleSeries['title'];
            bibleSeriesId = bibleSeriesDoc.id;

            const contentSnippet = bibleSeries['series_content_snippet'];
            if (Array.isArray(contentSnippet)) {
                for (let element of contentSnippet) {
                    const dateYYYYMMDD = dateToYYYYMMDD(element['date'].toDate());
                    if (dateYYYYMMDD === todayYYYYMMDD) {
                        engagementExists = true;
                        break;
                    }
                }
            }
        }

        // Send notification if engagement exists for today
        // Helpful: https://firebase.google.com/docs/cloud-messaging/concept-options
        //          https://github.com/firebase/functions-samples/blob/master/fcm-notifications/functions/index.js

        if (engagementExists) {

            const notificationPayload = {
                notification: {
                },
                data: {
                }
            };

            messaging.sendToTopic('daily_engagement_reminder', notificationPayload);
        }
    });
