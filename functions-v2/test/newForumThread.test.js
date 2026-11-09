import { expect } from 'chai';
import {
    NOTIFICATION_TOPICS,
    buildNewForumThreadPayload,
    truncateText
} from '../src/utils.js';

describe('newForumThread payload', () => {
    it('includes new_forum_thread in shared notification topics', () => {
        expect(NOTIFICATION_TOPICS).to.include('new_forum_thread');
    });

    it('builds a topic payload from a thread title', () => {
        const payload = buildNewForumThreadPayload(
            { title: 'Welcome to the forum' },
            { forumId: 'general', threadId: 'abc123' }
        );

        expect(payload.topic).to.equal('new_forum_thread');
        expect(payload.notification.title).to.equal('New Thread');
        expect(payload.notification.body).to.equal('Welcome to the forum');
        expect(payload.data.notificationType).to.equal('newForumThread');
        expect(payload.data.forumId).to.equal('general');
        expect(payload.data.threadId).to.equal('abc123');
        expect(payload.data.click_action).to.equal('FLUTTER_NOTIFICATION_CLICK');
    });

    it('does not throw when title is missing (regression: undefined.length crash)', () => {
        expect(() => buildNewForumThreadPayload({})).to.not.throw();
        const payload = buildNewForumThreadPayload({}, { forumId: 'f1', threadId: 't1' });
        expect(payload.notification.body).to.be.a('string');
        expect(payload.notification.body.length).to.be.greaterThan(0);
    });

    it('does not throw for null/undefined thread data', () => {
        expect(() => buildNewForumThreadPayload(null)).to.not.throw();
        expect(() => buildNewForumThreadPayload(undefined)).to.not.throw();
        expect(buildNewForumThreadPayload(null).topic).to.equal('new_forum_thread');
    });

    it('does not throw when title is null or a non-string', () => {
        expect(() => buildNewForumThreadPayload({ title: null })).to.not.throw();
        expect(() => buildNewForumThreadPayload({ title: 42 })).to.not.throw();
        expect(buildNewForumThreadPayload({ title: 42 }).notification.body).to.be.a('string');
    });

    it('truncates long titles to 50 characters', () => {
        const longTitle = 'x'.repeat(80);
        const payload = buildNewForumThreadPayload({ title: longTitle });
        expect(payload.notification.body.length).to.equal(50);
        expect(payload.notification.body.endsWith('...')).to.equal(true);
    });

    it('truncateText handles missing values with a fallback', () => {
        expect(truncateText(undefined, 50, 'fallback')).to.equal('fallback');
        expect(truncateText(null, 50, 'fallback')).to.equal('fallback');
        expect(truncateText('', 50, 'fallback')).to.equal('fallback');
        expect(truncateText('short', 50, 'fallback')).to.equal('short');
    });
});
