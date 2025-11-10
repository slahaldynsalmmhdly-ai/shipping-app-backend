/**
 * سكريبت لإصلاح المكالمات القديمة في قاعدة البيانات
 * يقوم بتحديث جميع المكالمات ذات الحالة 'missed' لتعيين isRead: false
 */

const mongoose = require('mongoose');
const CallLog = require('./models/CallLog');
require('dotenv').config();

async function fixOldCalls() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // البحث عن جميع المكالمات الفائتة
    const result = await CallLog.updateMany(
      {
        status: 'missed',
        // تحديث فقط المكالمات التي isRead ليس false
        $or: [
          { isRead: { $ne: false } },
          { isRead: { $exists: false } }
        ]
      },
      {
        $set: { isRead: false }
      }
    );

    console.log(`✅ تم تحديث ${result.modifiedCount} مكالمة فائتة`);
    console.log(`📊 إجمالي المكالمات المطابقة: ${result.matchedCount}`);

    // إغلاق الاتصال
    await mongoose.connection.close();
    console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في تحديث المكالمات:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
fixOldCalls();
