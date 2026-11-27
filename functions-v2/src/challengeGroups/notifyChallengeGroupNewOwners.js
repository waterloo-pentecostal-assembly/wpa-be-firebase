import { onDocumentUpdatedWithAuthContext } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { errorDetails } from '../utils.js';
import {
    SETTINGS, buildOwnerAddedMessage, firstName, fullName, groupNameOf,
    newOwnerIds, ownerNotice,
} from './logic.js';
import { sendToVerifiedUser, usersCollection } from './send.js';

const actorFirstName = async (after, actorId) => {
    const fromSnippet = firstName(after.members?.[actorId]);
    if (fromSnippet) return fromSnippet;
    const snapshot = await usersCollection().doc(actorId).get();
    return firstName(snapshot.data());
};

// Notify members who were just made an owner. Fire and forget: retries off.
export const notifyChallengeGroupNewOwners = onDocumentUpdatedWithAuthContext({
    document: '/challenge_groups/{groupId}',
    retry: false
}, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const owners = newOwnerIds(before, after);
    if (owners.length === 0) return;

    const { groupId } = event.params;
    const groupName = groupNameOf(after);
    for (const ownerId of owners) {
        try {
            const notice = ownerNotice(before, after, ownerId, event.authId);
            const message = buildOwnerAddedMessage({
                kind: notice.kind,
                groupName,
                groupId,
                leaverFullName: notice.kind === 'succession' ? fullName(before.members?.[notice.leaverId]) : '',
                actorFirstName: notice.kind === 'madeOwner' ? await actorFirstName(after, notice.actorId) : ''
            });
            await sendToVerifiedUser(ownerId, SETTINGS.updates, message);
            logger.info('Notified new challenge group owner', { groupId, userId: ownerId, kind: notice.kind });
        } catch (error) {
            logger.error('Error notifying new challenge group owner', { groupId, userId: ownerId, error: errorDetails(error) });
        }
    }
});
