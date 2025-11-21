const mongoose = require('mongoose');
const Hashtag = require('../models/Hashtag');
const initialHashtags = require('./hashtags');
require('dotenv').config();

const seedHashtags = async () => {
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ تم الاتصال بقاعدة البيانات');

    console.log('🔄 جاري إضافة الهاشتاقات الأولية...');
    
    // إضافة الهاشتاقات (مع تجاهل المكررة)
    let addedCount = 0;
    let skippedCount = 0;

    for (const hashtagData of initialHashtags) {
      try {
        await Hashtag.create({
          tag: hashtagData.tag,
          category: hashtagData.category,
          count: 0,
          trending: false
        });
        addedCount++;
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key - skip
          skippedCount++;
        } else {
          console.error(`❌ خطأ في إضافة ${hashtagData.tag}:`, err.message);
        }
      }
    }

    console.log(`✅ تم إضافة ${addedCount} هاشتاق جديد`);
    console.log(`⏭️  تم تجاهل ${skippedCount} هاشتاق موجود مسبقاً`);
    console.log(`📊 المجموع: ${initialHashtags.length} هاشتاق`);

    await mongoose.connection.close();
    console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ:', err);
    process.exit(1);
  }
};

seedHashtags();
