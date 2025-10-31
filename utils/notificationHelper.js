const User = require('../models/User');

/**
 * توليد رسالة الإشعار بناءً على نوعه
 * @param {String} notificationType - نوع الإشعار
 * @param {Object} senderName - اسم المرسل
 * @returns {String} - رسالة الإشعار
 */
function generateNotificationMessage(notificationType, senderName) {
  const messages = {
    'new_following_post': `نشر ${senderName} منشوراً جديداً`,
    'new_following_shipment_ad': `نشر ${senderName} إعلان شحن جديد`,
    'new_following_empty_truck_ad': `نشر ${senderName} إعلان شاحنة فارغة جديد`,
    'like': `قام ${senderName} بالإعجاب بمنشورك`,
    'comment': `علق ${senderName} على منشورك`,
    'reply': `رد ${senderName} على تعليقك`,
    'comment_like': `قام ${senderName} بالإعجاب بتعليقك`,
    'reply_like': `قام ${senderName} بالإعجاب بردك`,
    'new_message': `أرسل ${senderName} رسالة جديدة`,
    'new_call': `اتصل ${senderName} بك`
  };
  
  return messages[notificationType] || 'إشعار جديد';
}

/**
 * تحديد نوع الإشعار بناءً على نوع المحتوى
 * @param {String} itemType - نوع المحتوى: 'post', 'shipmentAd', 'emptyTruckAd'
 * @returns {String} - نوع الإشعار
 */
function getNotificationTypeForItem(itemType) {
  const typeMap = {
    'post': 'new_following_post',
    'shipmentAd': 'new_following_shipment_ad',
    'emptyTruckAd': 'new_following_empty_truck_ad'
  };
  
  return typeMap[itemType] || 'new_following_post';
}

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
    const publisher = await User.findById(userId).select('followers name');
    
    if (!publisher || !publisher.followers || publisher.followers.length === 0) {
      return; // لا يوجد متابعين
    }
    
    const followers = publisher.followers;
    const publisherName = publisher.name;
    
    // حساب عدد المتابعين الذين سيرون المنشور في الخلاصة
    const feedCount = Math.ceil(followers.length * feedPercentage);
    
    // خلط المتابعين بشكل عشوائي واختيار من سيرى المنشور في الخلاصة
    const shuffledFollowers = [...followers].sort(() => Math.random() - 0.5);
    const followersInFeed = new Set(shuffledFollowers.slice(0, feedCount).map(id => id.toString()));
    
    // تحديد نوع الإشعار بناءً على نوع المحتوى
    const notificationType = getNotificationTypeForItem(itemType);
    
    // إنشاء إشعارات لجميع المتابعين
    const notificationPromises = followers.map(async (followerId) => {
      const isInFeed = followersInFeed.has(followerId.toString());
      
      // إنشاء كائن الإشعار
      const notification = {
        type: notificationType,
        sender: userId,
        itemType: itemType,
        read: false,
        createdAt: new Date(),
        showInFeed: isInFeed, // معلومة إضافية لتتبع ما إذا كان المنشور سيظهر في الخلاصة
        message: generateNotificationMessage(notificationType, publisherName)
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

/**
 * إنشاء إشعار للإعجاب بمنشور
 * @param {String} senderId - معرف المستخدم الذي أعجب
 * @param {String} receiverId - معرف صاحب المنشور
 * @param {String} itemId - معرف المنشور
 * @param {String} itemType - نوع المحتوى
 */
async function createLikeNotification(senderId, receiverId, itemId, itemType = 'post') {
  try {
    if (senderId === receiverId) {
      return; // لا نرسل إشعار للمستخدم نفسه
    }
    
    const sender = await User.findById(senderId).select('name');
    if (!sender) return;
    
    const notification = {
      type: 'like',
      sender: senderId,
      itemType: itemType,
      read: false,
      createdAt: new Date(),
      message: generateNotificationMessage('like', sender.name)
    };
    
    if (itemType === 'post') {
      notification.post = itemId;
    } else if (itemType === 'shipmentAd') {
      notification.shipmentAd = itemId;
    } else if (itemType === 'emptyTruckAd') {
      notification.emptyTruckAd = itemId;
    }
    
    await User.findByIdAndUpdate(
      receiverId,
      { $push: { notifications: notification } },
      { new: true }
    );
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء إشعار الإعجاب:', error);
  }
}

/**
 * إنشاء إشعار للتعليق على منشور
 * @param {String} senderId - معرف المستخدم الذي علق
 * @param {String} receiverId - معرف صاحب المنشور
 * @param {String} itemId - معرف المنشور
 * @param {String} commentId - معرف التعليق
 * @param {String} itemType - نوع المحتوى
 */
async function createCommentNotification(senderId, receiverId, itemId, commentId, itemType = 'post') {
  try {
    if (senderId === receiverId) {
      return; // لا نرسل إشعار للمستخدم نفسه
    }
    
    const sender = await User.findById(senderId).select('name');
    if (!sender) return;
    
    const notification = {
      type: 'comment',
      sender: senderId,
      itemType: itemType,
      commentId: commentId,
      read: false,
      createdAt: new Date(),
      message: generateNotificationMessage('comment', sender.name)
    };
    
    if (itemType === 'post') {
      notification.post = itemId;
    } else if (itemType === 'shipmentAd') {
      notification.shipmentAd = itemId;
    } else if (itemType === 'emptyTruckAd') {
      notification.emptyTruckAd = itemId;
    }
    
    await User.findByIdAndUpdate(
      receiverId,
      { $push: { notifications: notification } },
      { new: true }
    );
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء إشعار التعليق:', error);
  }
}

module.exports = {
  createFollowingPostNotifications,
  deleteFollowingPostNotifications,
  createLikeNotification,
  createCommentNotification,
  generateNotificationMessage
};
