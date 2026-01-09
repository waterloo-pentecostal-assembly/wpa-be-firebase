import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firestore, messaging } from '../firebase.js';

// Docs: https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging-1

// Currently, this will send a notification to all users subscribed to
// the daily_engagement_reminder topic whether or not they already completed
// the engagement by the time the notification is sent.
// To fix this, we would have to handle subscriptions outside of the topics
// feature in FCM.
export const dailyEngagementReminder = onSchedule({
    schedule: '0 10 * * *', // 10 a.m. everyday
    timeZone: 'America/Toronto'
}, async (event) => {
    const today = new Date();

    // Get the current Bible Series
    const bibleSeriesSnapshot = await firestore
        .collection('bible_series')
        .where('is_active', '==', true)
        .orderBy('start_date', 'desc')
        .limit(1)
        .get();


    if (bibleSeriesSnapshot.empty) {
        return;
    }

    // Loop through all snapshots and check if engagement exists
    const bibleSeriesDoc = bibleSeriesSnapshot.docs[0];
    const bibleSeries = bibleSeriesDoc.data();

    let engagementExists = false;
    const bibleSeriesTitle = bibleSeries['title'];
    const bibleSeriesId = bibleSeriesDoc.id;
    const contentSnippet = bibleSeries['series_content_snippet'];

    if (Array.isArray(contentSnippet)) {
        for (const element of contentSnippet) {
            // Check if element.date is Timestamp or has toDate
            const engagementDate = element['date'].toDate ? element['date'].toDate() : new Date(element['date'].seconds * 1000);
            if (engagementDate.toDateString() === today.toDateString()) {
                engagementExists = true;
                break;
            }
        }
    }

    if (engagementExists) {
        const notificationPayload = {
            notification: {
                title: 'Daily Engagement Reminder',
                body: `Don't forget to engage with ${bibleSeriesTitle} today!`,
                // clickAction: 'FLUTTER_NOTIFICATION_CLICK' // Deprecated/Legacy, used in AndroidConfig or WebPushConfig
            },
            data: {
                notificationType: 'dailyEngagementReminder',
                bibleSeriesId: bibleSeriesId,
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Moving to data for safety or AndroidConfig
            }
            // Add Android-specific config if needed for click_action support in new API
        };

        await messaging.send({
            topic: 'daily_engagement_reminder',
            notification: notificationPayload.notification,
            data: notificationPayload.data,
            android: {
                notification: {
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                }
            }
        });
    }
});
