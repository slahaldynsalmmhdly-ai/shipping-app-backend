const express = require("express");
const router = express.Router();
const User = require("../models/User");
const WeeklyReport = require("../models/WeeklyReport");
const { protect } = require("../middleware/authMiddleware");
const { runAIFeaturesForUser } = require("../utils/aiService");

// Get AI features settings
router.get("/settings", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("aiFeatures aiScheduleSettings");
    
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    const aiFeatures = user.aiFeatures || {
      autoPosting: false,
      autoMessaging: false,
      fleetPromotion: false,
      weeklyReports: false,
    };

    const scheduleSettings = user.aiScheduleSettings || {
      enabled: false,
      scheduleTime: '09:00',
      timezone: 'Asia/Riyadh',
      lastRun: null,
    };

    res.json({
      autoPosting: aiFeatures.autoPosting,
      autoMessaging: aiFeatures.autoMessaging,
      fleetPromotion: aiFeatures.fleetPromotion,
      weeklyReports: aiFeatures.weeklyReports,
      scheduleEnabled: scheduleSettings.enabled,
      scheduleTime: scheduleSettings.scheduleTime,
      timezone: scheduleSettings.timezone,
      lastRun: scheduleSettings.lastRun,
    });
  } catch (error) {
    console.error("Error fetching AI features settings:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

// Update AI features settings
router.put("/settings", protect, async (req, res) => {
  try {
    const { autoPosting, autoMessaging, fleetPromotion, weeklyReports } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Only allow company users to use AI features
    if (user.userType !== "company") {
      return res.status(403).json({ message: "ميزات الذكاء الاصطناعي متاحة للشركات فقط" });
    }

    // Update AI features settings
    user.aiFeatures = {
      autoPosting: autoPosting !== undefined ? autoPosting : user.aiFeatures?.autoPosting || false,
      autoMessaging: autoMessaging !== undefined ? autoMessaging : user.aiFeatures?.autoMessaging || false,
      fleetPromotion: fleetPromotion !== undefined ? fleetPromotion : user.aiFeatures?.fleetPromotion || false,
      weeklyReports: weeklyReports !== undefined ? weeklyReports : user.aiFeatures?.weeklyReports || false,
    };

    await user.save();

    res.json({
      success: true,
      message: "تم تحديث إعدادات الذكاء الاصطناعي بنجاح",
      aiFeatures: user.aiFeatures,
    });
  } catch (error) {
    console.error("Error updating AI features settings:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

// Run AI features manually
router.post("/run", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Only allow company users to use AI features
    if (user.userType !== "company") {
      return res.status(403).json({ message: "ميزات الذكاء الاصطناعي متاحة للشركات فقط" });
    }

    // Check if at least one feature is enabled
    const hasEnabledFeature = user.aiFeatures && (
      user.aiFeatures.autoPosting ||
      user.aiFeatures.autoMessaging ||
      user.aiFeatures.fleetPromotion ||
      user.aiFeatures.weeklyReports
    );

    if (!hasEnabledFeature) {
      return res.status(400).json({ 
        message: "يجب تفعيل ميزة واحدة على الأقل من ميزات الذكاء الاصطناعي" 
      });
    }

    // Run AI features
    const results = await runAIFeaturesForUser(req.user._id);

    // Format response
    const response = {
      success: true,
      message: "تم تشغيل ميزات الذكاء الاصطناعي بنجاح",
      results: {
        autoPosting: results.autoPosting || { success: false, message: "غير مفعل" },
        autoMessaging: results.autoMessaging || { success: false, message: "غير مفعل" },
        fleetPromotion: results.fleetPromotion || { success: false, message: "غير مفعل" },
        weeklyReports: results.weeklyReports || { success: false, message: "غير مفعل" },
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error running AI features:", error);
    res.status(500).json({ 
      message: "خطأ في تشغيل ميزات الذكاء الاصطناعي", 
      error: error.message 
    });
  }
});

// Update schedule settings
router.put("/schedule", protect, async (req, res) => {
  try {
    const { enabled, scheduleTime, timezone } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Only allow company users
    if (user.userType !== "company") {
      return res.status(403).json({ message: "ميزات الذكاء الاصطناعي متاحة للشركات فقط" });
    }

    // Update schedule settings
    if (!user.aiScheduleSettings) {
      user.aiScheduleSettings = {};
    }

    if (enabled !== undefined) {
      user.aiScheduleSettings.enabled = enabled;
    }
    if (scheduleTime !== undefined) {
      // Validate time format (HH:mm)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(scheduleTime)) {
        return res.status(400).json({ message: "صيغة الوقت غير صحيحة. استخدم HH:mm" });
      }
      user.aiScheduleSettings.scheduleTime = scheduleTime;
    }
    if (timezone !== undefined) {
      user.aiScheduleSettings.timezone = timezone;
    }

    await user.save();

    res.json({
      success: true,
      message: "تم تحديث إعدادات الجدولة بنجاح",
      scheduleSettings: user.aiScheduleSettings,
    });
  } catch (error) {
    console.error("Error updating schedule settings:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

// Get weekly reports
router.get("/weekly-reports", protect, async (req, res) => {
  try {
    const reports = await WeeklyReport.find({ userId: req.user._id })
      .sort({ reportDate: -1 })
      .limit(10);

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error fetching weekly reports:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

// Mark weekly report as read
router.put("/weekly-reports/:reportId/read", protect, async (req, res) => {
  try {
    const report = await WeeklyReport.findOne({
      _id: req.params.reportId,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json({ message: "التقرير غير موجود" });
    }

    report.read = true;
    await report.save();

    res.json({
      success: true,
      message: "تم تحديث حالة التقرير",
    });
  } catch (error) {
    console.error("Error marking report as read:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
});

module.exports = router;

