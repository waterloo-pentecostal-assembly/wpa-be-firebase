import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { FieldPath } from 'firebase-admin/firestore';
import { currentActiveSeries } from '../helpers.js';
import { APP_TIME_ZONE, errorDetails, mapWithConcurrency } from '../utils.js';
import {
    SEND_CONCURRENCY, SETTINGS, becameActive, buildAudience, buildSeriesReminderMessage,
    classifyUser, seriesStartTitle,
} from './logic.js';
import { groupsCollection, sendToVerifiedUser, usersCollection } from './send.js';

const USERS_PAGE_SIZE = 300;
const COUNT_KEYS = { member: 'members', invited: 'invited', other: 'others' };

// When a series' is_active goes from false to true, remind group members of
// their groups and invite everyone else to join one. Fire and forget: retries
// off and nothing is recorded, so reactivating a series sends again.
export const sendChallengeGroupSeriesReminders = onDocumentWritten({
    document: '/bible_series/{seriesId}',
    retry: false,
    timeoutSeconds: 540
}, async (event) => {
    if (!becameActive(event.data?.before?.data(), event.data?.after?.data())) return;

    const { seriesId } = event.params;
    // Only announce what the app shows as the current series.
    const series = await currentActiveSeries();
    if (!series || series.id !== seriesId) {
        logger.warn('Activated series is not the current series, skipping reminders', {
            seriesId, currentSeriesId: series?.id || null
        });
        return;
    }

    const groups = await groupsCollection().select('name', 'member_ids', 'invited_ids', 'invites').get();
    const audience = buildAudience(groups.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
    const title = seriesStartTitle(series.title, series.startDate, new Date(), APP_TIME_ZONE);

    const counts = { members: 0, invited: 0, others: 0, tokens: 0, failures: 0 };
    let last = null;
    for (;;) {
        let query = usersCollection()
            .where('is_verified', '==', true)
            .orderBy(FieldPath.documentId())
            .limit(USERS_PAGE_SIZE);
        if (last) query = query.startAfter(last);
        const page = await query.get();
        if (page.empty) break;

        await mapWithConcurrency(page.docs, SEND_CONCURRENCY, async (doc) => {
            const target = classifyUser(doc.id, audience);
            counts[COUNT_KEYS[target.kind]]++;
            try {
                const result = await sendToVerifiedUser(
                    doc.id, SETTINGS.reminders, buildSeriesReminderMessage(target, title), doc.data());
                counts.tokens += result.tokens;
                counts.failures += result.failureCount;
            } catch (error) {
                counts.failures++;
                logger.error('Error sending series reminder', { seriesId, userId: doc.id, error: errorDetails(error) });
            }
        });

        if (page.size < USERS_PAGE_SIZE) break;
        last = page.docs[page.size - 1];
    }
    logger.info('Sent challenge group series reminders', { seriesId, ...counts });
});
