import { expect } from 'chai';
import fs from 'fs';
import {
    SEARCH_TOKENS_FIELD,
    groupSearchText,
    sameTokens,
    searchTokens,
    tokensUpdate,
    userSearchText,
} from '../src/search.js';
import { userSnippetChanged } from '../src/utils.js';

const vectors = JSON.parse(fs.readFileSync(
    new URL('./fixtures/search_tokens_vectors.json', import.meta.url),
));

describe('search', () => {
    describe('searchTokens', () => {
        it('has all 12 test vectors', () => {
            expect(vectors).to.have.lengthOf(12);
        });

        vectors.forEach(({ input, tokens }) => {
            it(`matches the app for ${JSON.stringify(input)}`, () => {
                expect(searchTokens(input)).to.deep.equal(tokens);
            });
        });

        it('returns sorted, unique tokens of length 2 to 15', () => {
            vectors.forEach(({ input }) => {
                const tokens = searchTokens(input);
                expect(tokens).to.deep.equal([...tokens].sort());
                expect(new Set(tokens).size).to.equal(tokens.length);
                tokens.forEach((t) => {
                    expect(t.length).to.be.within(2, 15);
                });
            });
        });

        it('returns [] for non-string input', () => {
            expect(searchTokens(undefined)).to.deep.equal([]);
            expect(searchTokens(null)).to.deep.equal([]);
            expect(searchTokens(42)).to.deep.equal([]);
        });
    });

    describe('userSearchText', () => {
        it('tokenizes first and last name', () => {
            const tokens = searchTokens(userSearchText({ first_name: 'Mary', last_name: 'Smith' }));
            expect(tokens).to.include.members(['ma', 'mary', 'sm', 'smith']);
        });

        it('does not produce undefined/null tokens for missing fields', () => {
            const tokens = searchTokens(userSearchText({ first_name: 'Mary' }));
            expect(tokens).to.deep.equal(['ma', 'mar', 'mary']);
            expect(tokens).to.not.include.members(['un', 'nu']);
            expect(searchTokens(userSearchText({ first_name: 'Mary', last_name: null })))
                .to.deep.equal(['ma', 'mar', 'mary']);
            expect(searchTokens(userSearchText())).to.deep.equal([]);
        });
    });

    describe('groupSearchText', () => {
        it('includes words from the description', () => {
            const tokens = searchTokens(groupSearchText({
                name: 'Night Owls', description: 'Late-night readers',
            }));
            expect(tokens).to.include.members(['night', 'owls', 'late', 'readers']);
        });

        it('handles a missing description', () => {
            const tokens = searchTokens(groupSearchText({ name: 'Night Owls' }));
            expect(tokens).to.deep.equal(searchTokens('Night Owls'));
        });
    });

    describe('sameTokens', () => {
        it('is true for equal arrays', () => {
            expect(sameTokens(['ab', 'cd'], ['ab', 'cd'])).to.equal(true);
            expect(sameTokens([], [])).to.equal(true);
        });

        it('is false for different order, length, or undefined', () => {
            expect(sameTokens(['ab', 'cd'], ['cd', 'ab'])).to.equal(false);
            expect(sameTokens(['ab'], ['ab', 'cd'])).to.equal(false);
            expect(sameTokens(['ab'], undefined)).to.equal(false);
            expect(sameTokens(undefined, ['ab'])).to.equal(false);
        });
    });

    describe('tokensUpdate', () => {
        const user = { first_name: 'Mary', last_name: 'Smith' };
        const correct = searchTokens('Mary Smith');

        it('returns null for null data', () => {
            expect(tokensUpdate(null, userSearchText)).to.equal(null);
        });

        it('returns null when tokens are already correct', () => {
            expect(tokensUpdate({ ...user, [SEARCH_TOKENS_FIELD]: correct }, userSearchText))
                .to.equal(null);
        });

        it('returns new tokens when missing or stale', () => {
            expect(tokensUpdate(user, userSearchText)).to.deep.equal(correct);
            expect(tokensUpdate({ ...user, [SEARCH_TOKENS_FIELD]: ['jo', 'joe'] }, userSearchText))
                .to.deep.equal(correct);
        });

        it('returns [] (not null) when text becomes empty but tokens remain', () => {
            expect(tokensUpdate({ [SEARCH_TOKENS_FIELD]: ['ma'] }, userSearchText))
                .to.deep.equal([]);
        });

        it('returns null when only unrelated fields change', () => {
            expect(tokensUpdate({
                ...user, last_active: new Date(), [SEARCH_TOKENS_FIELD]: correct,
            }, userSearchText)).to.equal(null);
            expect(tokensUpdate({
                name: 'Night Owls',
                member_ids: ['a', 'b'],
                [SEARCH_TOKENS_FIELD]: searchTokens('Night Owls'),
            }, groupSearchText)).to.equal(null);
        });
    });
});

describe('userSnippetChanged', () => {
    const base = { first_name: 'Mary', last_name: 'Smith', thumbnail: 'a.jpg' };

    it('is false when only non-snippet fields change', () => {
        expect(userSnippetChanged(base, { ...base, last_active: 1 })).to.equal(false);
        expect(userSnippetChanged(base, { ...base, search_tokens: ['ma'] })).to.equal(false);
    });

    it('is true when a snippet field changes', () => {
        expect(userSnippetChanged(base, { ...base, first_name: 'Maria' })).to.equal(true);
        expect(userSnippetChanged(base, { ...base, last_name: 'Jones' })).to.equal(true);
        expect(userSnippetChanged(base, { ...base, thumbnail: 'b.jpg' })).to.equal(true);
        const { thumbnail, ...noThumb } = base;
        expect(thumbnail).to.equal('a.jpg');
        expect(userSnippetChanged(base, noThumb)).to.equal(true);
    });

    it('handles missing data', () => {
        expect(userSnippetChanged(undefined, base)).to.equal(true);
        expect(userSnippetChanged(undefined, undefined)).to.equal(false);
    });
});
