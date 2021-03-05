const { firestore, functions, messaging, admin } = require('../index');
const Timestamp = admin.firestore.Timestamp;


// Docs: https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging-1


// Currently, this will send a notification to all users subscribed to 
// the daily_engagement_reminder topic whether or not they already completed
// the engagement by the time the notification is sent. 
// To fix this, we would have to handle subscriptions outside of the topics
// feature in FCM.
exports.dailyEngagementReminderNotification = functions
    .pubsub
    .schedule("0 10 * * *")  // 10 a.m. everyday
    .timeZone("America/Toronto")
    .onRun(async (context) => {
        const today = new Date();

        // Get the current Bible Series
        const bibleSeriesSnapshot = await firestore
            .collection('bible_series')
            // .where('start_date', '<=', Timestamp.fromMillis(todayMillis))
            .where('is_active', '==', true)
            .orderBy('start_date', 'desc')
            .limit(1)
            .get();

        // Loop through all snapshots and check if engagement exists
        let engagementExists = false;
        let bibleSeriesTitle;
        let bibleSeriesId;
        if (!bibleSeriesSnapshot.empty) {
            const bibleSeriesDoc = bibleSeriesSnapshot.docs[0];
            const bibleSeries = bibleSeriesDoc.data();
            bibleSeriesTitle = bibleSeries['title'];
            bibleSeriesId = bibleSeriesDoc.id;
            const contentSnippet = bibleSeries['series_content_snippet'];
            if (Array.isArray(contentSnippet)) {
                for (let element of contentSnippet) {
                    const engagementDate = element['date'].toDate();
                    if (engagementDate.toDateString() === today.toDateString()) {
                        engagementExists = true;
                        break;
                    }
                }
            }
        } else {
            return;
        }
        if (engagementExists) {
            const notificationPayload = {
                notification: {
                    title: 'Daily Engagement Reminder',
                    body: `Don't forget to engage with ${bibleSeriesTitle} today!`,
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: {
                    notificationType: 'dailyEngagementReminder',
                    bibleSeriesId: bibleSeriesId,
                }
            };

            messaging.sendToTopic('daily_engagement_reminder', notificationPayload);
        }
    });
