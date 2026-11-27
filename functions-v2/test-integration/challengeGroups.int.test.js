import { expect } from 'chai';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { addUser, change, clearFirestore, fcm, firestore, resetFcm, sentTo } from './setup.js';
import {
    notifyChallengeGroupInvitees,
    notifyChallengeGroupNewOwners,
    nudgeChallengeGroupMember,
    sendChallengeGroupSeriesReminders,
    syncChallengeGroupSnippets,
} from '../src/challengeGroups/index.js';

const HOUR = 60 * 60 * 1000;
const groups = () => firestore.collection('challenge_groups');
const series = () => firestore.collection('bible_series');
const nudges = () => firestore.collection('challenge_group_nudges');

const member = (uid, extra = {}) => ({ first_name: uid, last_name: 'Test', thumbnail: null, joined_at: Timestamp.fromMillis(1), ...extra });
const invite = (by, byName, extra = {}) => ({
    first_name: 'Inv', last_name: 'Ited', thumbnail: null, invited_by: by, invited_by_name: byName,
    invited_at: Timestamp.now(), ...extra
});

const addGroup = (id, data) => groups().doc(id).set({
    name: 'Night Owls', description: '', is_public: false, created_by: 'a', owner_ids: ['a'],
    created_at: Timestamp.now(), member_ids: ['a'], members: { a: member('a') },
    invited_ids: [], invites: {}, ...data
});

const addSeries = (id, data) => series().doc(id).set({
    title: 'John', start_date: Timestamp.fromDate(new Date('2020-01-06T12:00:00Z')),
    is_active: false, is_visible: true, ...data
});

const errorCode = async (promise) => {
    try {
        await promise;
    } catch (error) {
        return error.code;
    }
    return 'ok';
};

