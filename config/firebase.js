var admin = require("firebase-admin");

var serviceAccount = require("../ocems-firebase.json");

const firebase = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = firebase