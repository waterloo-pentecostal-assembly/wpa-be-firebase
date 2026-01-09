import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { auth, clientAuth } from '../firebase.js';
import { signInWithCustomToken, sendEmailVerification, signOut } from 'firebase/auth';

export const sendVerificationEmail = onDocumentUpdated('/users/{documentId}', async (event) => {
    const newData = event.data.after.data();
    const pastData = event.data.before.data();

    // check up in place to prevent error occuring when user is assigned addmin role
    if (newData['is_verified'] !== pastData['is_verified']) {
        const { email } = newData;

        if (newData['is_verified']) {
            const authUser = await auth.getUserByEmail(email);
            const { uid } = authUser;
            if (!authUser.emailVerified) {
                const token = await auth.createCustomToken(uid);
                await signInWithCustomToken(clientAuth, token);
                if (clientAuth.currentUser) {
                    await sendEmailVerification(clientAuth.currentUser);
                    await signOut(clientAuth);
                }
            }
        }
    }
});
