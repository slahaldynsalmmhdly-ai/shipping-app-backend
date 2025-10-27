const cron = require('node-cron');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');

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
      const postsResult = await Post.updateMany(
        {
          isPublished: false,
          scheduledTime: { $lte: now }
        },
        {
          $set: { isPublished: true }
        }
      );
      
      if (postsResult.modifiedCount > 0) {
        console.log(`📝 Published ${postsResult.modifiedCount} scheduled posts`);
      }
      
      // Publish scheduled shipment ads
      const shipmentAdsResult = await ShipmentAd.updateMany(
        {
          isPublished: false,
          scheduledTime: { $lte: now }
        },
        {
          $set: { isPublished: true }
        }
      );
      
      if (shipmentAdsResult.modifiedCount > 0) {
        console.log(`📦 Published ${shipmentAdsResult.modifiedCount} scheduled shipment ads`);
      }
      
      // Publish scheduled empty truck ads
      const emptyTruckAdsResult = await EmptyTruckAd.updateMany(
        {
          isPublished: false,
          scheduledTime: { $lte: now }
        },
        {
          $set: { isPublished: true }
        }
      );
      
      if (emptyTruckAdsResult.modifiedCount > 0) {
        console.log(`🚛 Published ${emptyTruckAdsResult.modifiedCount} scheduled empty truck ads`);
      }
      
    } catch (error) {
      console.error('❌ Error in content scheduler:', error);
    }
  });
  
  console.log('⏰ Content Scheduler initialized - Checking every minute for scheduled content');
}

module.exports = { startContentScheduler };

