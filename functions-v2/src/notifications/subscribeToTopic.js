import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getDeviceTokens, updateTopicSubscriptions } from '../helpers.js';
import { NOTIFICATION_TOPICS as TOPICS } from '../utils.js';

// Subscribe to or unsubscribe from topics when switch is toggled
export const engagementSub = onDocumentWritten('/users/{userId}/notification_settings/{notificationSettingsId}', async (event) => {
    // Get setting
    const newData = event.data.after.exists ? event.data.after.data() : {};
    const oldData = event.data.before.exists ? event.data.before.data() : {};

    // Only handle topics whose setting was changed
    const changedTopics = TOPICS.filter((topic) => (newData[topic] === true) !== (oldData[topic] === true));
    if (changedTopics.length === 0) return;

    const deviceTokens = await getDeviceTokens(event.params.userId);
    if (deviceTokens.length === 0) return;

    await updateTopicSubscriptions(deviceTokens, changedTopics.filter((topic) => newData[topic] === true), true);
    await updateTopicSubscriptions(deviceTokens, changedTopics.filter((topic) => newData[topic] !== true), false);

    // // Check for changes in threads_followed
    // const oldThreads = Array.isArray(oldData.threads_followed) ? oldData.threads_followed : [];
    // const newThreads = Array.isArray(newData.threads_followed) ? newData.threads_followed : [];

    // const addedThreads = newThreads.filter((x) => !oldThreads.includes(x));
    // const removedThreads = oldThreads.filter((x) => !newThreads.includes(x));

    // if (addedThreads.length > 0 || removedThreads.length > 0) {
    //     const deviceTokens = await getDeviceTokens(event.params.userId);
    //     if (deviceTokens.length > 0) {
    //         await updateTopicSubscriptions(deviceTokens, addedThreads, true);
    //         await updateTopicSubscriptions(deviceTokens, removedThreads, false);
    //     }
    // }
});
