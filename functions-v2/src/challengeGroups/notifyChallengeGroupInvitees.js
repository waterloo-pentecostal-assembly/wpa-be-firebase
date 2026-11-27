import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { errorDetails, mapWithConcurrency } from '../utils.js';
import {
    SEND_CONCURRENCY, SETTINGS, buildInviteMessage, groupNameOf, newlyInvitedIds,
} from './logic.js';
import { sendToVerifiedUser, userFullName } from './send.js';

const inviterNameFor = async (invite) => {
    const stored = typeof invite?.invited_by_name === 'string' ? invite.invited_by_name.trim() : '';
    return stored || await userFullName(invite?.invited_by) || 'Someone';
};

// Notify people who were just invited. Fire and forget: retries are off
// because nothing records what was sent.
export const notifyChallengeGroupInvitees = onDocumentWritten({
    document: '/challenge_groups/{groupId}',
    retry: false
}, async (event) => {
    const after = event.data?.after?.data();
    if (!after) return;
    const before = event.data?.before?.data() || {};

    const invitees = newlyInvitedIds(before, after);
    if (invitees.length === 0) return;

    const { groupId } = event.params;
    const groupName = groupNameOf(after);
    await mapWithConcurrency(invitees, SEND_CONCURRENCY, async (uid) => {
        try {
            const inviterName = await inviterNameFor(after.invites?.[uid]);
            await sendToVerifiedUser(uid, SETTINGS.updates, buildInviteMessage({ groupName, inviterName, groupId }));
        } catch (error) {
            logger.error('Error sending challenge group invite', { groupId, userId: uid, error: errorDetails(error) });
        }
    });
    logger.info('Notified challenge group invitees', { groupId, count: invitees.length });
});
