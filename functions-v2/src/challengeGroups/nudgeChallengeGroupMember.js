import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../firebase.js';
import { currentActiveSeries } from '../helpers.js';
import { arrayField, errorDetails } from '../utils.js';
import {
    NUDGES_COLLECTION, SETTINGS, buildNudgeMessage, firstName, groupNameOf,
    nudgeAllowed, nudgeDocId, nudgeExpireAtMs,
} from './logic.js';
import { groupsCollection, sendToVerifiedUser, usersCollection } from './send.js';

const isId = (value) => typeof value === 'string' && value.length > 0;

// Claim the caller->member rate limit. Throws resource-exhausted inside the
// transaction, so two concurrent taps give one success. Returns the previous
// rate-limit data (or null) for rollback.
const claimNudge = (ref, { callerId, memberId, groupId, now }) =>
    firestore.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const previous = snapshot.exists ? snapshot.data() : null;
        if (previous && !nudgeAllowed(previous.last_nudged_at?.toMillis?.(), now.toMillis())) {
            throw new HttpsError('resource-exhausted', 'You nudged them recently. Try again later.');
        }
        tx.set(ref, {
            caller_id: callerId,
            member_id: memberId,
            group_id: groupId,
            last_nudged_at: now,
            expire_at: Timestamp.fromMillis(nudgeExpireAtMs(now.toMillis()))
        });
        return previous;
    });

// Undo our claim, unless another nudge has claimed the pair since.
const releaseNudge = async (ref, previous, now) => {
    try {
        await firestore.runTransaction(async (tx) => {
            const snapshot = await tx.get(ref);
            if (!snapshot.exists || !snapshot.get('last_nudged_at')?.isEqual?.(now)) return;
            if (previous) tx.set(ref, previous);
            else tx.delete(ref);
        });
    } catch (error) {
        logger.error('Error rolling back nudge rate limit', { path: ref.path, error: errorDetails(error) });
    }
};

// Called by the app: httpsCallable('nudgeChallengeGroupMember').call({groupId, memberId}).
// The error codes are part of the contract with the app.
export const nudgeChallengeGroupMember = onCall(async (request) => {
    const callerId = request.auth?.uid;
    if (!callerId) throw new HttpsError('unauthenticated', 'Sign in to send a nudge.');

    const { groupId, memberId } = request.data || {};
    if (!isId(groupId) || !isId(memberId)) {
        throw new HttpsError('invalid-argument', 'groupId and memberId are required.');
    }
    if (memberId === callerId) throw new HttpsError('failed-precondition', 'You cannot nudge yourself.');
    // A path separator can't be a group id.
    if (groupId.includes('/')) throw new HttpsError('not-found', 'Group not found.');

    const groupSnapshot = await groupsCollection().doc(groupId).get();
    if (!groupSnapshot.exists) throw new HttpsError('not-found', 'Group not found.');
    const group = groupSnapshot.data();
    const memberIds = arrayField(group, 'member_ids');
    if (!memberIds.includes(callerId)) throw new HttpsError('permission-denied', 'You are not in this group.');
    if (!memberIds.includes(memberId)) throw new HttpsError('failed-precondition', 'They are not in this group.');

    // Build the message before claiming the limit, so a failed lookup
    // doesn't use up the caller's nudge.
    const [callerSnapshot, series] = await Promise.all([
        usersCollection().doc(callerId).get(),
        currentActiveSeries()
    ]);
    const message = buildNudgeMessage({
        callerFirstName: firstName(callerSnapshot.data()) || firstName(group.members?.[callerId]),
        groupName: groupNameOf(group),
        seriesTitle: series?.title,
        groupId
    });

    const ref = firestore.collection(NUDGES_COLLECTION).doc(nudgeDocId(callerId, memberId));
    const now = Timestamp.now();
    const previous = await claimNudge(ref, { callerId, memberId, groupId, now });

    try {
        await sendToVerifiedUser(memberId, SETTINGS.nudges, message);
    } catch (error) {
        logger.error('Error sending nudge', { groupId, callerId, memberId, error: errorDetails(error) });
        await releaseNudge(ref, previous, now);
        throw new HttpsError('internal', 'Unable to send nudge.');
    }
    return {};
});
