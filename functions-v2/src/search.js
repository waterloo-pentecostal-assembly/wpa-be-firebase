// Search-token helpers. Must stay identical to the app's searchTokens() in
// lib/domain/common/search.dart (wpa-be-app). Pure: no Firebase imports, so
// it can be unit tested without credentials.

export const SEARCH_TOKENS_FIELD = 'search_tokens';
const MIN_TOKEN_LENGTH = 2;
const MAX_TOKEN_LENGTH = 15;
const NON_WORD_CHARS = /[^\p{L}\p{N}]+/u;

const asText = (value) => (typeof value === 'string' ? value : '');

export const searchTokens = (text) => {
    const tokens = new Set();
    const words = asText(text).toLowerCase().split(NON_WORD_CHARS);
    for (const word of words) {
        const max = Math.min(word.length, MAX_TOKEN_LENGTH);
        for (let n = MIN_TOKEN_LENGTH; n <= max; n++) {
            tokens.add(word.slice(0, n));
        }
    }
    return [...tokens].sort();
};

export const userSearchText = (data = {}) =>
    `${asText(data.first_name)} ${asText(data.last_name)}`;

export const groupSearchText = (data = {}) =>
    `${asText(data.name)} ${asText(data.description)}`;

export const sameTokens = (a, b) =>
    Array.isArray(a) && Array.isArray(b) &&
    a.length === b.length && a.every((t, i) => t === b[i]);

// Returns the tokens to write, or null when nothing needs writing.
export const tokensUpdate = (data, toText) => {
    if (!data) return null; // document deleted
    const tokens = searchTokens(toText(data));
    return sameTokens(tokens, data[SEARCH_TOKENS_FIELD]) ? null : tokens;
};
