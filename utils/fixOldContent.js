const mongoose = require('mongoose');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');

/**
 * Fix old content that doesn't have isPublished field
 * This should be run once after deployment
 */
async function fixOldContent() {
  try {
    console.log('🔧 Fixing old content without isPublished field...');
    
    // Update all posts without isPublished field
    const postsResult = await Post.updateMany(
      { isPublished: { $exists: false } },
      { $set: { isPublished: true, scheduledTime: null } }
    );
    console.log(`✅ Updated ${postsResult.modifiedCount} old posts`);
    
    // Update all shipment ads without isPublished field
    const shipmentAdsResult = await ShipmentAd.updateMany(
      { isPublished: { $exists: false } },
      { $set: { isPublished: true, scheduledTime: null } }
    );
    console.log(`✅ Updated ${shipmentAdsResult.modifiedCount} old shipment ads`);
    
    // Update all empty truck ads without isPublished field
    const emptyTruckAdsResult = await EmptyTruckAd.updateMany(
      { isPublished: { $exists: false } },
      { $set: { isPublished: true, scheduledTime: null } }
    );
    console.log(`✅ Updated ${emptyTruckAdsResult.modifiedCount} old empty truck ads`);
    
    console.log('✅ All old content fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing old content:', error);
  }
}

module.exports = { fixOldContent };

