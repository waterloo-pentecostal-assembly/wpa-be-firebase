import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { FieldPath } from 'firebase-admin/firestore';
import { firestore } from '../firebase.js';
import { errorDetails, mapWithConcurrency } from '../utils.js';
import { SEND_CONCURRENCY, groupSnippetChanged, groupSnippetUpdates } from './logic.js';
import { groupsCollection, usersCollection } from './send.js';

// Keep the copies of a user's name and photo inside challenge groups up to
// date: members.<uid>, invites.<uid>, and invited_by_name on invites they sent.
export const syncChallengeGroupSnippets = onDocumentUpdated('/users/{uid}', async (event) => {
    // Ignores writes that don't touch the snippet fields (last_active,
    // search_tokens, ...), including other functions' writes.
    if (!groupSnippetChanged(event.data?.before?.data(), event.data?.after?.data())) return;

    const { uid } = event.params;
    const userRef = usersCollection().doc(uid);
    if (!(await userRef.get()).exists) return;

    const [memberOf, invitedTo] = await Promise.all([
        groupsCollection().where('member_ids', 'array-contains', uid).get(),
        groupsCollection().where('invited_ids', 'array-contains', uid).get()
    ]);
    const refs = new Map();
    [...memberOf.docs, ...invitedTo.docs].forEach((doc) => refs.set(doc.id, doc.ref));

    let updated = 0;
    let failed = 0;
    await mapWithConcurrency([...refs.values()], SEND_CONCURRENCY, async (groupRef) => {
        try {
            const changed = await firestore.runTransaction(async (tx) => {
                // Re-read both inside the transaction so retried or
                // out-of-order events converge on the latest user values.
                const [group, user] = await tx.getAll(groupRef, userRef);
                if (!group.exists || !user.exists) return false;
                const { updates, missing } = groupSnippetUpdates(group.data(), uid, user.data());
                if (missing.length > 0) {
                    logger.warn('Challenge group snippet entry missing, skipping', { groupId: group.id, userId: uid, missing });
                }
                if (updates.length === 0) return false;
                const fieldsAndValues = updates.flatMap(([path, value]) => [new FieldPath(...path), value]);
                tx.update(groupRef, ...fieldsAndValues);
                return true;
            });
            if (changed) updated++;
        } catch (error) {
            failed++;
            logger.error('Error syncing challenge group snippet', { groupId: groupRef.id, userId: uid, error: errorDetails(error) });
        }
    });
    logger.info('Synced challenge group snippets', { userId: uid, groups: refs.size, updated, failed });
});
