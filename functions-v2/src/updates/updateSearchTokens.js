import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
    SEARCH_TOKENS_FIELD, groupSearchText, tokensUpdate, userSearchText,
} from '../search.js';

const NOT_FOUND = 5;
const FAILED_PRECONDITION = 9;

const syncTokens = async (event, toText) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const tokens = tokensUpdate(after.data(), toText);
    if (!tokens) return;
    try {
        // Only write if the document hasn't changed since this event.
        // Otherwise a newer event (which will compute the right tokens)
        // is on its way.
        await after.ref.update(
            { [SEARCH_TOKENS_FIELD]: tokens },
            { lastUpdateTime: after.updateTime },
        );
    } catch (error) {
        if (error.code === NOT_FOUND || error.code === FAILED_PRECONDITION) {
            return; // deleted or changed since; nothing to do
        }
        throw error;
    }
};

export const updateUserSearchTokens = onDocumentWritten(
    '/users/{uid}', (event) => syncTokens(event, userSearchText));

export const updateGroupSearchTokens = onDocumentWritten(
    '/challenge_groups/{groupId}', (event) => syncTokens(event, groupSearchText));
