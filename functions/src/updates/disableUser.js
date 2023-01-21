const { functions, auth } = require('../index');

exports.disableUser = functions
    .firestore
    .document('/account_deletion_requests/{documentId}')
    .onCreate(async (snapshot) => {
        const data = snapshot.data(); 
        const userId = date.user_id;
        await auth.updateUser(userId, {disabled: true});
    });