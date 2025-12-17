const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');
const { generateNotificationMessage } = require('./utils/notificationHelper');

async function simulateLikeComment() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // جلب منشور له تعليقات
    const post = await Post.findOne({ 'comments.0': { $exists: true } });
    
    if (!post) {
      console.log('No posts with comments found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('Post ID:', post._id);
    console.log('Post isShort:', post.isShort);
    
    const comment = post.comments[0];
    console.log('Comment ID:', comment._id);
    console.log('Comment User:', comment.user);
    
    // محاكاة المستخدم الذي يعجب (سنستخدم صاحب المنشور)
    const likerId = post.user;
    console.log('Liker ID:', likerId);
    
    // التحقق من أن المستخدم ليس صاحب التعليق
    if (comment.user.toString() === likerId.toString()) {
      console.log('ERROR: Liker is the same as comment owner - no notification should be created');
    } else {
      console.log('OK: Liker is different from comment owner');
    }
    
    // جلب بيانات المستخدم الذي يعجب
    const sender = await User.findById(likerId).select('name');
    console.log('Sender name:', sender ? sender.name : 'NOT FOUND');
    
    // جلب صاحب التعليق
    const commentOwner = await User.findById(comment.user);
    console.log('Comment owner:', commentOwner ? commentOwner.name : 'NOT FOUND');
    
    if (commentOwner && sender) {
      // تحديد نوع الإشعار
      const notifType = post.isShort ? 'short_comment_like' : 'comment_like';
      console.log('Notification type:', notifType);
      
      // إنشاء رسالة الإشعار
      const message = generateNotificationMessage(notifType, sender.name);
      console.log('Notification message:', message);
      
      // إنشاء الإشعار (كما في الكود الأصلي)
      const notification = {
        type: notifType,
        sender: likerId,
        post: post._id,
        commentId: comment._id,
        message: message
      };
      
      console.log('\nNotification to create:', JSON.stringify(notification, null, 2));
      
      // إضافة الإشعار
      commentOwner.notifications.unshift(notification);
      await commentOwner.save();
      
      console.log('\n✅ Notification created successfully!');
    } else {
      console.log('❌ Could not find sender or comment owner');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

simulateLikeComment();
