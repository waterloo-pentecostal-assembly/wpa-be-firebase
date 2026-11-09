import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getActiveBibleSeries, sendToTopic } from '../helpers.js';
import { buildNotification } from '../utils.js';

// Docs: https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging-1

// Currently, this will send a notification to all users subscribed to
// the daily_engagement_reminder topic whether or not they already completed
// the engagement by the time the notification is sent.
// To fix this, we would have to handle subscriptions outside of the topics
// feature in FCM.
export const dailyEngagementReminder = onSchedule({
    schedule: '0 10 * * *', // 10 a.m. everyday
    timeZone: 'America/Toronto'
}, async () => {
    const today = new Date().toDateString();

    // Get the current Bible Series
    const bibleSeriesDoc = await getActiveBibleSeries();
    if (!bibleSeriesDoc) return;

    const bibleSeries = bibleSeriesDoc.data();
    const contentSnippet = bibleSeries['series_content_snippet'];

    // Check if an engagement is scheduled for today
    const engagementExists = Array.isArray(contentSnippet) && contentSnippet.some((element) => {
        // Check if element.date is Timestamp or has toDate
        const engagementDate = element['date'].toDate ? element['date'].toDate() : new Date(element['date'].seconds * 1000);
        return engagementDate.toDateString() === today;
    });

    if (engagementExists) {
        await sendToTopic(buildNotification({
            title: 'Daily Engagement Reminder',
            body: `Don't forget to engage with ${bibleSeries['title']} today!`,
            notificationType: 'dailyEngagementReminder',
            data: { bibleSeriesId: bibleSeriesDoc.id },
            topic: 'daily_engagement_reminder'
        }));
    }
});
