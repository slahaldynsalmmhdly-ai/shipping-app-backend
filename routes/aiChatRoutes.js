const express = require('express');
const router = express.Router();
const {
  processUserMessage,
  processImageAnalysis,
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

/**
 * @route   POST /api/v1/chat/process-image
 * @desc    معالجة نتيجة تحليل الصورة مع البوت
 * @access  Public
 */
router.post('/process-image', async (req, res) => {
  try {
    const { analysisResult, conversationHistory } = req.body;
    
    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال نتيجة التحليل (analysisResult)'
      });
    }
    
    // معالجة نتيجة التحليل مع الذكاء الاصطناعي
    const result = await processImageAnalysis(analysisResult, conversationHistory || []);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('خطأ في معالجة تحليل الصورة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة تحليل الصورة',
      error: error.message
    });
  }
});

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
