const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function testNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // جلب مستخدمين لديهم إشعارات
    const usersWithNotifs = await User.find({ 'notifications.0': { $exists: true } }).limit(10).select('name notifications');
    
    console.log(`\nFound ${usersWithNotifs.length} users with notifications\n`);
    
    for (const user of usersWithNotifs) {
      console.log(`\n=== User: ${user.name} ===`);
      console.log(`Total notifications: ${user.notifications.length}`);
      
      // عرض أنواع الإشعارات
      const types = {};
      user.notifications.forEach(n => {
        types[n.type] = (types[n.type] || 0) + 1;
      });
      console.log('Notification types:', JSON.stringify(types, null, 2));
      
      // البحث عن إشعارات comment_like أو reply_like أو reply
      const commentNotifs = user.notifications.filter(n => 
        n.type === 'comment_like' || n.type === 'reply_like' || n.type === 'reply'
      );
      console.log(`Comment/Reply notifications: ${commentNotifs.length}`);
      
      if (commentNotifs.length > 0) {
        console.log('Sample comment notification:', JSON.stringify(commentNotifs[0], null, 2));
      }
    }
    
    // إحصائيات عامة
    const allUsers = await User.find({}).select('notifications');
    let totalNotifs = 0;
    const allTypes = {};
    
    allUsers.forEach(u => {
      totalNotifs += u.notifications.length;
      u.notifications.forEach(n => {
        allTypes[n.type] = (allTypes[n.type] || 0) + 1;
      });
    });
    
    console.log('\n=== GLOBAL STATS ===');
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Total notifications: ${totalNotifs}`);
    console.log('All notification types:', JSON.stringify(allTypes, null, 2));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testNotifications();
