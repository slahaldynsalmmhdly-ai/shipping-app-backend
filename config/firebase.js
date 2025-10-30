const admin = require("firebase-admin");

// قراءة مفتاح حساب الخدمة من متغير البيئة
let firebaseInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.warn('⚠️ Firebase not initialized: FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
    console.warn('⚠️ Firebase-dependent features will not work');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.warn('⚠️ Firebase-dependent features will not work');
}

module.exports = admin;
module.exports.firebaseInitialized = firebaseInitialized;
