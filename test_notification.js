// سكريبت اختبار لفحص إنشاء الإشعارات
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function testNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // جلب مستخدم عشوائي للاختبار
    const users = await User.find({}).limit(5).select('name notifications');
    
    for (const user of users) {
      console.log(`\n=== User: ${user.name} ===`);
      console.log(`Total notifications: ${user.notifications.length}`);
      
      // عرض أنواع الإشعارات
      const types = {};
      user.notifications.forEach(n => {
        types[n.type] = (types[n.type] || 0) + 1;
      });
      console.log('Notification types:', types);
      
      // عرض آخر 5 إشعارات
      const recent = user.notifications.slice(0, 5);
      recent.forEach((n, i) => {
        console.log(`  ${i+1}. Type: ${n.type}, Post: ${n.post}, CommentId: ${n.commentId}, ReplyId: ${n.replyId}`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testNotifications();
