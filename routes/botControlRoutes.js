const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');

/**
 * @route   PUT /api/v1/bot-control/:conversationId/pause
 * @desc    إيقاف البوت مؤقتاً في محادثة معينة (الموظف يتولى المسؤولية)
 * @access  Private (Company only)
 */
router.put('/:conversationId/pause', protect, restrictTo('company'), async (req, res) => {
  try {
    const { conversationId } = req.params;

    // التحقق من أن المحادثة موجودة وأن الشركة طرف فيها
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    // إيقاف البوت
    conversation.botPaused = true;
    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'تم إيقاف البوت الذكي، أنت الآن تتولى المسؤولية',
      botPaused: true
    });

  } catch (error) {
    console.error('❌ Error pausing bot:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إيقاف البوت'
    });
  }
});

/**
 * @route   PUT /api/v1/bot-control/:conversationId/resume
 * @desc    استئناف عمل البوت في محادثة معينة (المتابعة مع الذكاء الاصطناعي)
 * @access  Private (Company only)
 */
router.put('/:conversationId/resume', protect, restrictTo('company'), async (req, res) => {
  try {
    const { conversationId } = req.params;

    // التحقق من أن المحادثة موجودة وأن الشركة طرف فيها
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    // استئناف البوت
    conversation.botPaused = false;
    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'تم استئناف البوت الذكي، سيرد تلقائياً على الرسائل',
      botPaused: false
    });

  } catch (error) {
    console.error('❌ Error resuming bot:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في استئناف البوت'
    });
  }
});

/**
 * @route   GET /api/v1/bot-control/:conversationId/status
 * @desc    الحصول على حالة البوت في محادثة معينة
 * @access  Private (Company only)
 */
router.get('/:conversationId/status', protect, restrictTo('company'), async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    res.status(200).json({
      success: true,
      botPaused: conversation.botPaused || false
    });

  } catch (error) {
    console.error('❌ Error getting bot status:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب حالة البوت'
    });
  }
});

module.exports = router;
