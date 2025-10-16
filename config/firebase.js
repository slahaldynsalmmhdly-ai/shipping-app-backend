const admin = require("firebase-admin");

// قراءة مفتاح حساب الخدمة من متغير البيئة
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;

