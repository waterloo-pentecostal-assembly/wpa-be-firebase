import { expect } from 'chai';
import {
    ADMIN_TOPICS,
    arrayField,
    becameApproved,
    buildNotification,
    deepGet,
    errorDetails,
    tokenFailures,
    truncateText
} from '../src/utils.js';

describe('utils', () => {
    describe('deepGet', () => {
        it('should return value if deep key exists - value string', () => {
            const testObj = { a: { b: { c: 'hello' } } };

            const result = deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equal('hello');
        });

        it('should return value if deep key exists - value null', () => {
            const testObj = { a: { b: { c: null } } };

            const result = deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equal(null);
        });

        it('should return value if deep key exists - value undefined', () => {
            const testObj = { a: { b: { c: undefined } } };

            const result = deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equal(undefined);
        });

        it('should return value if deep key exists - value object', () => {
            const testObj = { a: { b: { c: { d: 'hello' } } } };

            const result = deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.deep.equal({ d: 'hello' });
        });

        it('should return default value if deep key does not exist', () => {
            const testObj = { a: { b: 'hello' } };

            const result = deepGet(testObj, ['a', 'b', 'c'], 'default');

            expect(result).to.be.equal('default');
        });

        it('should return undefined value if deep key does not exist and default value not provided', () => {
            const testObj = { a: { b: 'hello' } };

            const result = deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equal(undefined);
        });

        it('should return default value when an intermediate value is null', () => {
            expect(deepGet({ date: null }, ['date', 'seconds'])).to.be.equal(undefined);
            expect(deepGet({ date: null }, ['date', 'seconds'], 'default')).to.be.equal('default');
        });
    });

    describe('buildNotification', () => {
        it('should build the shared payload shape with extra data', () => {
            const message = buildNotification({
                title: 'Title',
                body: 'Body',
                notificationType: 'someType',
                data: { forumId: 'f1' },
                topic: 'some_topic'
            });

            expect(message).to.deep.equal({
                notification: { title: 'Title', body: 'Body' },
                data: { notificationType: 'someType', forumId: 'f1', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
                android: { notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' } },
                topic: 'some_topic'
            });
        });

        it('should omit topic when not provided', () => {
            const message = buildNotification({ title: 'T', body: 'B', notificationType: 'x' });

            expect(message).to.not.have.property('topic');
        });

        it('should omit an empty topic', () => {
            const message = buildNotification({ title: 'T', body: 'B', notificationType: 'x', topic: '' });

            expect(message).to.not.have.property('topic');
        });

        it('should not let extra data override notificationType or click_action', () => {
            const message = buildNotification({
                title: 'T',
                body: 'B',
                notificationType: 'real',
                data: { notificationType: 'fake', click_action: 'OTHER' }
            });

            expect(message.data.notificationType).to.equal('real');
            expect(message.data.click_action).to.equal('FLUTTER_NOTIFICATION_CLICK');
        });
    });

    describe('arrayField', () => {
        it('should return the array when present', () => {
            expect(arrayField({ liked_by: ['a'] }, 'liked_by')).to.deep.equal(['a']);
        });

        it('should return [] when missing, not an array, or doc is undefined', () => {
            expect(arrayField({}, 'liked_by')).to.deep.equal([]);
            expect(arrayField({ liked_by: 'a' }, 'liked_by')).to.deep.equal([]);
            expect(arrayField(undefined, 'liked_by')).to.deep.equal([]);
            expect(arrayField(null, 'liked_by')).to.deep.equal([]);
        });
    });

    describe('becameApproved', () => {
        it('should be true when created approved or flipped to approved', () => {
            expect(becameApproved(undefined, { is_approved: true })).to.equal(true);
            expect(becameApproved({ is_approved: false }, { is_approved: true })).to.equal(true);
        });

        it('should be false when deleted, unapproved, or already approved', () => {
            expect(becameApproved({ is_approved: true }, undefined)).to.equal(false);
            expect(becameApproved(undefined, { is_approved: false })).to.equal(false);
            expect(becameApproved({ is_approved: true }, { is_approved: true })).to.equal(false);
        });

        it('should only treat is_approved === true as approved', () => {
            expect(becameApproved(undefined, { is_approved: 'true' })).to.equal(false);
            expect(becameApproved(undefined, { is_approved: 1 })).to.equal(false);
            expect(becameApproved({ is_approved: 1 }, { is_approved: true })).to.equal(true);
        });

        it('should handle missing docs and fields', () => {
            expect(becameApproved(undefined, undefined)).to.equal(false);
            expect(becameApproved({}, { is_approved: true })).to.equal(true);
        });
    });

    describe('truncateText', () => {
        it('should not truncate text at exactly maxLength', () => {
            expect(truncateText('x'.repeat(50))).to.equal('x'.repeat(50));
        });

        it('should truncate text over maxLength to maxLength with an ellipsis', () => {
            expect(truncateText('x'.repeat(51))).to.equal(`${'x'.repeat(47)}...`);
        });

        it('should respect a custom maxLength', () => {
            expect(truncateText('x'.repeat(30), 30)).to.equal('x'.repeat(30));
            expect(truncateText('x'.repeat(31), 30)).to.equal(`${'x'.repeat(27)}...`);
        });

        it('should fall back for any falsy value', () => {
            expect(truncateText(0, 50, 'fallback')).to.equal('fallback');
            expect(truncateText(false, 50, 'fallback')).to.equal('fallback');
        });

        it('should stringify non-string values', () => {
            expect(truncateText(42, 50, 'fallback')).to.equal('42');
        });
    });

    describe('ADMIN_TOPICS', () => {
        it('should list every admin-only topic', () => {
            expect(ADMIN_TOPICS).to.have.members([
                'user_signup_notifications',
                'user_delete_request',
                'new_testimony_for_approval',
                'new_prayer_request_for_approval'
            ]);
        });
    });

    describe('errorDetails', () => {
        it('should keep message, stack, and code from an Error', () => {
            const error = new Error('socket hang up');
            error.code = 'ECONNRESET';

            const details = errorDetails(error);

            expect(details.message).to.equal('socket hang up');
            expect(details.code).to.equal('ECONNRESET');
            expect(details.stack).to.be.a('string');
            expect(JSON.parse(JSON.stringify(details)).message).to.equal('socket hang up');
        });

        it('should omit code when the Error has none', () => {
            expect(errorDetails(new Error('x'))).to.not.have.property('code');
        });

        it('should stringify non-Error values', () => {
            expect(errorDetails('boom')).to.deep.equal({ message: 'boom' });
        });
    });

    describe('tokenFailures', () => {
        it('should read topic management errors', () => {
            const error = new Error('bad token');
            error.code = 'messaging/invalid-registration-token';
            const response = { successCount: 1, failureCount: 1, errors: [{ index: 1, error }] };

            const failures = tokenFailures(response);

            expect(failures).to.have.length(1);
            expect(failures[0].index).to.equal(1);
            expect(failures[0].code).to.equal('messaging/invalid-registration-token');
            expect(failures[0]).to.not.have.property('stack');
        });

        it('should read failed multicast responses only', () => {
            const response = {
                successCount: 1,
                failureCount: 1,
                responses: [
                    { success: true, messageId: 'm1' },
                    { success: false, error: new Error('unregistered') }
                ]
            };

            const failures = tokenFailures(response);

            expect(failures).to.have.length(1);
            expect(failures[0].index).to.equal(1);
            expect(failures[0].message).to.equal('unregistered');
        });

        it('should return [] for a missing or unrecognised response', () => {
            expect(tokenFailures(undefined)).to.deep.equal([]);
            expect(tokenFailures({ successCount: 1 })).to.deep.equal([]);
        });
    });
});
