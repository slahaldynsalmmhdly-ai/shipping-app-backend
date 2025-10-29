const cron = require('node-cron');
const Vehicle = require('../models/Vehicle');
const { autoPostSingleEmptyTruck } = require('./autoPostEmptyTruck');

/**
 * مجدول إعادة النشر التلقائي للشاحنات الفارغة
 * يعمل كل 6 ساعات للبحث عن شاحنات فارغة لم يتم نشرها منذ يوم أو يومين
 */
function startRepostEmptyTrucksScheduler() {
  // يعمل كل 6 ساعات
  // Cron format: 0 */6 * * * = كل 6 ساعات عند الدقيقة 0
  cron.schedule('0 */6 * * *', async () => {
    const currentTime = new Date();
    console.log('🔄 [Repost Scheduler] Checking for empty trucks to repost at', currentTime.toISOString());
    
    try {
      // البحث عن الشاحنات الفارغة التي:
      // 1. حالتها "متاح"
      // 2. تم نشر إعلان لها من قبل (lastAutoPostedAt موجود)
      // 3. مر على آخر نشر 24-48 ساعة
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const trucksToRepost = await Vehicle.find({
        status: "متاح",
        lastAutoPostedAt: {
          $exists: true,
          $ne: null,
          $lte: oneDayAgo, // آخر نشر كان قبل يوم على الأقل
        }
      }).populate('user');

      if (trucksToRepost.length === 0) {
        console.log('   ℹ️  No empty trucks need reposting');
        return;
      }

      console.log(`   📋 Found ${trucksToRepost.length} empty trucks that need reposting`);

      let repostedCount = 0;

      for (const truck of trucksToRepost) {
        try {
          // التحقق من أن المستخدم شركة ولديه ميزة النشر التلقائي مفعلة
          if (!truck.user || truck.user.userType !== 'company') {
            continue;
          }

          if (!truck.user.aiFeatures || !truck.user.aiFeatures.autoPosting) {
            continue;
          }

          // حساب الوقت منذ آخر نشر
          const hoursSinceLastPost = (Date.now() - truck.lastAutoPostedAt.getTime()) / (1000 * 60 * 60);
          
          // إعادة النشر إذا مر 24-48 ساعة
          if (hoursSinceLastPost >= 24 && hoursSinceLastPost <= 48) {
            console.log(`   🔄 Reposting for truck: ${truck.vehicleName} (${truck.licensePlate})`);
            console.log(`      Last posted: ${hoursSinceLastPost.toFixed(1)} hours ago`);
            
            const result = await autoPostSingleEmptyTruck(truck._id);
            
            if (result.success) {
              console.log(`      ✅ Successfully reposted`);
              repostedCount++;
            } else {
              console.log(`      ⚠️ Failed to repost: ${result.message}`);
            }
          } else if (hoursSinceLastPost > 48) {
            // إذا مر أكثر من 48 ساعة، نعيد النشر أيضاً
            console.log(`   🔄 Reposting for truck (overdue): ${truck.vehicleName} (${truck.licensePlate})`);
            console.log(`      Last posted: ${hoursSinceLastPost.toFixed(1)} hours ago`);
            
            const result = await autoPostSingleEmptyTruck(truck._id);
            
            if (result.success) {
              console.log(`      ✅ Successfully reposted`);
              repostedCount++;
            } else {
              console.log(`      ⚠️ Failed to repost: ${result.message}`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Error reposting for truck ${truck.vehicleName}:`, error.message);
        }
      }

      if (repostedCount > 0) {
        console.log(`   ✅ Reposted ${repostedCount} empty truck ads`);
      }
    } catch (error) {
      console.error('❌ [Repost Scheduler] Fatal error:', error);
    }
  });

  console.log('🔄 Repost Empty Trucks Scheduler initialized - Checking every 6 hours');
}

module.exports = {
  startRepostEmptyTrucksScheduler,
};