describe('challenge group functions (emulator)', () => {
    beforeEach(async () => {
        resetFcm();
        await clearFirestore();
    });

    describe('nudgeChallengeGroupMember', () => {
        const nudge = (callerId, data) => nudgeChallengeGroupMember.run({
            data, auth: callerId ? { uid: callerId, token: {} } : undefined
        });

        beforeEach(async () => {
            await addUser('a', { first_name: ' Ann ' });
            await addUser('b');
            await addGroup('G1', { member_ids: ['a', 'b'], members: { a: member('a'), b: member('b') } });
            await addSeries('s1', { is_active: true });
        });

        it('sends the nudge and records the rate limit', async () => {
            expect(await nudge('a', { groupId: 'G1', memberId: 'b' })).to.deep.equal({});
            expect(fcm.sent).to.have.lengthOf(1);
            const [message] = fcm.sent;
            expect(message.tokens).to.deep.equal(['tok_b']);
            expect(message.notification).to.deep.equal({
                title: 'Ann nudged you',
                body: 'Keep going with John. Night Owls is cheering you on!'
            });
            expect(message.data).to.include({ notificationType: 'challengeGroupNudge', groupId: 'G1' });
            expect(message.android.notification.tag).to.equal('nudge_G1');
            expect(message.apns.headers['apns-collapse-id']).to.equal('nudge_G1');

            const limit = (await nudges().doc('a_b').get()).data();
            expect(limit).to.include({ caller_id: 'a', member_id: 'b', group_id: 'G1' });
            expect(limit.expire_at.toMillis() - limit.last_nudged_at.toMillis()).to.equal(48 * HOUR);
        });

        it('omits the series when none is running', async () => {
            await series().doc('s1').update({ is_active: false });
            await nudge('a', { groupId: 'G1', memberId: 'b' });
            expect(fcm.sent[0].notification.body).to.equal('Night Owls is cheering you on!');
        });

        it('returns the contract error codes', async () => {
            await addGroup('G2', { member_ids: ['b'], members: { b: member('b') } });
            expect(await errorCode(nudge(null, { groupId: 'G1', memberId: 'b' }))).to.equal('unauthenticated');
            expect(await errorCode(nudge('a', { groupId: 'G1' }))).to.equal('invalid-argument');
            expect(await errorCode(nudge('a', { groupId: '', memberId: 'b' }))).to.equal('invalid-argument');
            expect(await errorCode(nudge('a', { groupId: 7, memberId: 'b' }))).to.equal('invalid-argument');
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'a' }))).to.equal('failed-precondition');
            expect(await errorCode(nudge('a', { groupId: 'NOPE', memberId: 'b' }))).to.equal('not-found');
            expect(await errorCode(nudge('a', { groupId: 'x/y', memberId: 'b' }))).to.equal('not-found');
            expect(await errorCode(nudge('a', { groupId: 'G2', memberId: 'b' }))).to.equal('permission-denied');
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'z' }))).to.equal('failed-precondition');
            expect(fcm.sent).to.have.lengthOf(0);
        });

        it('rate-limits for 20 hours', async () => {
            await nudge('a', { groupId: 'G1', memberId: 'b' });
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'b' }))).to.equal('resource-exhausted');
            await nudges().doc('a_b').update({ last_nudged_at: Timestamp.fromMillis(Date.now() - 21 * HOUR) });
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'b' }))).to.equal('ok');
            expect(fcm.sent).to.have.lengthOf(2);
        });

        it('rate-limits the pair across groups', async () => {
            await addGroup('G2', { member_ids: ['a', 'b'], members: { a: member('a'), b: member('b') } });
            await nudge('a', { groupId: 'G1', memberId: 'b' });
            expect(await errorCode(nudge('a', { groupId: 'G2', memberId: 'b' }))).to.equal('resource-exhausted');
            // The other direction is a different pair.
            expect(await errorCode(nudge('b', { groupId: 'G2', memberId: 'a' }))).to.equal('ok');
        });

        it('gives exactly one success for two concurrent calls', async () => {
            const results = await Promise.allSettled([
                nudge('a', { groupId: 'G1', memberId: 'b' }),
                nudge('a', { groupId: 'G1', memberId: 'b' }),
            ]);
            expect(results.filter((r) => r.status === 'fulfilled')).to.have.lengthOf(1);
            expect(results.find((r) => r.status === 'rejected').reason.code).to.equal('resource-exhausted');
            expect(fcm.sent).to.have.lengthOf(1);
        });

        it('succeeds silently for opted-out, token-less and unverified recipients', async () => {
            await firestore.doc('users/b/notification_settings/settings').set({ challenge_group_nudges: false });
            expect(await nudge('a', { groupId: 'G1', memberId: 'b' })).to.deep.equal({});

            await addUser('c', {}, { tokens: [] });
            await addUser('d', { is_verified: false });
            await groups().doc('G1').update({ member_ids: ['a', 'b', 'c', 'd'] });
            expect(await nudge('a', { groupId: 'G1', memberId: 'c' })).to.deep.equal({});
            expect(await nudge('a', { groupId: 'G1', memberId: 'd' })).to.deep.equal({});
            expect(fcm.sent).to.have.lengthOf(0);
        });

        it('sends when the setting is missing', async () => {
            await firestore.doc('users/b/notification_settings/settings').set({ prayers: true });
            await nudge('a', { groupId: 'G1', memberId: 'b' });
            expect(fcm.sent).to.have.lengthOf(1);
        });

        it('removes dead tokens without failing', async () => {
            fcm.dead = ['tok_b'];
            expect(await nudge('a', { groupId: 'G1', memberId: 'b' })).to.deep.equal({});
            expect((await firestore.doc('users/b/devices/tok_b').get()).exists).to.equal(false);
        });

        it('rolls back the rate limit when the send fails', async () => {
            fcm.fail = true;
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'b' }))).to.equal('internal');
            expect((await nudges().doc('a_b').get()).exists).to.equal(false);

            const earlier = Timestamp.fromMillis(Date.now() - 30 * HOUR);
            await nudges().doc('a_b').set({ caller_id: 'a', member_id: 'b', group_id: 'G1', last_nudged_at: earlier, expire_at: earlier });
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'b' }))).to.equal('internal');
            expect((await nudges().doc('a_b').get()).get('last_nudged_at').isEqual(earlier)).to.equal(true);

            fcm.fail = false;
            expect(await errorCode(nudge('a', { groupId: 'G1', memberId: 'b' }))).to.equal('ok');
        });
    });

    describe('notifyChallengeGroupInvitees', () => {
        const run = (data) => notifyChallengeGroupInvitees.run({ data, params: { groupId: 'G1' } });

        beforeEach(async () => {
            await addUser('a', { first_name: 'Ann', last_name: 'Lee' });
            await addUser('b');
            await addUser('c');
            await addGroup('G1', {});
        });

        it('sends one notification per new invitee', async () => {
            const ref = groups().doc('G1');
            await run(await change(ref, () => ref.update({
                invited_ids: ['b', 'c'],
                invites: { b: invite('a', 'Ann Lee'), c: invite('a', '') },
            })));
            expect(fcm.sent).to.have.lengthOf(2);
            expect(sentTo('b')[0].notification).to.deep.equal({
                title: 'You\'re invited to Night Owls',
                body: 'Ann Lee invited you to join their challenge group.'
            });
            expect(sentTo('b')[0].data).to.include({ notificationType: 'challengeGroupInvite', groupId: 'G1' });
            // Falls back to the inviter's user doc.
            expect(sentTo('c')[0].notification.body).to.equal('Ann Lee invited you to join their challenge group.');
        });

        it('handles invites on create', async () => {
            const ref = groups().doc('G2');
            await notifyChallengeGroupInvitees.run({
                data: await change(ref, () => addGroup('G2', { invited_ids: ['b'], invites: { b: invite('a', 'Ann Lee') } })),
                params: { groupId: 'G2' }
            });
            expect(sentTo('b')).to.have.lengthOf(1);
        });

        it('sends nothing for unrelated updates', async () => {
            const ref = groups().doc('G1');
            await ref.update({ invited_ids: ['b'], invites: { b: invite('a', 'Ann Lee') } });
            await run(await change(ref, () => ref.update({ name: 'Renamed' })));
            await run(await change(ref, () => ref.update({ 'member_ids': ['a', 'c'], 'members.c': member('c') })));
            await run(await change(ref, () => ref.update({ member_ids: ['a'] })));
            await run(await change(ref, () => ref.update({ 'members.a.first_name': 'Annie' })));
            expect(fcm.sent).to.have.lengthOf(0);
        });

        it('respects challenge_group_updates: false, and sends when it is missing', async () => {
            await firestore.doc('users/b/notification_settings/settings').set({ challenge_group_updates: false });
            const ref = groups().doc('G1');
            await run(await change(ref, () => ref.update({
                invited_ids: ['b', 'c'], invites: { b: invite('a', 'Ann'), c: invite('a', 'Ann') },
            })));
            expect(sentTo('b')).to.have.lengthOf(0);
            expect(sentTo('c')).to.have.lengthOf(1);
        });
    });

    describe('notifyChallengeGroupNewOwners', () => {
        const run = (data, authId) => notifyChallengeGroupNewOwners.run({
            data, params: { groupId: 'G1' }, authId, authType: authId ? 'unknown' : 'service_account'
        });

        beforeEach(async () => {
            await addUser('a', { first_name: 'Ann', last_name: 'Lee' });
            await addUser('b');
            await addUser('c');
            await addGroup('G1', {
                member_ids: ['a', 'b', 'c'],
                members: { a: member('a', { first_name: 'Ann', last_name: 'Lee' }), b: member('b'), c: member('c') },
            });
        });

        it('notifies only the new owner, naming the member who did it', async () => {
            const ref = groups().doc('G1');
            await run(await change(ref, () => ref.update({ owner_ids: ['a', 'b'] })), 'a');
            expect(fcm.sent).to.have.lengthOf(1);
            expect(sentTo('b')[0].notification).to.deep.equal({
                title: 'You\'re now an owner of Night Owls',
                body: 'Ann made you an owner. You can edit the group, add owners and remove members.'
            });
            expect(sentTo('b')[0].data).to.include({ notificationType: 'challengeGroupOwnerAdded', groupId: 'G1' });
        });

        it('notifies the new owner and not the creator on an older group', async () => {
            const ref = groups().doc('G1');
            await ref.update({ owner_ids: FieldValue.delete() });
            await run(await change(ref, () => ref.update({ owner_ids: ['a', 'c'] })), 'a');
            expect(fcm.sent).to.have.lengthOf(1);
            expect(sentTo('c')).to.have.lengthOf(1);
        });

        it('uses the succession copy when the last owner leaves', async () => {
            const ref = groups().doc('G1');
            await run(await change(ref, () => ref.update({
                'owner_ids': ['b'], 'member_ids': ['b', 'c'], 'members.a': FieldValue.delete(),
            })), 'a');
            expect(sentTo('b')[0].notification).to.deep.equal({
                title: 'You\'re now the owner of Night Owls',
                body: 'Ann Lee left the group and made you its owner.'
            });
        });

        it('uses the generic copy without a member auth context', async () => {
            const ref = groups().doc('G1');
            await run(await change(ref, () => ref.update({ owner_ids: ['a', 'b'] })), undefined);
            expect(sentTo('b')[0].notification.body).to.equal('You can now edit the group, add owners and remove members.');
        });

        it('sends nothing for removals, joins and renames', async () => {
            await addUser('d');
            const ref = groups().doc('G1');
            await run(await change(ref, () => ref.update({ member_ids: ['a', 'b'] })), 'a');
            await run(await change(ref, () => ref.update({ 'member_ids': ['a', 'b', 'd'], 'members.d': member('d') })), 'd');
            await run(await change(ref, () => ref.update({ name: 'Renamed' })), 'a');
            expect(fcm.sent).to.have.lengthOf(0);
        });
    });

    describe('syncChallengeGroupSnippets', () => {
        const run = (data, uid = 'u') => syncChallengeGroupSnippets.run({ data, params: { uid } });
        const joinedAt = Timestamp.fromMillis(12345);

        beforeEach(async () => {
            await addUser('u', { first_name: 'Old', last_name: 'Name', thumbnail: 'gs://b/old.jpg' });
            await addUser('m');
            const oldSnippet = { first_name: 'Old', last_name: 'Name', thumbnail: 'gs://b/old.jpg' };
            await addGroup('G1', {
                member_ids: ['u', 'm'],
                members: { u: { ...oldSnippet, joined_at: joinedAt }, m: member('m') },
                invited_ids: ['x'],
                invites: { x: invite('u', 'Old Name') },
            });
            await addGroup('G2', {
                member_ids: ['m'], members: { m: member('m') },
                invited_ids: ['u'], invites: { u: { ...invite('m', 'm Test'), ...oldSnippet } },
            });
        });

        it('updates members, invites and invited_by_name, and nothing else', async () => {
            const ref = firestore.doc('users/u');
            const g1Before = (await groups().doc('G1').get()).data();
            await run(await change(ref, () => ref.update({ first_name: ' New ', thumbnail: null })));

            const g1 = (await groups().doc('G1').get()).data();
            expect(g1.members.u).to.deep.equal({ first_name: 'New', last_name: 'Name', thumbnail: null, joined_at: joinedAt });
            expect(g1.invites.x.invited_by_name).to.equal('New Name');
            expect(g1.members.m).to.deep.equal(g1Before.members.m);
            expect({ ...g1, members: null, invites: null }).to.deep.equal({ ...g1Before, members: null, invites: null });
            expect({ ...g1.invites.x, invited_by_name: null }).to.deep.equal({ ...g1Before.invites.x, invited_by_name: null });

            const g2 = (await groups().doc('G2').get()).data();
            expect(g2.invites.u).to.include({ first_name: 'New', last_name: 'Name', thumbnail: null, invited_by: 'm' });
        });

        it('writes nothing for last_active or search_tokens changes', async () => {
            const ref = firestore.doc('users/u');
            const before = (await groups().doc('G1').get()).updateTime;
            await run(await change(ref, () => ref.update({ last_active: Timestamp.now(), search_tokens: ['ol'] })));
            expect((await groups().doc('G1').get()).updateTime.isEqual(before)).to.equal(true);
        });

        it('does not write when the stored snippets already match', async () => {
            const ref = firestore.doc('users/u');
            await run(await change(ref, () => ref.update({ first_name: 'New' })));
            const after = (await groups().doc('G1').get()).updateTime;
            // An event that passes the cheap filter but finds nothing to change.
            await run({ before: { data: () => ({ first_name: 'X' }) }, after: await ref.get() });
            expect((await groups().doc('G1').get()).updateTime.isEqual(after)).to.equal(true);
        });

        it('does not recreate an entry for a user who has left', async () => {
            // u left G1 (no longer a member) but is still found by the invite query of G3.
            await groups().doc('G1').update({ 'member_ids': ['m'], 'members.u': FieldValue.delete() });
            await addGroup('G3', { member_ids: ['m'], members: { m: member('m') }, invited_ids: ['u'], invites: {} });
            const ref = firestore.doc('users/u');
            await run(await change(ref, () => ref.update({ first_name: 'New' })));
            expect((await groups().doc('G1').get()).data().members).to.not.have.property('u');
            expect((await groups().doc('G3').get()).data().invites).to.deep.equal({});
        });

        it('converges on the latest name for out-of-order events', async () => {
            const ref = firestore.doc('users/u');
            const stale = await change(ref, () => ref.update({ first_name: 'Second' }));
            const latest = await change(ref, () => ref.update({ first_name: 'Third' }));
            await run(latest);
            await run(stale); // older event handled last
            expect((await groups().doc('G1').get()).data().members.u.first_name).to.equal('Third');
        });
    });

    describe('sendChallengeGroupSeriesReminders', () => {
        const run = (data, seriesId = 's1') => sendChallengeGroupSeriesReminders.run({ data, params: { seriesId } });

        beforeEach(async () => {
            for (const uid of ['one', 'two', 'inv', 'none']) await addUser(uid);
            await addUser('unverified', { is_verified: false });
            await addUser('optout', {}, { settings: { challenge_group_reminders: false } });
            await addGroup('GA', { name: 'Alpha', member_ids: ['one', 'two'], members: {} });
            await addGroup('GZ', {
                name: 'Zeta', member_ids: ['two'], members: {},
                invited_ids: ['inv', 'unverified'],
                invites: { inv: invite('two', 'Two Test'), unverified: invite('two', 'Two Test') },
            });
            await addSeries('s1', { is_active: false });
        });

        const activate = async (id = 's1') => {
            const ref = series().doc(id);
            await run(await change(ref, () => ref.update({ is_active: true })), id);
        };

        it('sends the right copy to each audience', async () => {
            await activate();
            expect(fcm.sent).to.have.lengthOf(4);

            const one = sentTo('one')[0];
            expect(one.notification).to.deep.equal({ title: 'John has started', body: 'Read it with Alpha and cheer each other on.' });
            expect(one.data).to.include({ notificationType: 'challengeGroupSeriesStarted', groupId: 'GA' });

            const two = sentTo('two')[0];
            expect(two.notification.body).to.equal('Read it with Alpha and Zeta and cheer each other on.');
            expect(two.data).to.not.have.property('groupId');

            const inv = sentTo('inv')[0];
            expect(inv.notification.body).to.equal('Two Test invited you to Zeta. Join them to read it together.');
            expect(inv.data).to.include({ notificationType: 'challengeGroupInvite', groupId: 'GZ' });

            const none = sentTo('none')[0];
            expect(none.notification.body).to.equal('Read it with others. Join a challenge group, or start one and invite friends.');
            expect(none.data.notificationType).to.equal('challengeGroupJoinPrompt');

            expect(sentTo('unverified')).to.have.lengthOf(0);
            expect(sentTo('optout')).to.have.lengthOf(0);
        });

        it('sends when a series is created already active', async () => {
            const ref = series().doc('s2');
            await run(await change(ref, () => addSeries('s2', {
                is_active: true, start_date: Timestamp.fromDate(new Date('2021-01-04T12:00:00Z')),
            })), 's2');
            expect(fcm.sent).to.have.lengthOf(4);
        });

        it('sends nothing for other series writes', async () => {
            const ref = series().doc('s1');
            await run(await change(ref, () => ref.update({ title: 'Renamed' })));
            await ref.update({ is_active: true });
            await run(await change(ref, () => ref.update({ title: 'Again' })));
            await run(await change(ref, () => ref.update({ is_active: true })));
            await run(await change(ref, () => ref.update({ is_active: false })));
            expect(fcm.sent).to.have.lengthOf(0);
        });

        it('sends again when a series is deactivated and reactivated', async () => {
            await activate();
            const ref = series().doc('s1');
            await run(await change(ref, () => ref.update({ is_active: false })));
            await activate();
            expect(fcm.sent).to.have.lengthOf(8);
        });

        it('sends nothing for a hidden series or one that is not the newest visible', async () => {
            await series().doc('s1').update({ is_visible: false });
            await activate();
            await series().doc('s1').update({ is_visible: true, is_active: false });
            await addSeries('s3', { start_date: Timestamp.fromDate(new Date('2025-01-06T12:00:00Z')) });
            await activate();
            expect(fcm.sent).to.have.lengthOf(0);
        });

        it('pages through more than 300 verified users', async () => {
            const writer = firestore.bulkWriter();
            for (let i = 0; i < 305; i++) {
                const uid = `bulk${String(i).padStart(3, '0')}`;
                writer.set(firestore.doc(`users/${uid}`), { first_name: uid, last_name: 'B', is_verified: true });
                writer.set(firestore.doc(`users/${uid}/notification_settings/settings`), {});
                writer.set(firestore.doc(`users/${uid}/devices/tok_${uid}`), { token: `tok_${uid}` });
            }
            await writer.close();
            await activate();
            expect(fcm.sent).to.have.lengthOf(309);
        });
    });
});
