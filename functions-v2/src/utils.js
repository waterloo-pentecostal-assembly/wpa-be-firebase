export const deepGet = (map, path, def) => {
    if (!Array.isArray(path)) {
        throw new TypeError('path should be an Array');
    }

    const key = path[0];

    if (typeof (map) !== 'object' || map === null || !(key in map)) {
        return def;
    }

    if (path.length === 1) {
        if (key in map) {
            return map[key];
        }
        return def;
    }

    return deepGet(map[key], path.slice(1), def);
};

// User-toggleable FCM topics. Keys must match notification_settings fields
// and the topic each sender publishes to. Keep senders and subscribers
// reading from this list so they cannot drift apart.
export const NOTIFICATION_TOPICS = [
    'daily_engagement_reminder',
    'new_forum_thread',
    'new_prayer_request',
    'new_testimony'
];

// Topics only admins receive.
export const ADMIN_TOPICS = [
    'user_signup_notifications',
    'user_delete_request',
    'new_testimony_for_approval',
    'new_prayer_request_for_approval'
];

// Coerce a value to display text and cap its length. Falsy values (missing,
// null, '', 0, false) fall back, matching the `text || fallback` it replaced.
export const truncateText = (text, maxLength = 50, fallback = '') => {
    if (!text) {
        return fallback;
    }
    const value = String(text);
    return value.length > maxLength ? `${value.substring(0, maxLength - 3)}...` : value;
};

// Loggable fields of an error. Error's message/stack are non-enumerable, so
// passing the object straight to the logger serialises it as {}.
export const errorDetails = (error) => {
    if (!(error instanceof Error)) {
        return { message: String(error) };
    }
    const details = { message: error.message, stack: error.stack };
    if (error.code) details.code = error.code;
    return details;
};

// Per-token failures from an FCM response. FCM reports rejected tokens in the
// response instead of throwing. Handles both topic management responses
// ({ errors: [{ index, error }] }) and multicast responses
// ({ responses: [{ success, error }] }). Stacks are dropped; they only point
// into the SDK.
export const tokenFailures = (response) => {
    const failure = (index, error) => {
        const { message, code } = errorDetails(error);
        return code ? { index, code, message } : { index, message };
    };

    if (!response) return [];
    if (Array.isArray(response.errors)) {
        return response.errors.map(({ index, error }) => failure(index, error));
    }
    if (Array.isArray(response.responses)) {
        return response.responses.flatMap((result, index) =>
            (result.success ? [] : [failure(index, result.error)]));
    }
    return [];
};

const CLICK_ACTION = 'FLUTTER_NOTIFICATION_CLICK';

// Common FCM message shape the Flutter app expects. Pass `topic` for topic
// sends; multicast sends add `tokens` at send time. FCM `data` values must
// be strings.
export const buildNotification = ({ title, body, notificationType, data = {}, topic }) => {
    const message = {
        notification: { title, body },
        data: { ...data, notificationType, click_action: CLICK_ACTION },
        android: {
            notification: {
                clickAction: CLICK_ACTION
            }
        }
    };
    if (topic) message.topic = topic;
    return message;
};

// Array field from a Firestore doc, or [] if missing/not an array.
export const arrayField = (doc, field) => (doc && Array.isArray(doc[field]) ? doc[field] : []);

// True when a doc has just become approved (created approved, or flipped to
// approved), so later edits to an approved doc don't re-notify.
export const becameApproved = (before, after) =>
    !!after && after.is_approved === true && !(before && before.is_approved === true);

// Build the FCM payload for a newly created forum thread. Pure so it can be
// unit-tested without Firebase credentials.
export const buildNewForumThreadPayload = (threadData, params = {}) => {
    const data = {};
    if (params.forumId) data.forumId = String(params.forumId);
    if (params.threadId) data.threadId = String(params.threadId);

    return buildNotification({
        title: 'New Thread',
        body: truncateText(threadData && threadData.title, 50, 'A new forum thread was created.'),
        notificationType: 'newForumThread',
        data,
        topic: 'new_forum_thread'
    });
};

// Fields copied into prayer_requests.user_snippet. Only changes to these
// require the snippet to be rewritten.
export const USER_SNIPPET_FIELDS = ['first_name', 'last_name', 'thumbnail'];

export const userSnippetChanged = (before = {}, after = {}) =>
    USER_SNIPPET_FIELDS.some((field) => before?.[field] !== after?.[field]);

// Time zone the scheduled jobs run in (dailyEngagementReminder). Calendar-date
// comparisons for notifications use it too.
export const APP_TIME_ZONE = 'America/Toronto';

// Whether a notification setting is on. Existing settings are opt-in (missing
// means off). Settings added later pass defaultWhenMissing: true so users who
// never saw the toggle still get them; only an explicit false opts out.
export const settingEnabled = (settings, settingKey, defaultWhenMissing = false) => {
    if (!settings) return false;
    if (defaultWhenMissing) return settings[settingKey] !== false;
    return !!settings[settingKey];
};

// FCM error codes meaning the token will never work again.
const DEAD_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token'
]);

// Tokens from a multicast response that FCM reports as permanently invalid.
// `tokens` must be in the same order as the request.
export const deadTokens = (tokens, response) => {
    if (!response || !Array.isArray(response.responses)) return [];
    return response.responses.flatMap((result, index) =>
        (!result.success && DEAD_TOKEN_CODES.has(result.error?.code) ? [tokens[index]] : []));
};

// Map with at most `limit` calls of `fn` in flight. Results keep input order.
export const mapWithConcurrency = async (items, limit, fn) => {
    const results = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index], index);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
};
