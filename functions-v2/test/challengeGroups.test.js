import { expect } from 'chai';
import {
    NOTIFICATION_TYPES,
    becameActive,
    buildAudience,
    buildInviteMessage,
    buildNudgeMessage,
    buildOwnerAddedMessage,
    buildSeriesReminderMessage,
    classifyUser,
    departedOwnerIds,
    effectiveOwnerIds,
    firstName,
    fullName,
    groupSnippetChanged,
    groupSnippetUpdates,
    newOwnerIds,
    newlyInvitedIds,
    nudgeAllowed,
    nudgeExpireAtMs,
    ownerNotice,
    seriesStartTitle,
    userSnippet,
} from '../src/challengeGroups/logic.js';
import { deadTokens, mapWithConcurrency, settingEnabled } from '../src/utils.js';

const HOUR = 60 * 60 * 1000;
const TZ = 'America/Toronto';
const ts = (ms) => ({ toMillis: () => ms });

const allStrings = (data) => Object.values(data).every((v) => typeof v === 'string');

describe('challenge groups', () => {
    describe('names', () => {
        it('trims names and falls back to empty', () => {
            expect(firstName({ first_name: '  Mary ' })).to.equal('Mary');
            expect(fullName({ first_name: ' Mary ', last_name: ' Smith ' })).to.equal('Mary Smith');
            expect(fullName({ last_name: 'Smith' })).to.equal('Smith');
            expect(fullName({ first_name: null })).to.equal('');
            expect(fullName(undefined)).to.equal('');
        });
    });

    describe('effectiveOwnerIds', () => {
        it('uses owner_ids when it is an array', () => {
            expect(effectiveOwnerIds({ owner_ids: ['a', 'b'], created_by: 'c' })).to.deep.equal(['a', 'b']);
            expect(effectiveOwnerIds({ owner_ids: [], created_by: 'c' })).to.deep.equal([]);
        });

        it('falls back to created_by on older groups', () => {
            expect(effectiveOwnerIds({ created_by: 'c' })).to.deep.equal(['c']);
            expect(effectiveOwnerIds({})).to.deep.equal([]);
            expect(effectiveOwnerIds(undefined)).to.deep.equal([]);
        });
    });

    describe('settingEnabled', () => {
        it('treats missing as off by default (existing settings)', () => {
            expect(settingEnabled({}, 'prayers')).to.equal(false);
            expect(settingEnabled({ prayers: true }, 'prayers')).to.equal(true);
        });

        it('treats missing as on with defaultWhenMissing; only false opts out', () => {
            expect(settingEnabled({}, 'challenge_group_nudges', true)).to.equal(true);
            expect(settingEnabled({ challenge_group_nudges: true }, 'challenge_group_nudges', true)).to.equal(true);
            expect(settingEnabled({ challenge_group_nudges: false }, 'challenge_group_nudges', true)).to.equal(false);
        });

        it('sends nothing when there is no settings doc', () => {
            expect(settingEnabled(null, 'challenge_group_nudges', true)).to.equal(false);
        });
    });

    describe('deadTokens', () => {
        it('picks tokens with permanent FCM errors only', () => {
            const response = {
                responses: [
                    { success: true },
                    { success: false, error: { code: 'messaging/registration-token-not-registered' } },
                    { success: false, error: { code: 'messaging/internal-error' } },
                    { success: false, error: { code: 'messaging/invalid-registration-token' } },
                ]
            };
            expect(deadTokens(['t1', 't2', 't3', 't4'], response)).to.deep.equal(['t2', 't4']);
            expect(deadTokens(['t1'], undefined)).to.deep.equal([]);
        });
    });

    describe('mapWithConcurrency', () => {
        it('keeps order and caps in-flight calls', async () => {
            let inFlight = 0;
            let peak = 0;
            const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
                inFlight++;
                peak = Math.max(peak, inFlight);
                await new Promise((r) => setTimeout(r, 5));
                inFlight--;
                return n * 2;
            });
            expect(result).to.deep.equal([2, 4, 6, 8, 10]);
            expect(peak).to.equal(2);
            expect(await mapWithConcurrency([], 10, async () => 1)).to.deep.equal([]);
        });
    });

    describe('nudge', () => {
        it('allows a nudge after 20 hours, not before', () => {
            const now = 100 * HOUR;
            expect(nudgeAllowed(undefined, now)).to.equal(true);
            expect(nudgeAllowed(now - 19.9 * HOUR, now)).to.equal(false);
            expect(nudgeAllowed(now - 20 * HOUR, now)).to.equal(true);
        });

        it('expires the rate-limit doc after 2 days', () => {
            expect(nudgeExpireAtMs(0)).to.equal(48 * HOUR);
        });

        it('builds the nudge payload with a per-group collapse key', () => {
            const message = buildNudgeMessage({
                callerFirstName: 'Mary', groupName: 'Night Owls', seriesTitle: 'John', groupId: 'ABC234'
            });
            expect(message.notification).to.deep.equal({
                title: 'Mary nudged you',
                body: 'Keep going with John. Night Owls is cheering you on!'
            });
            expect(message.data.notificationType).to.equal('challengeGroupNudge');
            expect(message.data.groupId).to.equal('ABC234');
            expect(allStrings(message.data)).to.equal(true);
            expect(message.android.notification.tag).to.equal('nudge_ABC234');
            expect(message.apns.headers['apns-collapse-id']).to.equal('nudge_ABC234');
        });

        it('omits the series when none is running, and falls back to Someone', () => {
            const message = buildNudgeMessage({ callerFirstName: '', groupName: 'Night Owls', seriesTitle: null, groupId: 'G' });
            expect(message.notification.title).to.equal('Someone nudged you');
            expect(message.notification.body).to.equal('Night Owls is cheering you on!');
        });
    });

    describe('newlyInvitedIds', () => {
        it('returns uids added to invited_ids', () => {
            expect(newlyInvitedIds({ invited_ids: ['a'] }, { invited_ids: ['a', 'b', 'c'] })).to.deep.equal(['b', 'c']);
        });

        it('treats a create as an empty before', () => {
            expect(newlyInvitedIds({}, { invited_ids: ['a'] })).to.deep.equal(['a']);
            expect(newlyInvitedIds(undefined, { invited_ids: ['a'] })).to.deep.equal(['a']);
        });

        it('excludes uids that are members', () => {
            expect(newlyInvitedIds({}, { invited_ids: ['a', 'b'], member_ids: ['b'] })).to.deep.equal(['a']);
        });

        it('is empty for unrelated updates and removals', () => {
            expect(newlyInvitedIds({ invited_ids: ['a', 'b'] }, { invited_ids: ['a', 'b'], name: 'x' })).to.deep.equal([]);
            expect(newlyInvitedIds({ invited_ids: ['a', 'b'] }, { invited_ids: ['a'] })).to.deep.equal([]);
        });

        it('builds the invite payload', () => {
            const message = buildInviteMessage({ groupName: 'Night Owls', inviterName: 'Mary Smith', groupId: 'G' });
            expect(message.notification).to.deep.equal({
                title: 'You\'re invited to Night Owls',
                body: 'Mary Smith invited you to join their challenge group.'
            });
            expect(message.data.notificationType).to.equal('challengeGroupInvite');
            expect(message.data.groupId).to.equal('G');
            expect(buildInviteMessage({ groupName: 'X', inviterName: '', groupId: 'G' }).notification.body)
                .to.equal('Someone invited you to join their challenge group.');
        });
    });

    describe('owners', () => {
        const before = { created_by: 'c', owner_ids: ['c'], member_ids: ['c', 'a', 'b'], members: {} };

        it('returns members added to owner_ids', () => {
            expect(newOwnerIds(before, { ...before, owner_ids: ['c', 'a'] })).to.deep.equal(['a']);
        });

        it('does not notify the creator of an older group on the first owner_ids write', () => {
            const old = { created_by: 'c', member_ids: ['c', 'a'] };
            expect(newOwnerIds(old, { ...old, owner_ids: ['c', 'a'] })).to.deep.equal(['a']);
        });

        it('ignores non-members and a missing owner_ids', () => {
            expect(newOwnerIds(before, { ...before, owner_ids: ['c', 'z'] })).to.deep.equal([]);
            expect(newOwnerIds({ created_by: 'c' }, { created_by: 'c', member_ids: ['c'] })).to.deep.equal([]);
        });

        it('is empty for joins, removals and renames', () => {
            expect(newOwnerIds(before, { ...before, member_ids: ['c', 'a', 'b', 'd'] })).to.deep.equal([]);
            expect(newOwnerIds(before, { ...before, member_ids: ['c', 'a'] })).to.deep.equal([]);
            expect(newOwnerIds(before, { ...before, name: 'New' })).to.deep.equal([]);
        });

        it('detects succession when the last owner leaves', () => {
            const after = { ...before, owner_ids: ['a'], member_ids: ['a', 'b'] };
            expect(departedOwnerIds(before, after)).to.deep.equal(['c']);
            expect(ownerNotice(before, after, 'a', 'c')).to.deep.equal({ kind: 'succession', leaverId: 'c' });
        });

        it('uses madeOwner when another member did it', () => {
            const after = { ...before, owner_ids: ['c', 'a'] };
            expect(ownerNotice(before, after, 'a', 'c')).to.deep.equal({ kind: 'madeOwner', actorId: 'c' });
        });

        it('uses generic without a usable auth context', () => {
            const after = { ...before, owner_ids: ['c', 'a'] };
            expect(ownerNotice(before, after, 'a', undefined)).to.deep.equal({ kind: 'generic' });
            expect(ownerNotice(before, after, 'a', 'admin-not-member')).to.deep.equal({ kind: 'generic' });
            expect(ownerNotice(before, after, 'a', 'a')).to.deep.equal({ kind: 'generic' });
        });

        it('builds each owner copy', () => {
            const s = buildOwnerAddedMessage({ kind: 'succession', groupName: 'G1', leaverFullName: 'Mary Smith', groupId: 'G' });
            expect(s.notification).to.deep.equal({
                title: 'You\'re now the owner of G1',
                body: 'Mary Smith left the group and made you its owner.'
            });
            const m = buildOwnerAddedMessage({ kind: 'madeOwner', groupName: 'G1', actorFirstName: 'Mary', groupId: 'G' });
            expect(m.notification).to.deep.equal({
                title: 'You\'re now an owner of G1',
                body: 'Mary made you an owner. You can edit the group, add owners and remove members.'
            });
            const g = buildOwnerAddedMessage({ kind: 'generic', groupName: 'G1', groupId: 'G' });
            expect(g.notification).to.deep.equal({
                title: 'You\'re now an owner of G1',
                body: 'You can now edit the group, add owners and remove members.'
            });
            expect(g.data.notificationType).to.equal('challengeGroupOwnerAdded');
            expect(g.data.groupId).to.equal('G');
            expect(buildOwnerAddedMessage({ kind: 'succession', groupName: 'G1', leaverFullName: '', groupId: 'G' })
                .notification.body).to.equal('Someone left the group and made you its owner.');
        });
    });

    describe('snippets', () => {
        const user = { first_name: ' Mary ', last_name: 'Smith ', thumbnail: 'gs://b/p.jpg', last_active: 1 };

        it('normalizes the snippet', () => {
            expect(userSnippet(user)).to.deep.equal({ first_name: 'Mary', last_name: 'Smith', thumbnail: 'gs://b/p.jpg' });
            expect(userSnippet({})).to.deep.equal({ first_name: '', last_name: '', thumbnail: null });
        });

        it('only reports changes to trimmed names and thumbnail', () => {
            expect(groupSnippetChanged(user, { ...user, last_active: 2, search_tokens: ['ma'] })).to.equal(false);
            expect(groupSnippetChanged(user, { ...user, first_name: 'Mary' })).to.equal(false);
            expect(groupSnippetChanged({ first_name: 'a' }, { first_name: 'a', thumbnail: null })).to.equal(false);
            expect(groupSnippetChanged(user, { ...user, first_name: 'Maria' })).to.equal(true);
            expect(groupSnippetChanged(user, { ...user, thumbnail: null })).to.equal(true);
        });

        const group = {
            member_ids: ['u', 'm2'],
            members: {
                u: { first_name: 'Old', last_name: 'Smith', thumbnail: 'gs://b/p.jpg', joined_at: 1 },
                m2: { first_name: 'Bob', last_name: 'B', thumbnail: null, joined_at: 2 },
            },
            invited_ids: ['i1', 'i2'],
            invites: {
                i1: { first_name: 'I', last_name: 'One', invited_by: 'u', invited_by_name: 'Old Smith' },
                i2: { first_name: 'I', last_name: 'Two', invited_by: 'm2', invited_by_name: 'Bob B' },
                ghost: { invited_by: 'u', invited_by_name: 'Old Smith' },
            },
        };

        it('updates only differing fields, never joined_at', () => {
            const { updates, missing } = groupSnippetUpdates(group, 'u', { first_name: 'Mary', last_name: 'Smith', thumbnail: 'gs://b/p.jpg' });
            expect(updates).to.deep.equal([
                [['members', 'u', 'first_name'], 'Mary'],
                [['invites', 'i1', 'invited_by_name'], 'Mary Smith'],
            ]);
            expect(missing).to.deep.equal([]);
        });

        it('updates the invite snippet of an invitee', () => {
            const { updates } = groupSnippetUpdates(group, 'i1', { first_name: 'Ivy', last_name: 'One' });
            expect(updates).to.deep.equal([
                [['invites', 'i1', 'first_name'], 'Ivy'],
                [['invites', 'i1', 'thumbnail'], null],
            ]);
        });

        it('returns nothing when everything matches', () => {
            const { updates } = groupSnippetUpdates(group, 'm2', { first_name: 'Bob', last_name: 'B' });
            expect(updates).to.deep.equal([]);
        });

        it('skips missing entries and users no longer in the arrays', () => {
            const g = { member_ids: ['u'], members: {}, invited_ids: [], invites: {} };
            expect(groupSnippetUpdates(g, 'u', user)).to.deep.equal({ updates: [], missing: ['members.u'] });
            const left = { member_ids: [], members: { u: { first_name: 'Old' } }, invited_ids: ['i1'], invites: group.invites };
            expect(groupSnippetUpdates(left, 'u', user)).to.deep.equal({ updates: [], missing: [] });
        });
    });

    describe('becameActive', () => {
        it('is true only for false -> true', () => {
            expect(becameActive({ is_active: false }, { is_active: true })).to.equal(true);
            expect(becameActive({}, { is_active: true })).to.equal(true);
            expect(becameActive(undefined, { is_active: true })).to.equal(true);
            expect(becameActive({ is_active: true }, { is_active: true })).to.equal(false);
            expect(becameActive({ is_active: true }, { is_active: false })).to.equal(false);
            expect(becameActive({ is_active: false }, { is_active: false })).to.equal(false);
            expect(becameActive({ is_active: false }, undefined)).to.equal(false);
        });
    });

    describe('seriesStartTitle', () => {
        const now = new Date('2026-03-09T16:00:00Z'); // Mon Mar 9, 12:00 in Toronto

        it('handles today, the past and the future', () => {
            expect(seriesStartTitle('John', new Date('2026-03-09T05:00:00Z'), now, TZ)).to.equal('John starts today');
            expect(seriesStartTitle('John', new Date('2026-03-01T05:00:00Z'), now, TZ)).to.equal('John has started');
            expect(seriesStartTitle('John', new Date('2026-03-10T05:00:00Z'), now, TZ))
                .to.equal('John starts Tuesday, March 10');
        });

        it('compares calendar dates in the app time zone, not UTC', () => {
            // 23:30 Mar 9 in Toronto (already Mar 10 in UTC).
            const lateEvening = new Date('2026-03-10T03:30:00Z');
            // 00:30 Mar 10 in Toronto.
            const start = new Date('2026-03-10T04:30:00Z');
            expect(seriesStartTitle('John', start, lateEvening, TZ)).to.equal('John starts Tuesday, March 10');
            expect(seriesStartTitle('John', start, lateEvening, 'UTC')).to.equal('John starts today');
            // 23:00 Mar 9 in Toronto is still "today" on Mar 9.
            expect(seriesStartTitle('John', new Date('2026-03-10T03:00:00Z'), now, TZ)).to.equal('John starts today');
        });

        it('falls back when the title or start date is missing', () => {
            expect(seriesStartTitle('', new Date('2026-03-09T16:00:00Z'), now, TZ)).to.equal('A new series starts today');
            expect(seriesStartTitle('John', null, now, TZ)).to.equal('John has started');
        });
    });

    describe('audience', () => {
        const groups = [
            { id: 'g1', data: { name: 'Zeta', member_ids: ['a', 'b'], invited_ids: ['c'], invites: { c: { invited_by_name: 'Old', invited_at: ts(1) } } } },
            { id: 'g2', data: { name: 'Alpha', member_ids: ['a'], invited_ids: ['c'], invites: { c: { invited_by_name: ' Mary ', invited_at: ts(5) } } } },
            { id: 'g3', data: { name: 'Mid', member_ids: ['a'], invited_ids: ['b', 'd'], invites: { b: { invited_by_name: 'X' } } } },
        ];
        const audience = buildAudience(groups);

        it('sorts groups by name and invites newest first', () => {
            expect(audience.groupsOf.get('a').map((g) => g.name)).to.deep.equal(['Alpha', 'Mid', 'Zeta']);
            expect(audience.invitesOf.get('c').map((i) => i.groupId)).to.deep.equal(['g2', 'g1']);
            expect(audience.invitesOf.get('d')[0].inviterName).to.equal('Someone');
        });

        it('classifies members, invitees and others', () => {
            expect(classifyUser('a', audience).kind).to.equal('member');
            expect(classifyUser('b', audience).kind).to.equal('member'); // member wins over invite
            expect(classifyUser('c', audience)).to.deep.equal({
                kind: 'invited', invite: { groupId: 'g2', groupName: 'Alpha', inviterName: 'Mary', invitedAt: 5 }
            });
            expect(classifyUser('z', audience)).to.deep.equal({ kind: 'other' });
        });

        it('formats copy for 1, 2 and 3+ groups', () => {
            const one = buildSeriesReminderMessage({ kind: 'member', groups: [{ id: 'g1', name: 'Zeta' }] }, 'T');
            expect(one.notification).to.deep.equal({ title: 'T', body: 'Read it with Zeta and cheer each other on.' });
            expect(one.data.notificationType).to.equal(NOTIFICATION_TYPES.seriesStarted);
            expect(one.data.groupId).to.equal('g1');

            const two = buildSeriesReminderMessage({ kind: 'member', groups: [{ id: 'g2', name: 'Alpha' }, { id: 'g1', name: 'Zeta' }] }, 'T');
            expect(two.notification.body).to.equal('Read it with Alpha and Zeta and cheer each other on.');
            expect(two.data).to.not.have.property('groupId');

            const three = buildSeriesReminderMessage(classifyUser('a', audience), 'T');
            expect(three.notification.body).to.equal('Read it with Alpha and 2 other groups and cheer each other on.');
            expect(three.data).to.not.have.property('groupId');
        });

        it('formats invite and join-prompt copy', () => {
            const invited = buildSeriesReminderMessage(classifyUser('c', audience), 'T');
            expect(invited.notification.body).to.equal('Mary invited you to Alpha. Join them to read it together.');
            expect(invited.data.notificationType).to.equal('challengeGroupInvite');
            expect(invited.data.groupId).to.equal('g2');

            const other = buildSeriesReminderMessage({ kind: 'other' }, 'T');
            expect(other.notification.body).to.equal('Read it with others. Join a challenge group, or start one and invite friends.');
            expect(other.data.notificationType).to.equal('challengeGroupJoinPrompt');
            expect(allStrings(other.data)).to.equal(true);
        });
    });
});
