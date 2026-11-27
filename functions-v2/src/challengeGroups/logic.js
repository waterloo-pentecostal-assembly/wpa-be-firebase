// Pure challenge-group logic: diffs, copy and audience building. No Firebase
// imports, so it can be unit tested without credentials.
import { arrayField, buildNotification } from '../utils.js';

export const NUDGE_COOLDOWN_HOURS = 20;
export const NUDGE_TTL_DAYS = 2;
export const SEND_CONCURRENCY = 10;
export const NUDGES_COLLECTION = 'challenge_group_nudges';

// Notification settings added for challenge groups. A missing field means
// opted in (sent with defaultWhenMissing: true).
export const SETTINGS = {
    nudges: 'challenge_group_nudges',
    updates: 'challenge_group_updates',
    reminders: 'challenge_group_reminders'
};

export const NOTIFICATION_TYPES = {
    nudge: 'challengeGroupNudge',
    invite: 'challengeGroupInvite',
    ownerAdded: 'challengeGroupOwnerAdded',
    seriesStarted: 'challengeGroupSeriesStarted',
    joinPrompt: 'challengeGroupJoinPrompt'
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const unique = (values) => [...new Set(values)];

export const firstName = (user) => text(user?.first_name);
export const fullName = (user) => `${firstName(user)} ${text(user?.last_name)}`.trim();
export const groupNameOf = (group) => text(group?.name) || 'a challenge group';
export const isVerified = (user) => user?.is_verified === true;

// Same as the app's ownerIdsOf().
export const effectiveOwnerIds = (data) => {
    if (Array.isArray(data?.owner_ids)) return data.owner_ids;
    return data?.created_by ? [data.created_by] : [];
};

// ---------------------------------------------------------------------------
// Nudges
// ---------------------------------------------------------------------------

export const nudgeDocId = (callerId, memberId) => `${callerId}_${memberId}`;

// True when enough time has passed since the last nudge (or there was none).
export const nudgeAllowed = (lastNudgedAtMs, nowMs) =>
    typeof lastNudgedAtMs !== 'number' || nowMs - lastNudgedAtMs >= NUDGE_COOLDOWN_HOURS * HOUR_MS;

export const nudgeExpireAtMs = (nowMs) => nowMs + NUDGE_TTL_DAYS * DAY_MS;

export const buildNudgeMessage = ({ callerFirstName, groupName, seriesTitle, groupId }) => {
    const group = groupName || 'Your group';
    const body = seriesTitle ?
        `Keep going with ${seriesTitle}. ${group} is cheering you on!` :
        `${group} is cheering you on!`;
    const message = buildNotification({
        title: `${callerFirstName || 'Someone'} nudged you`,
        body,
        notificationType: NOTIFICATION_TYPES.nudge,
        data: { groupId: String(groupId) }
    });
    // Several nudges for the same group replace each other instead of stacking.
    const collapseKey = `nudge_${groupId}`;
    message.android.notification.tag = collapseKey;
    message.apns = { headers: { 'apns-collapse-id': collapseKey } };
    return message;
};

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

// Uids invited by this write: in after.invited_ids but not before, and not
// already members.
export const newlyInvitedIds = (before, after) => {
    const previous = new Set(arrayField(before, 'invited_ids'));
    const members = new Set(arrayField(after, 'member_ids'));
    return unique(arrayField(after, 'invited_ids'))
        .filter((uid) => !previous.has(uid) && !members.has(uid));
};

export const buildInviteMessage = ({ groupName, inviterName, groupId }) => buildNotification({
    title: `You're invited to ${groupName}`,
    body: `${inviterName || 'Someone'} invited you to join their challenge group.`,
    notificationType: NOTIFICATION_TYPES.invite,
    data: { groupId: String(groupId) }
});

// ---------------------------------------------------------------------------
// Owners
// ---------------------------------------------------------------------------

// Members who became owners in this update. Creation is not an update, so
// the creator is never notified; on older groups the creator is already an
// owner through created_by.
export const newOwnerIds = (before, after) => {
    if (!Array.isArray(after?.owner_ids)) return [];
    const previous = new Set(effectiveOwnerIds(before));
    const members = new Set(arrayField(after, 'member_ids'));
    return unique(after.owner_ids).filter((uid) => !previous.has(uid) && members.has(uid));
};

// Owners who were members before this update and are no longer members.
export const departedOwnerIds = (before, after) => {
    const membersBefore = new Set(arrayField(before, 'member_ids'));
    const membersAfter = new Set(arrayField(after, 'member_ids'));
    return effectiveOwnerIds(before).filter((uid) => membersBefore.has(uid) && !membersAfter.has(uid));
};

// Which copy a new owner gets:
//   succession: the last owner left and named them (leaverId);
//   madeOwner:  another member did it (actorId, from the event's auth context);
//   generic:    no usable auth context (admin, Admin SDK, ...).
export const ownerNotice = (before, after, newOwnerId, authId) => {
    const departed = departedOwnerIds(before, after);
    if (departed.length > 0) return { kind: 'succession', leaverId: departed[0] };
    if (authId && authId !== newOwnerId && arrayField(after, 'member_ids').includes(authId)) {
        return { kind: 'madeOwner', actorId: authId };
    }
    return { kind: 'generic' };
};

export const buildOwnerAddedMessage = ({ kind, groupName, leaverFullName, actorFirstName, groupId }) => {
    let title = `You're now an owner of ${groupName}`;
    let body = 'You can now edit the group, add owners and remove members.';
    if (kind === 'succession') {
        title = `You're now the owner of ${groupName}`;
        body = `${leaverFullName || 'Someone'} left the group and made you its owner.`;
    } else if (kind === 'madeOwner') {
        body = `${actorFirstName || 'Someone'} made you an owner. You can edit the group, add owners and remove members.`;
    }
    return buildNotification({
        title,
        body,
        notificationType: NOTIFICATION_TYPES.ownerAdded,
        data: { groupId: String(groupId) }
    });
};

// ---------------------------------------------------------------------------
// Snippets
// ---------------------------------------------------------------------------

const SNIPPET_FIELDS = ['first_name', 'last_name', 'thumbnail'];

// The user's display fields as the app stores them in group snippets.
export const userSnippet = (user) => ({
    first_name: firstName(user),
    last_name: text(user?.last_name),
    thumbnail: typeof user?.thumbnail === 'string' ? user.thumbnail : null
});

export const groupSnippetChanged = (before, after) => {
    const a = userSnippet(before);
    const b = userSnippet(after);
    return SNIPPET_FIELDS.some((field) => a[field] !== b[field]);
};

const isEntry = (value) => value !== null && typeof value === 'object';

// Field-path updates that bring a group's copies of `user` up to date.
// Returns { updates: [[pathSegments, value], ...], missing: [path, ...] }.
// Only existing map entries are updated, so a write never recreates an entry
// for someone who has left; missing entries are reported instead.
export const groupSnippetUpdates = (group, uid, user) => {
    const snippet = userSnippet(user);
    const updates = [];
    const missing = [];
    const memberIds = arrayField(group, 'member_ids');
    const invitedIds = arrayField(group, 'invited_ids');

    const syncEntry = (mapField) => {
        const entry = group?.[mapField]?.[uid];
        if (!isEntry(entry)) {
            missing.push(`${mapField}.${uid}`);
            return;
        }
        for (const field of SNIPPET_FIELDS) {
            if (entry[field] !== snippet[field]) updates.push([[mapField, uid, field], snippet[field]]);
        }
    };

    if (memberIds.includes(uid)) syncEntry('members');
    if (invitedIds.includes(uid)) syncEntry('invites');

    // Invites this user sent, while they are still a member.
    if (memberIds.includes(uid)) {
        const name = fullName(user);
        for (const invitee of unique(invitedIds)) {
            const invite = group?.invites?.[invitee];
            if (isEntry(invite) && invite.invited_by === uid && invite.invited_by_name !== name) {
                updates.push([['invites', invitee, 'invited_by_name'], name]);
            }
        }
    }
    return { updates, missing };
};

// ---------------------------------------------------------------------------
// Series reminders
// ---------------------------------------------------------------------------

// Only false -> true sends. Missing is_active, and a document that didn't
// exist before, count as false.
export const becameActive = (before, after) =>
    before?.is_active !== true && after?.is_active === true;

const dateKey = (date, timeZone) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// Title comparing start date and today as calendar dates in `timeZone`.
export const seriesStartTitle = (seriesTitle, startDate, now, timeZone) => {
    const title = seriesTitle || 'A new series';
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) return `${title} has started`;
    const start = dateKey(startDate, timeZone);
    const today = dateKey(now, timeZone);
    if (start === today) return `${title} starts today`;
    if (start < today) return `${title} has started`;
    const when = new Intl.DateTimeFormat('en-US', {
        timeZone, weekday: 'long', month: 'long', day: 'numeric'
    }).format(startDate);
    return `${title} starts ${when}`;
};

