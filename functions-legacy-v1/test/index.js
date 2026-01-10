const test = require('firebase-functions-test')();

const { firestore } = require('../src/index');

module.exports = {
    firestore,
    test,
};
