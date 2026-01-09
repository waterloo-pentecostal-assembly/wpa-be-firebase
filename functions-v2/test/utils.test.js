import { expect } from 'chai';
import { deepGet } from '../src/utils.js';

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
    });
});
