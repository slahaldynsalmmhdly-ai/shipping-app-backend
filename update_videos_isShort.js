/**
 * Script to update all existing videos with isShort: true
 * Run this once to fix old videos that don't have isShort field
 * 
 * Usage: node update_videos_isShort.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function() {
  console.log('✅ Connected to MongoDB');
  
  try {
    const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }));
    
    // Find all posts with videos but without isShort field
    const result = await Post.updateMany(
      { 
        'media.type': 'video',
        $or: [
          { isShort: { $exists: false } },
          { isShort: null }
        ]
      },
      { 
        $set: { isShort: true }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} videos with isShort: true`);
    console.log(`📊 Matched ${result.matchedCount} videos`);
    
    // Verify the update
    const videosWithIsShort = await Post.countDocuments({ 
      'media.type': 'video',
      isShort: true 
    });
    
    const videosWithoutIsShort = await Post.countDocuments({ 
      'media.type': 'video',
      $or: [
        { isShort: { $exists: false } },
        { isShort: null },
        { isShort: false }
      ]
    });
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Videos with isShort: true = ${videosWithIsShort}`);
    console.log(`   Videos without isShort or isShort: false = ${videosWithoutIsShort}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
});
