const TruckBooking = require('../models/TruckBooking');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');

/**
 * إنشاء طلب حجز جديد
 * @param {Object} bookingData - بيانات الحجز
 * @returns {Promise<Object>} - {success, booking, message}
 */
async function createBooking(bookingData) {
  try {
    // التحقق من البيانات المطلوبة
    const requiredFields = [
      'customerName',
      'customerPhone',
      'customerAddress',
      'emptyTruckAdId',
      'fromCity',
      'toCity',
      'distance',
      'agreedPrice',
      'requestedPickupDate'
    ];
    
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return {
          success: false,
          message: `الحقل ${field} مطلوب`
        };
      }
    }
    
    // التحقق من وجود إعلان الشاحنة
    const truckAd = await EmptyTruckAd.findById(bookingData.emptyTruckAdId)
      .populate('user', 'name phone companyName');
    
    if (!truckAd) {
      return {
        success: false,
        message: 'إعلان الشاحنة غير موجود'
      };
    }
    
    // إنشاء الحجز
    const booking = await TruckBooking.create({
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      customerAddress: bookingData.customerAddress,
      pickupLocation: bookingData.pickupLocation || {},
      cargoDescription: bookingData.cargoDescription,
      cargoImages: bookingData.cargoImages || [],
      emptyTruckAd: bookingData.emptyTruckAdId,
      driver: truckAd.user._id,
      fromCity: bookingData.fromCity,
      toCity: bookingData.toCity,
      distance: bookingData.distance,
      estimatedDuration: bookingData.estimatedDuration,
      agreedPrice: bookingData.agreedPrice,
      currency: bookingData.currency || 'SAR',
      requestedPickupDate: bookingData.requestedPickupDate,
      customerNotes: bookingData.customerNotes,
      createdBy: bookingData.createdBy || 'ai_chatbot',
      conversationId: bookingData.conversationId,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        changedAt: new Date(),
        notes: 'تم إنشاء الطلب'
      }]
    });
    
    // إرسال إشعار للسائق
    await sendBookingNotificationToDriver(truckAd.user._id, booking._id);
    
    return {
      success: true,
      booking: booking,
      driver: {
        name: truckAd.user.name,
        phone: truckAd.user.phone,
        companyName: truckAd.user.companyName
      },
      message: 'تم إنشاء طلب الحجز بنجاح وإرساله للسائق'
    };
    
  } catch (error) {
    console.error('خطأ في إنشاء الحجز:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحجز',
      error: error.message
    };
  }
}

/**
 * إرسال إشعار للسائق بطلب حجز جديد
 * @param {String} driverId - معرف السائق
 * @param {String} bookingId - معرف الحجز
 */
async function sendBookingNotificationToDriver(driverId, bookingId) {
  try {
    const notification = {
      type: 'new_booking_request',
      booking: bookingId,
      read: false,
      createdAt: new Date(),
      message: 'لديك طلب حجز جديد من عميل'
    };
    
    await User.findByIdAndUpdate(
      driverId,
      { $push: { notifications: notification } },
      { new: true }
    );
    
    console.log(`✅ تم إرسال إشعار الحجز للسائق ${driverId}`);
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار الحجز:', error);
  }
}

/**
 * جلب حجوزات السائق
 * @param {String} driverId - معرف السائق
 * @param {String} status - حالة الحجز (اختياري)
 * @returns {Promise<Object>} - {success, bookings}
 */
async function getDriverBookings(driverId, status = null) {
  try {
    const query = { driver: driverId };
    if (status) {
      query.status = status;
    }
    
    const bookings = await TruckBooking.find(query)
      .populate('emptyTruckAd', 'currentLocation preferredDestination truckType')
      .sort({ createdAt: -1 });
    
    return {
      success: true,
      bookings: bookings,
      count: bookings.length
    };
  } catch (error) {
    console.error('خطأ في جلب حجوزات السائق:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب الحجوزات'
    };
  }
}

/**
 * تحديث حالة الحجز
 * @param {String} bookingId - معرف الحجز
 * @param {String} newStatus - الحالة الجديدة
 * @param {String} userId - معرف المستخدم الذي قام بالتحديث
 * @param {String} notes - ملاحظات (اختياري)
 * @returns {Promise<Object>} - {success, booking, message}
 */
async function updateBookingStatus(bookingId, newStatus, userId, notes = '') {
  try {
    const booking = await TruckBooking.findById(bookingId);
    
    if (!booking) {
      return {
        success: false,
        message: 'الحجز غير موجود'
      };
    }
    
    // تحديث الحالة
    booking.status = newStatus;
    booking.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: userId,
      notes: notes
    });
    
    await booking.save();
    
    // إرسال إشعار للعميل (إذا كان لديه حساب)
    // TODO: إضافة نظام إشعارات للعملاء
    
    return {
      success: true,
      booking: booking,
      message: `تم تحديث حالة الحجز إلى ${newStatus}`
    };
  } catch (error) {
    console.error('خطأ في تحديث حالة الحجز:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث الحجز'
    };
  }
}

module.exports = {
  createBooking,
  getDriverBookings,
  updateBookingStatus,
  sendBookingNotificationToDriver
};
