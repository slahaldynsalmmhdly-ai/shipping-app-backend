const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');

async function testCreateNotification() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // جلب منشور له تعليقات
    const postWithComments = await Post.findOne({ 'comments.0': { $exists: true } });
    
    if (!postWithComments) {
      console.log('No posts with comments found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('\nFound post with comments:');
    console.log('Post ID:', postWithComments._id);
    console.log('Post User:', postWithComments.user);
    console.log('Comments count:', postWithComments.comments.length);
    
    const firstComment = postWithComments.comments[0];
    console.log('\nFirst comment:');
    console.log('Comment ID:', firstComment._id);
    console.log('Comment User:', firstComment.user);
    console.log('Comment Text:', firstComment.text);
    console.log('Comment Likes:', firstComment.likes);
    
    // جلب صاحب التعليق
    const commentOwner = await User.findById(firstComment.user);
    if (commentOwner) {
      console.log('\nComment owner:', commentOwner.name);
      console.log('Current notifications count:', commentOwner.notifications.length);
      
      // محاولة إنشاء إشعار يدوياً
      console.log('\nCreating test notification...');
      
      const testNotification = {
        type: 'comment_like',
        sender: postWithComments.user, // صاحب المنشور يعجب بالتعليق
        post: postWithComments._id,
        commentId: firstComment._id,
        message: 'اختبار: قام شخص بالإعجاب بتعليقك'
      };
      
      commentOwner.notifications.unshift(testNotification);
      await commentOwner.save();
      
      console.log('Notification created successfully!');
      console.log('New notifications count:', commentOwner.notifications.length);
      
      // التحقق
      const updatedOwner = await User.findById(firstComment.user);
      const newNotif = updatedOwner.notifications[0];
      console.log('\nNew notification:', JSON.stringify(newNotif, null, 2));
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreateNotification();
