const cron = require('node-cron');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const { createFollowingPostNotifications } = require('./notificationHelper');

/**
 * Content Scheduler - Publishes scheduled posts and ads
 * Runs every minute to check for content that should be published
 */
function startContentScheduler() {
  // Run every minute to check for scheduled content
  // Cron format: * * * * * = Every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    try {
      // Publish scheduled posts
      const scheduledPosts = await Post.find({
        isPublished: false,
        scheduledTime: { $lte: now }
      });
      
      for (const post of scheduledPosts) {
        post.isPublished = true;
        await post.save();
        
        // إرسال إشعارات للمتابعين
        try {
          await createFollowingPostNotifications(post.user, post._id, 'post', 0.15);
        } catch (notifError) {
          console.error('خطأ في إرسال إشعارات للمنشور المجدول:', notifError);
        }
      }
      
      if (scheduledPosts.length > 0) {
        console.log(`📝 Published ${scheduledPosts.length} scheduled posts with notifications`);
      }
      
      // Publish scheduled shipment ads
      const scheduledShipmentAds = await ShipmentAd.find({
        isPublished: false,
        scheduledTime: { $lte: now }
      });
      
      for (const ad of scheduledShipmentAds) {
        ad.isPublished = true;
        await ad.save();
        
        // إرسال إشعارات للمتابعين
        try {
          await createFollowingPostNotifications(ad.user, ad._id, 'shipmentAd', 0.15);
        } catch (notifError) {
          console.error('خطأ في إرسال إشعارات لإعلان الشحن المجدول:', notifError);
        }
      }
      
      if (scheduledShipmentAds.length > 0) {
        console.log(`📦 Published ${scheduledShipmentAds.length} scheduled shipment ads with notifications`);
      }
      
      // Publish scheduled empty truck ads
      const scheduledEmptyTruckAds = await EmptyTruckAd.find({
        isPublished: false,
        scheduledTime: { $lte: now }
      });
      
      for (const ad of scheduledEmptyTruckAds) {
        ad.isPublished = true;
        await ad.save();
        
        // إرسال إشعارات للمتابعين
        try {
          await createFollowingPostNotifications(ad.user, ad._id, 'emptyTruckAd', 0.15);
        } catch (notifError) {
          console.error('خطأ في إرسال إشعارات لإعلان الشاحنة الفارغة المجدول:', notifError);
        }
      }
      
      if (scheduledEmptyTruckAds.length > 0) {
        console.log(`🚛 Published ${scheduledEmptyTruckAds.length} scheduled empty truck ads with notifications`);
      }
      
    } catch (error) {
      console.error('❌ Error in content scheduler:', error);
    }
  });
  
  console.log('⏰ Content Scheduler initialized - Checking every minute for scheduled content');
}

module.exports = { startContentScheduler };

