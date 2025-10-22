const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const CallLog = require("../models/CallLog");

// @route   GET /api/v1/call-logs
// @desc    الحصول على سجل المكالمات للمستخدم الحالي
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const callLogs = await CallLog.find({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }],
    })
      .populate("caller", "name avatar")
      .populate("receiver", "name avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(callLogs);
  } catch (error) {
    console.error("Error fetching call logs:", error);
    res.status(500).json({ message: "فشل في جلب سجل المكالمات" });
  }
});

// @route   GET /api/v1/call-logs/missed
// @desc    الحصول على المكالمات الفائتة فقط
// @access  Private
router.get("/missed", protect, async (req, res) => {
  try {
    const missedCalls = await CallLog.find({
      receiver: req.user._id,
      status: "missed",
    })
      .populate("caller", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(missedCalls);
  } catch (error) {
    console.error("Error fetching missed calls:", error);
    res.status(500).json({ message: "فشل في جلب المكالمات الفائتة" });
  }
});

// @route   GET /api/v1/call-logs/unread-count
// @desc    الحصول على عدد المكالمات الفائتة غير المقروءة
// @access  Private
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await CallLog.countDocuments({
      receiver: req.user._id,
      status: "missed",
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "فشل في جلب عدد المكالمات غير المقروءة" });
  }
});

// @route   POST /api/v1/call-logs
// @desc    إنشاء سجل مكالمة جديد
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { receiverId, callType, status } = req.body;

    if (!receiverId || !callType) {
      return res.status(400).json({ message: "receiverId و callType مطلوبان" });
    }

    const callLog = await CallLog.create({
      caller: req.user._id,
      receiver: receiverId,
      callType,
      status: status || "missed",
      startedAt: new Date(),
    });

    const populatedCallLog = await CallLog.findById(callLog._id)
      .populate("caller", "name avatar")
      .populate("receiver", "name avatar");

    res.status(201).json(populatedCallLog);
  } catch (error) {
    console.error("Error creating call log:", error);
    res.status(500).json({ message: "فشل في إنشاء سجل المكالمة" });
  }
});

// @route   PUT /api/v1/call-logs/:id
// @desc    تحديث سجل مكالمة (تغيير الحالة، المدة، إلخ)
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const { status, duration, endedAt } = req.body;

    const callLog = await CallLog.findById(req.params.id);

    if (!callLog) {
      return res.status(404).json({ message: "سجل المكالمة غير موجود" });
    }

    // التحقق من أن المستخدم هو المتصل أو المستقبل
    if (
      callLog.caller.toString() !== req.user._id.toString() &&
      callLog.receiver.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "غير مصرح لك بتحديث هذا السجل" });
    }

    if (status) callLog.status = status;
    if (duration !== undefined) callLog.duration = duration;
    if (endedAt) callLog.endedAt = endedAt;

    await callLog.save();

    const populatedCallLog = await CallLog.findById(callLog._id)
      .populate("caller", "name avatar")
      .populate("receiver", "name avatar");

    res.json(populatedCallLog);
  } catch (error) {
    console.error("Error updating call log:", error);
    res.status(500).json({ message: "فشل في تحديث سجل المكالمة" });
  }
});

// @route   PUT /api/v1/call-logs/:id/mark-read
// @desc    تعليم المكالمة الفائتة كمقروءة
// @access  Private
router.put("/:id/mark-read", protect, async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id);

    if (!callLog) {
      return res.status(404).json({ message: "سجل المكالمة غير موجود" });
    }

    // التحقق من أن المستخدم هو المستقبل
    if (callLog.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بتحديث هذا السجل" });
    }

    callLog.isRead = true;
    await callLog.save();

    res.json({ message: "تم تعليم المكالمة كمقروءة" });
  } catch (error) {
    console.error("Error marking call as read:", error);
    res.status(500).json({ message: "فشل في تعليم المكالمة كمقروءة" });
  }
});

// @route   PUT /api/v1/call-logs/mark-all-read
// @desc    تعليم جميع المكالمات الفائتة كمقروءة
// @access  Private
router.put("/mark-all-read", protect, async (req, res) => {
  try {
    await CallLog.updateMany(
      {
        receiver: req.user._id,
        status: "missed",
        isRead: false,
      },
      {
        isRead: true,
      }
    );

    res.json({ message: "تم تعليم جميع المكالمات كمقروءة" });
  } catch (error) {
    console.error("Error marking all calls as read:", error);
    res.status(500).json({ message: "فشل في تعليم المكالمات كمقروءة" });
  }
});

// @route   DELETE /api/v1/call-logs/:id
// @desc    حذف سجل مكالمة
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id);

    if (!callLog) {
      return res.status(404).json({ message: "سجل المكالمة غير موجود" });
    }

    // التحقق من أن المستخدم هو المتصل أو المستقبل
    if (
      callLog.caller.toString() !== req.user._id.toString() &&
      callLog.receiver.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا السجل" });
    }

    await callLog.deleteOne();

    res.json({ message: "تم حذف سجل المكالمة" });
  } catch (error) {
    console.error("Error deleting call log:", error);
    res.status(500).json({ message: "فشل في حذف سجل المكالمة" });
  }
});

module.exports = router;

