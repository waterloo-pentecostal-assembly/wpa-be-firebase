// Shared setup for the emulator integration tests (npm run test:integration).
// Refuses to run outside the Firestore emulator and replaces FCM with a
// recorder, so nothing is ever sent.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Integration tests must run against the Firestore emulator (npm run test:integration).');
}

const { firestore, messaging } = await import('../src/firebase.js');

export { firestore };

export const fcm = { sent: [], dead: [], fail: false };

messaging.sendEachForMulticast = async (message) => {
    if (fcm.fail) throw new Error('FCM unavailable');
    fcm.sent.push(message);
    const responses = message.tokens.map((token) => (fcm.dead.includes(token) ?
        { success: false, error: { code: 'messaging/registration-token-not-registered', message: 'gone' } } :
        { success: true, messageId: `id-${token}` }));
    const failureCount = responses.filter((r) => !r.success).length;
    return { responses, successCount: responses.length - failureCount, failureCount };
};
for (const method of ['send', 'sendEach', 'subscribeToTopic', 'unsubscribeFromTopic']) {
    messaging[method] = async () => {
        throw new Error(`messaging.${method} is not stubbed in integration tests`);
    };
}

export const resetFcm = () => {
    fcm.sent = [];
    fcm.dead = [];
    fcm.fail = false;
};

export const clearFirestore = async () => {
    for (const collection of await firestore.listCollections()) {
        await firestore.recursiveDelete(collection);
    }
};

// users/{uid} plus a notification_settings doc (null for none) and devices.
export const addUser = async (uid, data = {}, { settings = {}, tokens = [`tok_${uid}`] } = {}) => {
    const ref = firestore.collection('users').doc(uid);
    await ref.set({ first_name: uid, last_name: 'Test', thumbnail: null, is_verified: true, ...data });
    if (settings) await ref.collection('notification_settings').doc('settings').set(settings);
    for (const token of tokens) {
        await ref.collection('devices').doc(token).set({ token, platform: 'android' });
    }
    return ref;
};

// Run `mutate` and return the Change ({ before, after }) it produced.
export const change = async (ref, mutate) => {
    const before = await ref.get();
    await mutate();
    const after = await ref.get();
    return { before, after };
};

export const sentTo = (uid) => fcm.sent.filter((m) => m.tokens.includes(`tok_${uid}`));
