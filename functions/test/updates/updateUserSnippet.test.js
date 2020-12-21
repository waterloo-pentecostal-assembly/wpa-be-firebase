const expect = require('chai').expect;

const { test, firestore } = require('../index');
const { updatePrayerRequestUserSnippet } = require('../../src/updates/updateUserSnippet');

describe('updatePrayerRequestUserSnippet', () => {
    let prayerRequestId1;
    let prayerRequestId2;
    const userId = 'testUser001';

    before(async () => {
        // Wrap updatePrayerRequestUserSnippet
        this.wrappedUpdatePrayerRequestUserSnippet = test.wrap(updatePrayerRequestUserSnippet);

        // Create test prayer requests
        const ref = await firestore.collection('prayer_requests').add({
            'request': 'testRequest001',
            'user_id': userId
        });

        const ref2 = await firestore.collection('prayer_requests').add({
            'request': 'testRequest002',
            'user_id': userId
        });

        // Store ids for cleanup
        prayerRequestId1 = ref.id;
        prayerRequestId2 = ref2.id;
    });

    after(async () => {
        test.cleanup();

        // delete created firestore data
        await firestore.collection('prayer_requests').doc(prayerRequestId1).delete();
        await firestore.collection('prayer_requests').doc(prayerRequestId2).delete();
    });

    it('should update user_snippet for each prayer request for that user when user data is updated', async () => {
        // Define data
        const beforeData = {
            'id': userId,
            'first_name': 'test',
            'last_name': 'user',
            'profile_photo_gs_location': 'gs://testLocation'
        };

        const afterData = {
            'id': userId,
            'first_name': 'testAfter',
            'last_name': 'userAfter',
            'profile_photo_gs_location': 'gs://testLocationAfter'
        };

        // Make snapshot for state of database beforehand
        const before = test.firestore.makeDocumentSnapshot(beforeData, `users/${userId}`);

        // Make snapshot for state of database after the change
        const after = test.firestore.makeDocumentSnapshot(afterData, `users/${userId}`);

        const change = test.makeChange(before, after);

        // Call wrapped function with the Change object
        await this.wrappedUpdatePrayerRequestUserSnippet(change);

        // Get updated prayer request and assert
        const updatedPrayerRequestSnapshot = await firestore
            .collection('prayer_requests')
            .where('user_id', '==', userId)
            .get();

        expect(updatedPrayerRequestSnapshot.empty).to.be.false;

        updatedPrayerRequestSnapshot.forEach(async (doc) => {
            const data = doc.data();
            expect(data).to.exist;
            expect(data['user_snippet']['first_name']).to.equal(afterData['first_name']);
            expect(data['user_snippet']['last_name']).to.equal(afterData['last_name']);
            expect(data['user_snippet']['profile_photo_gs_location']).to.equal(afterData['profile_photo_gs_location']);
        });
    });
});

// Useful link: https://firebase.google.com/docs/functions/unit-testing