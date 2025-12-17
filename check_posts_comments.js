const mongoose = require('mongoose');
require('dotenv').config();
const Post = require('./models/Post');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // جلب جميع المنشورات التي لها تعليقات
  const postsWithComments = await Post.find({ 'comments.0': { $exists: true } });
  
  console.log(`Found ${postsWithComments.length} posts with comments\n`);
  
  for (const post of postsWithComments) {
    console.log(`Post ID: ${post._id}`);
    console.log(`Post Owner: ${post.user}`);
    console.log(`Comments: ${post.comments.length}`);
    
    for (const comment of post.comments) {
      console.log(`  - Comment by: ${comment.user}, Likes: ${comment.likes.length}`);
      if (comment.likes.length > 0) {
        console.log(`    Liked by: ${comment.likes.map(l => l.user).join(', ')}`);
      }
      if (comment.replies && comment.replies.length > 0) {
        console.log(`    Replies: ${comment.replies.length}`);
        for (const reply of comment.replies) {
          console.log(`      - Reply by: ${reply.user}, Likes: ${reply.likes ? reply.likes.length : 0}`);
        }
      }
    }
    console.log('');
  }
  
  await mongoose.disconnect();
}
check();
