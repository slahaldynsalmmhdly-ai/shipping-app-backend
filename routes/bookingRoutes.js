const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createBooking,
  getDriverBookings,
  updateBookingStatus
} = require('../services/bookingService');

/**
 * @route   POST /api/v1/bookings
 * @desc    إنشاء طلب حجز جديد
 * @access  Public (من البوت) / Private (من المستخدمين)
 */
router.post('/', async (req, res) => {
  try {
    const bookingData = req.body;
    
    const result = await createBooking(bookingData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('خطأ في إنشاء الحجز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحجز',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/bookings/driver/:driverId
 * @desc    جلب حجوزات السائق
 * @access  Private
 */
router.get('/driver/:driverId', protect, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.query;
    
    // التحقق من أن المستخدم هو السائق نفسه أو أدمن
    if (req.user.id !== driverId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لهذه البيانات'
      });
    }
    
    const result = await getDriverBookings(driverId, status);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('خطأ في جلب الحجوزات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الحجوزات',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/v1/bookings/:bookingId/status
 * @desc    تحديث حالة الحجز
 * @access  Private
 */
router.patch('/:bookingId/status', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الحالة الجديدة'
      });
    }
    
    const result = await updateBookingStatus(
      bookingId,
      status,
      req.user.id,
      notes
    );
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('خطأ في تحديث حالة الحجز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الحجز',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/bookings/:bookingId
 * @desc    جلب تفاصيل حجز محدد
 * @access  Private
 */
router.get('/:bookingId', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const TruckBooking = require('../models/TruckBooking');
    
    const booking = await TruckBooking.findById(bookingId)
      .populate('emptyTruckAd')
      .populate('driver', 'name phone companyName');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'الحجز غير موجود'
      });
    }
    
    // التحقق من الصلاحيات
    if (
      booking.driver._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لهذا الحجز'
      });
    }
    
    res.status(200).json({
      success: true,
      booking: booking
    });
  } catch (error) {
    console.error('خطأ في جلب تفاصيل الحجز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الحجز',
      error: error.message
    });
  }
});

module.exports = router;
