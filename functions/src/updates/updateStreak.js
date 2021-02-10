const { firestore, functions } = require('../index');
const admin = require('firebase-admin');
const Timestamp = admin.firestore.Timestamp;
const FieldValue = require('firebase-admin').firestore.FieldValue;

exports.updateStreaks = functions.pubsub.schedule('59 23 * * *') // end of day
    .onRun((context) => {
// for testing, emulator does not support pubsub
// exports.testCompletion = functions
//     .firestore
//     .document('/prayer_requests/{prayerId}')
//     .onCreate(async (snapshot, context) => {
        const today = new Date(); // Today
        const todayMillis = today.valueOf();
        
        let dateArray;
        let endDateArray;
        const dateSnapshot = await firestore.collection('content_series_date')
            .get();
            
        if(!dateSnapshot.empty){
            dateData = dateSnapshot.docs[0].data();
            dateArray = dateData['dates'];
            endDateArray = dateData['end_dates'];
        }
        const bibleSeriesSnapshot = await firestore
            .collection('bible_series')
            .where('start_date', '<=', Timestamp.fromMillis(todayMillis))
            .where('is_active', '==', true)
            .orderBy('start_date', 'desc')
            .limit(1)
            .get();
        const bibleSeriesDoc = bibleSeriesSnapshot.docs[0];
        const bibleSeries = bibleSeriesDoc.data();
        const contentSnippet = bibleSeries['series_content_snippet'];

        //if today is one of the days inside the array
        dateArray.forEach(async (element) => {
            if(element.toDate().toDateString() === today.toDateString()){
                const userSnapshot = await firestore.collection('users')
                    .get();
                userSnapshot.forEach(async (doc) => {
                    //get user achievement
                    const achievementRef = firestore
                        .collection('achievements')
                        .doc(doc.id);

                    //incrementing streaks
                    const achievementSnapshot = await achievementRef.get();
                    const achievementData = achievementSnapshot.data();

                    const increment = FieldValue.increment(1);
                   
                    let contentDetail = [];

                    //get completion for user and wehre date is between yesterday and today
                    const completionSnapshot = await firestore.collection('completions')
                        .where('user_id', '==', doc.id)
                        .where('series_id', '==', bibleSeriesDoc.id)
                        .get();

                    for (let element of contentSnippet){

                        const engagementDate = element['date'].toDate();
                        
                        if(engagementDate.toDateString() === today.toDateString()){
                            // getting the content details for today
                            for(i = 0; i < element['content_types'].length; i++){
                                contentDetail[i] = element['content_types'][i]['content_id'];
                            }
                        }
                    }
                    let check = false;
                    for(i=0; i < contentDetail.length; i++){
                        //if completion id cannot be found within user's completions
                        const exists = completionSnapshot.docs.some(element => {
                            return element.data()['content_id'] == contentDetail[i] && element.data()['is_draft']==false;
                        });
                        if(exists){
                            check = true;
                        }
                    }
                    if(check){
                        await achievementRef.update({current_streak: increment});
                    }else{
                        await achievementRef.update({current_streak: 0});
                    }
                    if(achievementData['current_streak'] >= achievementData['longest_streak']){
                        await achievementRef.update({longest_streak: increment});
                    }

                   
                })
                //Delete date from array, uncomment when deployed
                // dateArray.splice(dateArray.indexOf(element), 1);
                // await firestore.collection('content_series_date').doc(dateSnapshot.docs[0].id).update({dates: dateArray});

            }
        })

        endDateArray.forEach( async (element) => {
            if(element.toDate().toDateString() === today.toDateString()){
                const increment = FieldValue.increment(1);
                const userSnapshot = await firestore.collection('users')
                    .get();
                userSnapshot.forEach(async (doc) => {
                    const achievementRef = firestore
                        .collection('achievements')
                        .doc(doc.id);
                    const completionSnapshot = await firestore.collection('completions')
                        .where('user_id', '==', doc.id)
                        .where('series_id', '==', bibleSeriesDoc.id)
                        .get();
                    let checkArray = [];
                    for(let element of contentSnippet){
                        let check = false;
                        for(let content of element['content_types']){
                            check = check || completionSnapshot.docs.some(ele => {
                                return ele.data()['content_id'] == content['content_id'] && ele.data()['is_draft'] == false; 
                            })
                        }
                        checkArray.push(check);
                    }  
                    if(!checkArray.includes(false)){
                        await achievementRef.update({perfect_series: increment})
                    }
                    
                })
            }
        })

        return null;

    });


exports.updateDateList = functions
    .firestore
    .document('/bible_series/{bibleSeriesId}')
    .onCreate(async (snapshot, context) => {

        const dateRef = await firestore
            .collection('content_series_dates')
            .get();
        
        dateData = dateRef.docs[0].data();
        const dateId = dateRef.docs[0].id;
        const bibleSeriesData = snapshot.data();

        //array to be populated
        let dateArray = dateData['dates'];
        const contentSnippet = bibleSeriesData['series_content_snippet'];
        if(Array.isArray(contentSnippet)){
            for(let element of contentSnippet){
                dateArray.push(element['date'])
            }
        }
        //Array for all the end dates of the series
        let endDateArray = await dateData['end_dates'];
        if(Array.isArray(endDateArray)){
            endDateArray.push(bibleSeriesData['end_date']);
        }
        dateData['dates'] = dateArray;
        dateData['end_dates'] = endDateArray;

        await firestore.collection('content_series_dates').doc(dateId).set(dateData);
        return null;
    })
