const { functions, auth, client } = require('../index');

exports.sendVerificationEmail = functions
    .firestore
    .document('/users/{documentId}')
    .onUpdate(async (change) => {
        const newData = change.after.data();

        const { email } = newData;

        if (newData['is_verified']) {
            const authUser = await auth.getUserByEmail(email);
            const { uid } = authUser;
            if (!authUser.emailVerified) {
                const token = await auth.createCustomToken(uid);
                await client.auth().signInWithCustomToken(token);
                await client.auth().currentUser.sendEmailVerification();
                client.auth().signOut();
            }
        }
    });