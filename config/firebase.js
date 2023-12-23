var admin = require("firebase-admin");

var serviceAccount = require("../ocems-firebase.json");

const firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_REF_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

module.exports = firebase