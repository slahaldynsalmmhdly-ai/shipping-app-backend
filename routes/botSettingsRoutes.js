const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @desc    Get bot settings for company
// @route   GET /api/v1/bot/settings
// @access  Private (Company only)
router.get('/settings', protect, async (req, res) => {
  try {
    // التحقق من أن المستخدم شركة
    if (req.user.userType !== 'company') {
      return res.status(403).json({ 
        success: false,
        message: 'هذه الميزة متاحة للشركات فقط' 
      });
    }

    const user = await User.findById(req.user.id).select('botEnabled');
    
    res.json({
      success: true,
      botEnabled: user.botEnabled || false
    });
  } catch (error) {
    console.error('❌ Error fetching bot settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في جلب إعدادات البوت' 
    });
  }
});

// @desc    Update bot settings (enable/disable)
// @route   PUT /api/v1/bot/settings
// @access  Private (Company only)
router.put('/settings', protect, async (req, res) => {
  try {
    // التحقق من أن المستخدم شركة
    if (req.user.userType !== 'company') {
      return res.status(403).json({ 
        success: false,
        message: 'هذه الميزة متاحة للشركات فقط' 
      });
    }

    const { botEnabled } = req.body;

    if (typeof botEnabled !== 'boolean') {
      return res.status(400).json({ 
        success: false,
        message: 'يجب تحديد حالة البوت (true أو false)' 
      });
    }

    const user = await User.findById(req.user.id);
    user.botEnabled = botEnabled;
    await user.save();

    res.json({
      success: true,
      message: botEnabled ? 'تم تفعيل البوت الذكي بنجاح' : 'تم إيقاف البوت الذكي',
      botEnabled: user.botEnabled
    });
  } catch (error) {
    console.error('❌ Error updating bot settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في تحديث إعدادات البوت' 
    });
  }
});

// @desc    Test bot response (for testing purposes)
// @route   POST /api/v1/bot/test
// @access  Private (Company only)
router.post('/test', protect, async (req, res) => {
  try {
    if (req.user.userType !== 'company') {
      return res.status(403).json({ 
        success: false,
        message: 'هذه الميزة متاحة للشركات فقط' 
      });
    }

    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'يجب إرسال رسالة للاختبار' 
      });
    }

    const { processChatMessage } = require('../utils/aiBotService');
    const result = await processChatMessage(message.trim(), req.user.id, []);

    res.json({
      success: true,
      response: result.response,
      shouldTransferToHuman: result.shouldTransferToHuman
    });
  } catch (error) {
    console.error('❌ Error testing bot:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في اختبار البوت',
      error: error.message 
    });
  }
});

module.exports = router;
