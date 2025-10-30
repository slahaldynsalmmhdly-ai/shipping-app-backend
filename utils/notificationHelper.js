const User = require('../models/User');

/**
 * إنشاء إشعارات للمتابعين عند نشر منشور/إعلان جديد
 * @param {String} userId - معرف المستخدم الذي نشر المحتوى
 * @param {String} itemId - معرف المنشور/الإعلان
 * @param {String} itemType - نوع المحتوى: 'post', 'shipmentAd', 'emptyTruckAd'
 * @param {Number} feedPercentage - نسبة المنشورات التي ستظهر في الخلاصة (0.10 أو 0.15)
 */
async function createFollowingPostNotifications(userId, itemId, itemType, feedPercentage = 0.15) {
  try {
    // جلب المستخدم الذي نشر المحتوى
    const publisher = await User.findById(userId).select('followers');
    
    if (!publisher || !publisher.followers || publisher.followers.length === 0) {
      return; // لا يوجد متابعين
    }
    
    const followers = publisher.followers;
    
    // حساب عدد المتابعين الذين سيرون المنشور في الخلاصة
    const feedCount = Math.ceil(followers.length * feedPercentage);
    
    // خلط المتابعين بشكل عشوائي واختيار من سيرى المنشور في الخلاصة
    const shuffledFollowers = [...followers].sort(() => Math.random() - 0.5);
    const followersInFeed = new Set(shuffledFollowers.slice(0, feedCount).map(id => id.toString()));
    
    // إنشاء إشعارات لجميع المتابعين
    const notificationPromises = followers.map(async (followerId) => {
      const isInFeed = followersInFeed.has(followerId.toString());
      
      // إنشاء كائن الإشعار
      const notification = {
        type: 'new_following_post',
        sender: userId,
        itemType: itemType,
        read: false,
        createdAt: new Date(),
        showInFeed: isInFeed // معلومة إضافية لتتبع ما إذا كان المنشور سيظهر في الخلاصة
      };
      
      // إضافة المرجع المناسب حسب نوع المحتوى
      if (itemType === 'post') {
        notification.post = itemId;
      } else if (itemType === 'shipmentAd') {
        notification.shipmentAd = itemId;
      } else if (itemType === 'emptyTruckAd') {
        notification.emptyTruckAd = itemId;
      }
      
      // إضافة الإشعار للمتابع
      await User.findByIdAndUpdate(
        followerId,
        { $push: { notifications: notification } },
        { new: true }
      );
    });
    
    await Promise.all(notificationPromises);
    
    console.log(`✅ تم إنشاء ${followers.length} إشعار للمنشور ${itemId} من نوع ${itemType}`);
    console.log(`📊 ${feedCount} متابع سيرون المنشور في الخلاصة، ${followers.length - feedCount} في الإشعارات فقط`);
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء إشعارات المتابعين:', error);
  }
}

/**
 * حذف إشعارات المنشور عند حذفه
 * @param {String} itemId - معرف المنشور/الإعلان
 * @param {String} itemType - نوع المحتوى
 */
async function deleteFollowingPostNotifications(itemId, itemType) {
  try {
    const filter = { 'notifications.itemType': itemType };
    
    if (itemType === 'post') {
      filter['notifications.post'] = itemId;
    } else if (itemType === 'shipmentAd') {
      filter['notifications.shipmentAd'] = itemId;
    } else if (itemType === 'emptyTruckAd') {
      filter['notifications.emptyTruckAd'] = itemId;
    }
    
    await User.updateMany(
      filter,
      { $pull: { notifications: { [itemType === 'post' ? 'post' : itemType === 'shipmentAd' ? 'shipmentAd' : 'emptyTruckAd']: itemId } } }
    );
    
    console.log(`🗑️ تم حذف إشعارات المنشور ${itemId} من نوع ${itemType}`);
  } catch (error) {
    console.error('❌ خطأ في حذف إشعارات المنشور:', error);
  }
}

module.exports = {
  createFollowingPostNotifications,
  deleteFollowingPostNotifications
};
