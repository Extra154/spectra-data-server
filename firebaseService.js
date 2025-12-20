// spectra-data-server/firebaseService.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://spectra-c014d.firebaseio.com"
});

const db = admin.database();
module.exports = db;
