const User = require('../models/User');

/**
 * إرسال إشعارات للمستخدمين المشار إليهم
 * @param {String} senderId - معرف المستخدم الذي قام بالإشارة
 * @param {Array} mentionIds - مصفوفة معرفات المستخدمين المشار إليهم
 * @param {String} contentId - معرف المحتوى (منشور أو إعلان)
 * @param {String} contentType - نوع المحتوى ('post', 'shipmentAd', 'emptyTruckAd')
 */
const createMentionNotifications = async (senderId, mentionIds, contentId, contentType) => {
  try {
    if (!mentionIds || mentionIds.length === 0) {
      return;
    }

    // إزالة المرسل من قائمة المشار إليهم (لا يمكن للمستخدم الإشارة لنفسه)
    const filteredMentionIds = mentionIds.filter(id => id.toString() !== senderId.toString());

    if (filteredMentionIds.length === 0) {
      return;
    }

    // إنشاء كائن الإشعار
    const notificationData = {
      type: 'mention',
      sender: senderId,
      read: false,
      createdAt: new Date()
    };

    // إضافة معرف المحتوى حسب النوع
    if (contentType === 'post') {
      notificationData.post = contentId;
      notificationData.itemType = 'post';
    } else if (contentType === 'shipmentAd') {
      notificationData.shipmentAd = contentId;
      notificationData.itemType = 'shipmentAd';
    } else if (contentType === 'emptyTruckAd') {
      notificationData.emptyTruckAd = contentId;
      notificationData.itemType = 'emptyTruckAd';
    }

    // إرسال الإشعار لكل مستخدم مشار إليه
    await User.updateMany(
      { _id: { $in: filteredMentionIds } },
      { $push: { notifications: notificationData } }
    );

    console.log(`تم إرسال ${filteredMentionIds.length} إشعار إشارة للمستخدمين`);
  } catch (error) {
    console.error('خطأ في إرسال إشعارات الإشارات:', error);
    throw error;
  }
};

module.exports = {
  createMentionNotifications
};
