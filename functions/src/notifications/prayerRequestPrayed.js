const { firestore, functions, messaging, admin } = require('../index');

exports.prayerRequestPrayedNotification = functions
    .firestore
    .document('/prayer_requests/{documentId}')
    .onUpdate(async (change, context) => {
        const pastValue = change.before.data();
        const newValue = change.after.data();
    if((pastValue.prayed_by != null && newValue.prayed_by.length > pastValue.prayed_by.length) 
        || (pastValue.prayed_by == null && newValue.prayed_by !=null)){
            const deviceTokenSnapshot = await firestore
                .collection('users')
                .doc(newValue.user_id)
                .collection('devices')
                .get();

            const deviceTokens = [];
            if(!deviceTokenSnapshot.empty){
                deviceTokenSnapshot.forEach((doc) => {
                    deviceTokens.push(doc.id);
                })
            }

            const notificationPayload = {
                notification: {
                    title: 'Prayer Request',
                    body: 'Your Prayer Request has been prayed by someone!',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: {
                    notificationType: 'prayerRequestPrayed',
                }
            }

            messaging.sendToDevice(deviceTokens, notificationPayload);
        }
        return;
    }
    
    );