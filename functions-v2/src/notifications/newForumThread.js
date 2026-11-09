import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { sendToTopic } from '../helpers.js';
import { buildNewForumThreadPayload } from '../utils.js';

// Notify users subscribed to the new_forum_thread topic when a thread is
// created. Uses onDocumentCreated (not onDocumentWritten) so later thread
// updates do not re-send a "New Thread" notification.
export const newForumThread = onDocumentCreated('/forums/{forumId}/threads/{threadId}', async (event) => {
    logger.info('newForumThread triggered', {
        forumId: event.params.forumId,
        threadId: event.params.threadId
    });

    if (!event.data) {
        logger.warn('newForumThread: missing event data, exiting');
        return;
    }

    await sendToTopic(buildNewForumThreadPayload(event.data.data(), event.params));
});
