import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { firestore } from '../firebase.js';
import { deepGet } from '../utils.js';

// Update bible series snippet when series content is added
export const updateSeriesContentSnippetOnWrite = onDocumentCreated('/bible_series/{bibleSeriesId}/series_content/{seriesContentId}', async (event) => {
    // if new content created, then create a new
    // entry in the bible series snippet
    // update start date and end date

    logger.info('updateSeriesContentSnippetOnWrite triggered');

    // Get new data added
    const seriesContentData = event.data.data();
    logger.info('seriesContentData:', JSON.stringify(seriesContentData));

    // If date not in data, return
    if (!seriesContentData || seriesContentData.date === undefined) {
        logger.info('Date is undefined or data is missing. Exiting.');
        return;
    }

    // Get seriesContentId
    const seriesContentId = event.params.seriesContentId;
    logger.info('seriesContentId:', seriesContentId);

    // Get bibleSeriesId
    const bibleSeriesId = event.params.bibleSeriesId;
    logger.info('bibleSeriesId:', bibleSeriesId);

    // Get date
    const seriesContentDate = seriesContentData.date;
    logger.info('seriesContentDate:', JSON.stringify(seriesContentDate));

    // Get content type
    const seriesContentType = seriesContentData['content_type'];
    logger.info('seriesContentType:', seriesContentType);

    // Get bibleSeries data
    const bibleSeriesRef = await firestore
        .collection('bible_series')
        .doc(bibleSeriesId)
        .get();

    logger.info('bibleSeriesRef exists:', bibleSeriesRef.exists);

    if (!bibleSeriesRef.exists) return;

    const bibleSeriesData = bibleSeriesRef.data();
    logger.info('bibleSeriesData before update:', JSON.stringify(bibleSeriesData));

    // Add snippet data
    let seriesContentSnippet;

    if (bibleSeriesData['series_content_snippet'] === undefined) {
        logger.info('series_content_snippet is undefined. Creating new snippet array.');
        seriesContentSnippet = [{
            'content_types': [
                {
                    'content_type': seriesContentType,
                    'content_id': seriesContentId
                }
            ],
            'date': seriesContentDate
        }];

        // Set start and end dates to be the same
        bibleSeriesData['start_date'] = seriesContentDate;
        bibleSeriesData['end_date'] = seriesContentDate;
    } else {
        logger.info('series_content_snippet exists. Updating.');
        seriesContentSnippet = bibleSeriesData['series_content_snippet'];
        let dateExist = false;
        for (const element of seriesContentSnippet) {
            // Updated _seconds to seconds for v2 SDK compatibility
            if (element.date.seconds === seriesContentDate.seconds) {
                logger.info('Date exists in snippet. Adding content to existing date entry.');
                element['content_types'].push({
                    'content_type': seriesContentType,
                    'content_id': seriesContentId
                });
                dateExist = true;
                break;
            }
        }
        if (!dateExist) {
            logger.info('Date does not exist in snippet. Adding new date entry.');
            seriesContentSnippet.push({
                'content_types': [
                    {
                        'content_type': seriesContentType,
                        'content_id': seriesContentId
                    }
                ],
                'date': seriesContentDate
            });
        }

        // Update the start and end dates
        const currentStartDate = bibleSeriesData['start_date'];
        const currentEndDate = bibleSeriesData['end_date'];

        logger.info('Checking start/end dates. Current start:', currentStartDate?.seconds, 'Current end:', currentEndDate?.seconds, 'New date:', seriesContentDate.seconds);

        if (seriesContentDate.seconds < currentStartDate.seconds) {
            logger.info('New date is before current start date. Updating start date.');
            bibleSeriesData['start_date'] = seriesContentDate;
        }

        if (seriesContentDate.seconds > currentEndDate.seconds) {
            logger.info('New date is after current end date. Updating end date.');
            bibleSeriesData['end_date'] = seriesContentDate;
        }
    }

    bibleSeriesData['series_content_snippet'] = seriesContentSnippet;

    logger.info('Updating bibleSeriesData with new snippet.');

    await firestore
        .collection('bible_series')
        .doc(bibleSeriesId)
        .set(bibleSeriesData);

    logger.info('Update complete.');
});


