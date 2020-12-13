const firebase = require("@firebase/rules-unit-testing");

const TEST_PROJECT_ID = 'test-wpa-be-app';
const myId = 'user_abc';
const myEmail = 'user_abc@mail.com';
const theirId = 'user_xyz';
const myAuth = {
    uid: myId,
    email: myEmail
};

getTestFirestore = (auth) => {
    return firebase.initializeTestApp({ projectId: TEST_PROJECT_ID, auth: auth }).firestore();
};

getAdminFirestore = () => {
    return firebase.initializeAdminApp({ projectId: TEST_PROJECT_ID }).firestore();
};

clearFirestoreData = async () => {
    return firebase.clearFirestoreData({ projectId: TEST_PROJECT_ID });
};

describe('WPA BE Firestore Rules', () => {
    beforeEach(async () => {
        await clearFirestoreData();
    });

    after(async () => {
        await clearFirestoreData();
    });

    describe('bible_series collection', () => {
        it('Can read items from bible_series collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("bible_series");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read items from bible_series collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("bible_series");
            await firebase.assertFails(testQuery.get());
        });

        it('Can\'t write to bible_series collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("bible_series");
            await firebase.assertFails(testQuery.add({}));
        });

        it('Can\'t write to bible_series collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("bible_series");
            await firebase.assertFails(testQuery.add({}));
        });

        describe('series_content sub-collection', () => {

            it('Can read items from bible_series collection if signed in', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("bible_series").doc("series_content_id").collection("series_content");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('Can\'t read items from series_content collection if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("series_content").doc("series_content_id").collection("series_content");
                await firebase.assertFails(testQuery.get());
            });

            it('Can\'t write to series_content collection if signed in', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("series_content").doc("series_content_id").collection("series_content");
                await firebase.assertFails(testQuery.add({}));
            });

            it('Can\'t write to series_content collection if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("series_content").doc("series_content_id").collection("series_content");
                await firebase.assertFails(testQuery.add({}));
            });
        });
    });

    describe('media collection', () => {
        it('Can read items from media collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("media");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read items from media collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("media");
            await firebase.assertFails(testQuery.get());
        });

        it('Can\'t write to media collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("media");
            await firebase.assertFails(testQuery.add({}));
        });

        it('Can\'t write to media collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("media");
            await firebase.assertFails(testQuery.add({}));
        });
    });

    describe('users collection', () => {
        it('Can read a user document with same ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read a user document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertFails(testQuery.get());
        });

        it('Can\'t read a user document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(theirId);
            await firebase.assertFails(testQuery.get());
        });

        it('Can write to a user document with same ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertSucceeds(testQuery.set({}));
        });

        it('Can\'t write to a user document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('Can\'t write to a user document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(theirId);
            await firebase.assertFails(testQuery.set({}));
        });

        describe('notification_settings sub collection', () => {
            it('Can read a notification_setting document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('Can\'t read a notification_setting document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertFails(testQuery.get());
            });

            it('Can\'t read a notification_setting document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("notification_settings");
                await firebase.assertFails(testQuery.get());
            });

            it('Can write to a notification_setting document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertSucceeds(testQuery.add({}));
            });

            it('Can\'t write to a notification_setting document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertFails(testQuery.add({}));
            });

            it('Can\'t write to a notification_setting document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("notification_settings");
                await firebase.assertFails(testQuery.add({}));
            });
        });

        describe('devices sub collection', () => {
            it('Can read a device document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('Can\'t read a device document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertFails(testQuery.get());
            });

            it('Can\'t read a device document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("devices");
                await firebase.assertFails(testQuery.get());
            });

            it('Can write to a device document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertSucceeds(testQuery.add({}));
            });

            it('Can\'t write to a device document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertFails(testQuery.add({}));
            });

            it('Can\'t write to a device document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("devices");
                await firebase.assertFails(testQuery.add({}));
            });
        });
    });

    describe('achievements collection', () => {
        it('Can read an achievement document with same ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read an achievement document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertFails(testQuery.get());
        });

        it('Can\'t read an achievement document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(theirId);
            await firebase.assertFails(testQuery.get());
        });

        it('Can\'t write to an achievement', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('Can\'t write to an achievement document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('Can\'t write to an achievement document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(theirId);
            await firebase.assertFails(testQuery.set({}));
        });
    });

    describe('notifications collection', () => {
        it('Can read items from notifications collection with same user_id as signed in user', async () => {
            const admin = getAdminFirestore();
            const notificationId = "myUserNotificationId";
            await admin.collection("notifications").doc(notificationId).set({ "user_id": myId });

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("notifications").doc(notificationId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read items from notifications collection with different user_id as signed in user', async () => {
            const admin = getAdminFirestore();
            const notificationId = "theirUserNotificationId";
            await admin.collection("notifications").doc(notificationId).set({ "user_id": theirId });

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("notifications").doc(notificationId);
            await firebase.assertFails(testQuery.get());
        });

        it('Can\'t write to notifications collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("notifications");
            await firebase.assertFails(testQuery.add({}));
        });

        it('Can\'t write to notifications collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("notifications");
            await firebase.assertFails(testQuery.add({}));
        });
    });

    describe('prayer_requests collection', () => {
        it('Can read a prayer_request document if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read a prayer_request document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("prayer_requests");
            await firebase.assertFails(testQuery.get());
        });

        it('Can create a prayer_request document with same user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const prayerRequestData = { "user_id": myId };
            const testQuery = db.collection("prayer_requests");
            await firebase.assertSucceeds(testQuery.add(prayerRequestData));
        });

        it('Can\'t create a prayer_request document with different user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const prayerRequestData = { "user_id": theirId };
            const testQuery = db.collection("prayer_requests");
            await firebase.assertFails(testQuery.add(prayerRequestData));
        });

        it('Can update a prayer_request document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "myPrayerRequestId";
            const prayerRequestData = { "user_id": myId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertSucceeds(testQuery.set({}));
        });

        it('Can\'t update a prayer_request document with other user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "theirPrayerRequestId";
            const prayerRequestData = { "user_id": theirId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('Can delete a prayer_request document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "myPrayerRequestId";
            const prayerRequestData = { "user_id": myId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertSucceeds(testQuery.delete());
        });

        it('Can\'t delete a prayer_request document with other user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "theirPrayerRequestId";
            const prayerRequestData = { "user_id": theirId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertFails(testQuery.delete());
        });
    });

    describe('completions collection', () => {
        it('Can read a completion document if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('Can\'t read a completion document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("completions");
            await firebase.assertFails(testQuery.get());
        });

        it('Can create a completion document with same user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const completionData = { "user_id": myId };
            const testQuery = db.collection("completions");
            await firebase.assertSucceeds(testQuery.add(completionData));
        });

        it('Can\'t create a completion document with different user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const completionData = { "user_id": theirId };
            const testQuery = db.collection("completions");
            await firebase.assertFails(testQuery.add(completionData));
        });

        it('Can update a completion document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "myCompletionId";
            const completionData = { "user_id": myId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertSucceeds(testQuery.set({}));
        });

        it('Can\'t update a completion document with different user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "theirCompletionId";
            const completionData = { "user_id": theirId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('Can delete a completion document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "myCompletionId";
            const completionData = { "user_id": myId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertSucceeds(testQuery.delete());
        });

        it('Can\'t delete a completion document with different user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "theirCompletionId";
            const completionData = { "user_id": theirId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertFails(testQuery.delete());
        });

        describe('responses sub-collection', () => {
            it('Can read a responses document if signed in', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc("completions-id").collection("responses");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('Can\'t read a responses document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("completions").doc("completions-id").collection("responses");
                await firebase.assertFails(testQuery.get());
            });

            it('Can create a responses document with same user_id as our user', async () => {
                const db = getTestFirestore(myAuth);
                const responseData = { "user_id": myId };
                const testQuery = db.collection("completions").doc("completions-id").collection("responses");
                await firebase.assertSucceeds(testQuery.add(responseData));
            });

            it('Can\'t create a responses document with different user_id as our user', async () => {
                const db = getTestFirestore(myAuth);
                const responseData = { "user_id": theirId };
                const testQuery = db.collection("completions").doc("completions-id").collection("responses");
                await firebase.assertFails(testQuery.add(responseData));
            });

            it('Can update a responses document with same user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": myId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertSucceeds(testQuery.set(responseData));
            });

            it('Can\'t update a responses document with different user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": theirId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertFails(testQuery.set(responseData));
            });

            it('Can delete a responses document with same user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": myId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertSucceeds(testQuery.delete());
            });

            it('Can\'t delete a responses document with different user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": theirId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertFails(testQuery.delete());
            });
        });
    });
});