const millis = (value) => {
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    return 0;
};

const byName = (a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// From group docs [{ id, data }], build
//   groupsOf:  uid -> [{ id, name }] sorted by name
//   invitesOf: uid -> [{ groupId, groupName, inviterName, invitedAt }] newest first
export const buildAudience = (groups) => {
    const groupsOf = new Map();
    const invitesOf = new Map();
    const push = (map, uid, value) => {
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid).push(value);
    };

    for (const { id, data } of groups) {
        const name = groupNameOf(data);
        for (const uid of unique(arrayField(data, 'member_ids'))) push(groupsOf, uid, { id, name });
        for (const uid of unique(arrayField(data, 'invited_ids'))) {
            const invite = data?.invites?.[uid];
            push(invitesOf, uid, {
                groupId: id,
                groupName: name,
                inviterName: text(invite?.invited_by_name) || 'Someone',
                invitedAt: millis(invite?.invited_at)
            });
        }
    }
    for (const list of groupsOf.values()) list.sort(byName);
    for (const list of invitesOf.values()) list.sort((a, b) => b.invitedAt - a.invitedAt);
    return { groupsOf, invitesOf };
};

// member (in at least one group), invited (pending invite only) or other.
export const classifyUser = (uid, { groupsOf, invitesOf }) => {
    const groups = groupsOf.get(uid) || [];
    if (groups.length > 0) return { kind: 'member', groups };
    const invites = invitesOf.get(uid) || [];
    if (invites.length > 0) return { kind: 'invited', invite: invites[0] };
    return { kind: 'other' };
};

export const buildSeriesReminderMessage = (target, title) => {
    if (target.kind === 'member') {
        const [first, second] = target.groups;
        let body;
        const data = {};
        if (target.groups.length === 1) {
            body = `Read it with ${first.name} and cheer each other on.`;
            data.groupId = String(first.id);
        } else if (target.groups.length === 2) {
            body = `Read it with ${first.name} and ${second.name} and cheer each other on.`;
        } else {
            body = `Read it with ${first.name} and ${target.groups.length - 1} other groups and cheer each other on.`;
        }
        return buildNotification({ title, body, notificationType: NOTIFICATION_TYPES.seriesStarted, data });
    }
    if (target.kind === 'invited') {
        const { inviterName, groupName, groupId } = target.invite;
        return buildNotification({
            title,
            body: `${inviterName} invited you to ${groupName}. Join them to read it together.`,
            notificationType: NOTIFICATION_TYPES.invite,
            data: { groupId: String(groupId) }
        });
    }
    return buildNotification({
        title,
        body: 'Read it with others. Join a challenge group, or start one and invite friends.',
        notificationType: NOTIFICATION_TYPES.joinPrompt
    });
};