// Update bible series snippet when series content is updated
export const updateSeriesContentSnippetOnUpdate = onDocumentUpdated('/bible_series/{bibleSeriesId}/series_content/{seriesContentId}', async (event) => {
    // if updated and date is changed, then find the snippet entry with that id and
    //  move it to the right place. Also check if this date is before the start date
    //  or after the end date. If so, then either will have to be updated

    // Get new data
    const newSeriesContentData = event.data.after.data();

    // Get old data
    const oldSeriesContentData = event.data.before.data();

    // Check if date has changed
    const oldDateMillis = deepGet(oldSeriesContentData, ['date', 'seconds']);
    const newDateMillis = deepGet(newSeriesContentData, ['date', 'seconds']);
    const newDate = deepGet(newSeriesContentData, ['date']);
    const oldDate = deepGet(oldSeriesContentData, ['date']);

    const dateChanged = oldDateMillis !== newDateMillis;

    // Check if content_type has changed
    const oldContentType = deepGet(oldSeriesContentData, ['content_type']);
    const newContentType = deepGet(newSeriesContentData, ['content_type']);

    const contentTypeChanged = oldContentType !== newContentType;

    // Don't process if new date or new content_type is undefined
    if (newContentType === undefined || newDate === undefined) {
        return;
    }

    // If either dateChanged or contentTypeChanged, we can update the snippet
    if (dateChanged || contentTypeChanged) {
        // Get bibleSeriesId
        const bibleSeriesId = event.params.bibleSeriesId;

        // Get seriesContentId
        const seriesContentId = event.params.seriesContentId;

        // Get existing snippet
        const bibleSeriesRef = await firestore
            .collection('bible_series')
            .doc(bibleSeriesId)
            .get();

        if (!bibleSeriesRef.exists) return;

        const bibleSeriesData = bibleSeriesRef.data();
        const oldContentSnippets = bibleSeriesData['series_content_snippet'];
        const newContentSnippet = [];

        if (!dateChanged) {
            // Date unchanged
            //  find date
            //    remove content element with that content_id
            //  add new element with updated information

            for (const contentSnippet of oldContentSnippets) {
                if (contentSnippet['date']['seconds'] === newDateMillis) {
                    const updatedContentTypes = [];
                    const date = newSeriesContentData['date'];

                    // Loop through content types looking for seriesContentId
                    for (const contentType of contentSnippet['content_types']) {
                        if (!(contentType['content_id'] === seriesContentId)) {
                            updatedContentTypes.push(contentType);
                        }
                    }

                    // Add new content type
                    updatedContentTypes.push({
                        'content_id': seriesContentId,
                        'content_type': newContentType,
                    });

                    newContentSnippet.push({
                        'date': date,
                        'content_types': updatedContentTypes
                    });
                } else {
                    newContentSnippet.push(contentSnippet);
                }
            }
        } else {
            // Date changed
            //  find old date
            //    remove content element with that content_id
            //  find new date
            //    add new element with updated information
            //  update start and end date accordingly

            let newDateExists = false;

            // Keep track of dates to use for new start and end dates after
            const dates = [];

            for (const contentSnippet of oldContentSnippets) {
                if (contentSnippet['date']['seconds'] === oldDateMillis) {
                    const updatedContentTypes = [];

                    // Loop through content types looking for seriesContentId
                    for (const contentType of contentSnippet['content_types']) {
                        if (!(contentType['content_id'] === seriesContentId)) {
                            updatedContentTypes.push(contentType);
                        }
                    }

                    // Only add back the date if there are other snippets
                    if (updatedContentTypes.length > 0) {
                        dates.push(oldDate);
                        newContentSnippet.push({
                            'date': oldDate,
                            'content_types': updatedContentTypes
                        });
                    }
                } else if (contentSnippet['date']['seconds'] === newDateMillis) {
                    newDateExists = true;

                    const updatedContentTypes = [];

                    // Loop through content types looking for seriesContentId
                    for (const contentType of contentSnippet['content_types']) {
                        if (!(contentType['content_id'] === seriesContentId)) {
                            updatedContentTypes.push(contentType);
                        }
                    }

                    // Add new content type
                    updatedContentTypes.push({
                        'content_id': seriesContentId,
                        'content_type': newContentType,
                    });

                    dates.push(newDate);

                    newContentSnippet.push({
                        'date': newDate,
                        'content_types': updatedContentTypes
                    });
                } else {
                    dates.push(contentSnippet['date']);
                    newContentSnippet.push(contentSnippet);
                }
            }

            if (!newDateExists) {
                dates.push(newDate);

                // Add new content type
                newContentSnippet.push({
                    'date': newDate,
                    'content_types': [{
                        'content_id': seriesContentId,
                        'content_type': newContentType,
                    }]
                });
            }

            // Update the start and end dates
            dates.sort((a, b) => a.seconds - b.seconds);
            bibleSeriesData['start_date'] = dates[0];
            bibleSeriesData['end_date'] = dates[dates.length - 1];
        }

        bibleSeriesData['series_content_snippet'] = newContentSnippet;

        await firestore
            .collection('bible_series')
            .doc(bibleSeriesId)
            .set(bibleSeriesData);
    }
});

// Update bible series snippet when series content is deleted
export const updateSeriesContentSnippetOnDelete = onDocumentDeleted('/bible_series/{bibleSeriesId}/series_content/{seriesContentId}', async (event) => {
    // if deleted, then find the snippet entry with that id and
    //  remove it. Also check if this date is equal to either the
    //  start or end dates and that it was the only engagement type
    //  for that snippet entry. If so, then the start/end date would
    //  have to be updated.
});
