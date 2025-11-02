const mongoose = require('mongoose');
require('dotenv').config();

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const Post = require('../models/Post');
const User = require('../models/User');

// 20 هاشتاق متنوع لتطبيق الشحن
const hashtags = [
  'شحن',
  'نقليات',
  'شاحنات',
  'توصيل',
  'نقل_بضائع',
  'شحن_سريع',
  'شاحنات_فارغة',
  'نقل_داخلي',
  'نقل_دولي',
  'شحن_بحري',
  'شحن_جوي',
  'شحن_بري',
  'لوجستيات',
  'مستودعات',
  'تخليص_جمركي',
  'نقل_ثقيل',
  'شاحنات_مبردة',
  'نقل_سيارات',
  'شحن_اثاث',
  'توصيل_سريع'
];

// محتوى تجريبي لكل هاشتاق
const sampleTexts = [
  'خدمات شحن ونقل موثوقة',
  'نوفر أفضل حلول النقل',
  'شاحنات حديثة ومجهزة',
  'توصيل سريع وآمن',
  'نقل البضائع بكفاءة عالية',
  'خدمات لوجستية متكاملة',
  'شحن دولي بأفضل الأسعار',
  'نقل داخلي لجميع المدن',
  'شاحنات فارغة متاحة الآن',
  'حلول شحن مخصصة لك'
];

async function seedHashtags() {
  try {
    // الحصول على أول مستخدم من قاعدة البيانات
    const user = await User.findOne();
    
    if (!user) {
      console.log('❌ لا يوجد مستخدمين في قاعدة البيانات!');
      console.log('⚠️  يجب إنشاء مستخدم أولاً');
      process.exit(1);
    }

    console.log(`✅ سيتم إنشاء منشورات باسم: ${user.name}`);
    console.log('');

    // إنشاء منشورات لكل هاشتاق
    for (let i = 0; i < hashtags.length; i++) {
      const hashtag = hashtags[i];
      const text = `${sampleTexts[i % sampleTexts.length]} #${hashtag}`;
      
      // إنشاء 3-5 منشورات لكل هاشتاق لزيادة عدد الاستخدام
      const postsCount = Math.floor(Math.random() * 3) + 3; // 3 إلى 5
      
      for (let j = 0; j < postsCount; j++) {
        const post = new Post({
          user: user._id,
          text: text,
          hashtags: [hashtag],
          mentions: [],
          media: [],
          reactions: [],
          commentsCount: 0,
          isPublished: true
        });
        
        await post.save();
      }
      
      console.log(`✅ تم إنشاء ${postsCount} منشورات للهاشتاق: #${hashtag}`);
    }

    console.log('');
    console.log('🎉 تم إضافة جميع الهاشتاقات بنجاح!');
    console.log(`📊 إجمالي الهاشتاقات: ${hashtags.length}`);
    console.log('');
    
    // عرض إحصائيات
    console.log('📈 إحصائيات الهاشتاقات:');
    for (const hashtag of hashtags) {
      const count = await Post.countDocuments({ hashtags: hashtag });
      console.log(`   #${hashtag}: ${count} منشور`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
}

seedHashtags();
