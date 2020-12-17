const expect = require('chai').expect;
const utils = require('../src/utils');

describe.only('utils', () => {
    describe('deepGet', () => {
        it('should return value if deep key exists - value string', () => {
            const testObj = {a: {b: {c: 'hello'}}};

            const result = utils.deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equals('hello');
        });

        it('should return value if deep key exists - value null', () => {
            const testObj = {a: {b: {c: null}}};

            const result = utils.deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equals(null);
        });

        it('should return value if deep key exists - value undefined', () => {
            const testObj = {a: {b: {c: undefined}}};

            const result = utils.deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equals(undefined);
        });

        it('should return value if deep key exists - value object', () => {
            const testObj = {a: {b: {c: {d: 'hello'}}}};

            const result = utils.deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.deep.equals({d: 'hello'});
        });

        it('should return default value if deep key does not exist', () => {
            const testObj = {a: {b: 'hello'}};

            const result = utils.deepGet(testObj, ['a', 'b', 'c'], 'default');

            expect(result).to.be.equals('default');
        });

        it('should return undefined value if deep key does not exist and default value not provided', () => {
            const testObj = {a: {b: 'hello'}};

            const result = utils.deepGet(testObj, ['a', 'b', 'c']);

            expect(result).to.be.equals(undefined);
        });
    });
});