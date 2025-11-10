/**
 * سكريبت لتنظيف البيانات القديمة من الحظر المتبادل
 * 
 * المشكلة: في النظام القديم، كان الحظر متبادلاً
 * عندما يحظر A المستخدم B، كان النظام يضيف:
 * - B إلى قائمة A المحظورة
 * - A إلى قائمة B المحظورة
 * 
 * هذا السكريبت يزيل الحظر المتبادل ويبقي فقط الحظر الأصلي
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');

async function cleanupMutualBlocks() {
  try {
    console.log('🔍 جاري البحث عن حالات الحظر المتبادل...');
    
    // Get all users with blocked users
    const users = await User.find({ blockedUsers: { $exists: true, $ne: [] } });
    
    console.log(`📊 تم العثور على ${users.length} مستخدم لديهم قائمة محظورين`);
    
    let mutualBlocksFound = 0;
    let mutualBlocksRemoved = 0;
    
    // Check for mutual blocks
    for (const user of users) {
      for (const blockedUserId of user.blockedUsers) {
        const blockedUser = await User.findById(blockedUserId);
        
        if (blockedUser && blockedUser.blockedUsers.includes(user._id.toString())) {
          mutualBlocksFound++;
          console.log(`⚠️  حظر متبادل: ${user.name} <-> ${blockedUser.name}`);
          
          // Remove the mutual block (keep only the original blocker's block)
          // We assume the user who appears first in the database is the original blocker
          // In practice, you might want to add a timestamp to determine who blocked first
          
          // For now, we'll remove the reverse block
          blockedUser.blockedUsers = blockedUser.blockedUsers.filter(
            id => id.toString() !== user._id.toString()
          );
          await blockedUser.save();
          mutualBlocksRemoved++;
          
          console.log(`✅ تم إزالة الحظر العكسي من ${blockedUser.name}`);
        }
      }
    }
    
    console.log('\n📈 ملخص التنظيف:');
    console.log(`   - حالات الحظر المتبادل المكتشفة: ${mutualBlocksFound}`);
    console.log(`   - حالات الحظر المتبادل المزالة: ${mutualBlocksRemoved}`);
    console.log('\n✅ تم الانتهاء من التنظيف بنجاح!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ أثناء التنظيف:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupMutualBlocks();
