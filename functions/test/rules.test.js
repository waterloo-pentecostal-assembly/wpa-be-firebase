const firebase = require("@firebase/rules-unit-testing");

const TEST_PROJECT_ID = 'wpa-be-app-dev';
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

describe('firestore rules', () => {
    beforeEach(async () => {
        await clearFirestoreData();
    });

    after(async () => {
        await clearFirestoreData();
    });

    describe('bible_series collection', () => {
        it('can read items from bible_series collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("bible_series");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read items from bible_series collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("bible_series");
            await firebase.assertFails(testQuery.get());
        });

        it('can\'t write to bible_series collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("bible_series");
            await firebase.assertFails(testQuery.add({}));
        });

        it('can\'t write to bible_series collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("bible_series");
            await firebase.assertFails(testQuery.add({}));
        });

        describe('series_content sub-collection', () => {

            it('can read items from bible_series collection if signed in', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("bible_series").doc("series_content_id").collection("series_content");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('can\'t read items from series_content collection if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("series_content").doc("series_content_id").collection("series_content");
                await firebase.assertFails(testQuery.get());
            });

            it('can\'t write to series_content collection if signed in', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("series_content").doc("series_content_id").collection("series_content");
                await firebase.assertFails(testQuery.add({}));
            });

            it('can\'t write to series_content collection if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("series_content").doc("series_content_id").collection("series_content");
                await firebase.assertFails(testQuery.add({}));
            });
        });
    });

    describe('media collection', () => {
        it('can read items from media collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("media");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read items from media collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("media");
            await firebase.assertFails(testQuery.get());
        });

        it('can\'t write to media collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("media");
            await firebase.assertFails(testQuery.add({}));
        });

        it('can\'t write to media collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("media");
            await firebase.assertFails(testQuery.add({}));
        });
    });

    describe('users collection', () => {
        it('can read a user document with same ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read a user document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertFails(testQuery.get());
        });

        it('can\'t read a user document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(theirId);
            await firebase.assertFails(testQuery.get());
        });

        it('can write to a user document with same ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertSucceeds(testQuery.set({}));
        });

        it('can\'t write to a user document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("users").doc(myId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('can\'t write to a user document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("users").doc(theirId);
            await firebase.assertFails(testQuery.set({}));
        });

        describe('notification_settings sub collection', () => {
            it('can read a notification_setting document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('can\'t read a notification_setting document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertFails(testQuery.get());
            });

            it('can\'t read a notification_setting document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("notification_settings");
                await firebase.assertFails(testQuery.get());
            });

            it('can write to a notification_setting document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertSucceeds(testQuery.add({}));
            });

            it('can\'t write to a notification_setting document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("notification_settings");
                await firebase.assertFails(testQuery.add({}));
            });

            it('can\'t write to a notification_setting document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("notification_settings");
                await firebase.assertFails(testQuery.add({}));
            });
        });

        describe('devices sub collection', () => {
            it('can read a device document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertSucceeds(testQuery.get());
            });

            it('can\'t read a device document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertFails(testQuery.get());
            });

            it('can\'t read a device document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("devices");
                await firebase.assertFails(testQuery.get());
            });

            it('can write to a device document with same ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertSucceeds(testQuery.add({}));
            });

            it('can\'t write to a device document if not signed in', async () => {
                const db = getTestFirestore();
                const testQuery = db.collection("users").doc(myId).collection("devices");
                await firebase.assertFails(testQuery.add({}));
            });

            it('can\'t write to a device document with different ID as our user', async () => {
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("users").doc(theirId).collection("devices");
                await firebase.assertFails(testQuery.add({}));
            });
        });
    });

    describe('achievements collection', () => {
        it('can read an achievement document with same ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read an achievement document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertFails(testQuery.get());
        });

        it('can\'t read an achievement document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(theirId);
            await firebase.assertFails(testQuery.get());
        });

        it('can\'t write to an achievement', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('can\'t write to an achievement document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("achievements").doc(myId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('can\'t write to an achievement document with different ID as our user', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("achievements").doc(theirId);
            await firebase.assertFails(testQuery.set({}));
        });
    });

    describe('notifications collection', () => {
        it('can read items from notifications collection with same user_id as signed in user', async () => {
            const admin = getAdminFirestore();
            const notificationId = "myUserNotificationId";
            await admin.collection("notifications").doc(notificationId).set({ "user_id": myId });

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("notifications").doc(notificationId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read items from notifications collection with different user_id as signed in user', async () => {
            const admin = getAdminFirestore();
            const notificationId = "theirUserNotificationId";
            await admin.collection("notifications").doc(notificationId).set({ "user_id": theirId });

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("notifications").doc(notificationId);
            await firebase.assertFails(testQuery.get());
        });

        it('can\'t write to notifications collection if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("notifications");
            await firebase.assertFails(testQuery.add({}));
        });

        it('can\'t write to notifications collection if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("notifications");
            await firebase.assertFails(testQuery.add({}));
        });
    });

    describe('prayer_requests collection', () => {
        it('can read a prayer_request document if signed in', async () => {
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests");
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read a prayer_request document if not signed in', async () => {
            const db = getTestFirestore();
            const testQuery = db.collection("prayer_requests");
            await firebase.assertFails(testQuery.get());
        });

        it('can create a prayer_request document with same user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const prayerRequestData = { "user_id": myId };
            const testQuery = db.collection("prayer_requests");
            await firebase.assertSucceeds(testQuery.add(prayerRequestData));
        });

        it('can\'t create a prayer_request document with different user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const prayerRequestData = { "user_id": theirId };
            const testQuery = db.collection("prayer_requests");
            await firebase.assertFails(testQuery.add(prayerRequestData));
        });

        it('can update a prayer_request document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "myPrayerRequestId";
            const prayerRequestData = { "user_id": myId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertSucceeds(testQuery.set({}));
        });

        it('can\'t update a prayer_request document with other user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "theirPrayerRequestId";
            const prayerRequestData = { "user_id": theirId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('can delete a prayer_request document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const prayerRequestId = "myPrayerRequestId";
            const prayerRequestData = { "user_id": myId };
            await admin.collection("prayer_requests").doc(prayerRequestId).set(prayerRequestData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("prayer_requests").doc(prayerRequestId);
            await firebase.assertSucceeds(testQuery.delete());
        });

        it('can\'t delete a prayer_request document with other user_id as our user', async () => {
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
        it('can read a completion document with same user_id as signed in user', async () => {
            const admin = getAdminFirestore();
            const completionId = "myUserCompletionId";
            await admin.collection("completions").doc(completionId).set({"user_id": myId})
             
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertSucceeds(testQuery.get());
        });

        it('can\'t read a completion document if user_id not same as signed in user', async () => {
            const admin = getAdminFirestore();
            const completionId = "theirUserCompletionId";
            await admin.collection("completions").doc(completionId).set({"user_id": theirId})
             
            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertFails(testQuery.get());
        });

        it('can create a completion document with same user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const completionData = { "user_id": myId };
            const testQuery = db.collection("completions");
            await firebase.assertSucceeds(testQuery.add(completionData));
        });

        it('can\'t create a completion document with different user_id as our user', async () => {
            const db = getTestFirestore(myAuth);
            const completionData = { "user_id": theirId };
            const testQuery = db.collection("completions");
            await firebase.assertFails(testQuery.add(completionData));
        });

        it('can update a completion document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "myCompletionId";
            const completionData = { "user_id": myId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertSucceeds(testQuery.set({}));
        });

        it('can\'t update a completion document with different user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "theirCompletionId";
            const completionData = { "user_id": theirId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertFails(testQuery.set({}));
        });

        it('can delete a completion document with same user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "myCompletionId";
            const completionData = { "user_id": myId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertSucceeds(testQuery.delete());
        });

        it('can\'t delete a completion document with different user_id as our user', async () => {
            const admin = getAdminFirestore();
            const completionId = "theirCompletionId";
            const completionData = { "user_id": theirId };
            await admin.collection("completions").doc(completionId).set(completionData);

            const db = getTestFirestore(myAuth);
            const testQuery = db.collection("completions").doc(completionId);
            await firebase.assertFails(testQuery.delete());
        });

        describe('responses sub-collection', () => {
            it('can read a responses document with same user_id as signed in user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myUserCompletionId";
                const responsesId = "myUserResponsesId";
                await admin.collection("completions").doc(completionId).set({"user_id": myId});
                await admin.collection("completions").doc(completionId).collection("responses").doc(responsesId).set({"user_id": myId});
                
                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responsesId);
                await firebase.assertSucceeds(testQuery.get());
            });

            it('can\'t read a responses document if user_id not same as signed in user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myUserCompletionId";
                const responsesId = "myUserResponsesId";
                await admin.collection("completions").doc(completionId).set({"user_id": theirId});
                await admin.collection("completions").doc(completionId).collection("responses").doc(responsesId).set({"user_id": theirId});

                const db = getTestFirestore();
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responsesId);
                await firebase.assertFails(testQuery.get());
            });

            it('can create a responses document with same user_id as our user', async () => {
                const db = getTestFirestore(myAuth);
                const responseData = { "user_id": myId };
                const testQuery = db.collection("completions").doc("completions-id").collection("responses");
                await firebase.assertSucceeds(testQuery.add(responseData));
            });

            it('can\'t create a responses document with different user_id as our user', async () => {
                const db = getTestFirestore(myAuth);
                const responseData = { "user_id": theirId };
                const testQuery = db.collection("completions").doc("completions-id").collection("responses");
                await firebase.assertFails(testQuery.add(responseData));
            });

            it('can update a responses document with same user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": myId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertSucceeds(testQuery.set(responseData));
            });

            it('can\'t update a responses document with different user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": theirId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertFails(testQuery.set(responseData));
            });

            it('can delete a responses document with same user_id as our user', async () => {
                const admin = getAdminFirestore();
                const completionId = "myCompletionId";
                const responseId = "myCompletionId";
                const responseData = { "user_id": myId };
                await admin.collection("completions").doc(completionId).collection("responses").doc(responseId).set(responseData);

                const db = getTestFirestore(myAuth);
                const testQuery = db.collection("completions").doc(completionId).collection("responses").doc(responseId);
                await firebase.assertSucceeds(testQuery.delete());
            });

            it('can\'t delete a responses document with different user_id as our user', async () => {
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