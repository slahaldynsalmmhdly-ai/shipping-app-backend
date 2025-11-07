const express = require('express');
const router = express.Router();
const {
  processUserMessage,
  calculatePriceWithAI
} = require('../services/aiChatService');

/**
 * @route   POST /api/v1/chat/message
 * @desc    إرسال رسالة للبوت الذكي
 * @access  Public
 */
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال رسالة (message)'
      });
    }
    
    // معالجة الرسالة مع الذكاء الاصطناعي
    const result = await processUserMessage(message, conversationHistory || []);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('خطأ في معالجة الرسالة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الرسالة',
      error: error.message
    });
  }
});

// تم حذف ميزة معالجة الصور - لم تعد مطلوبة

/**
 * @route   POST /api/v1/chat/calculate-price
 * @desc    حساب السعر مع رد ذكي من البوت
 * @access  Public
 */
router.post('/calculate-price', async (req, res) => {
  try {
    const { cargoType, distance, conversationHistory } = req.body;
    
    if (!cargoType || !distance) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال نوع الحمولة (cargoType) والمسافة (distance)'
      });
    }
    
    // حساب السعر مع رد ذكي
    const result = await calculatePriceWithAI(cargoType, distance, conversationHistory || []);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('خطأ في حساب السعر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حساب السعر',
      error: error.message
    });
  }
});

module.exports = router;

/**
 * @route   POST /api/v1/chat/create-booking
 * @desc    إنشاء حجز من خلال البوت الذكي
 * @access  Public
 */
router.post('/create-booking', async (req, res) => {
  try {
    const { bookingInfo, conversationHistory } = req.body;
    
    if (!bookingInfo) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال معلومات الحجز (bookingInfo)'
      });
    }
    
    const { processBookingRequest } = require('../services/aiChatService');
    
    // معالجة طلب الحجز مع الذكاء الاصطناعي
    const result = await processBookingRequest(bookingInfo, conversationHistory || []);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('خطأ في معالجة طلب الحجز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة طلب الحجز',
      error: error.message
    });
  }
});

module.exports = router;
