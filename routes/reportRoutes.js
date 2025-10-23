const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Report = require("../models/Report");
const { protect } = require("../middleware/authMiddleware");

// @desc    Submit a report (post, user, or review)
// @route   POST /api/v1/reports
// @access  Private
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { reportType, targetId, reason, details, media, loadingDate, unloadingDate } = req.body;

    // Validate reportType
    const validReportTypes = ['post', 'user', 'review'];
    if (!reportType || !validReportTypes.includes(reportType)) {
      res.status(400);
      throw new Error("Invalid or missing report type");
    }

    // Validate reason
    const validReasons = ['scam', 'inappropriate', 'spam', 'communication_issue', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      res.status(400);
      throw new Error("Invalid or missing reason");
    }

    // Validate required fields
    if (!targetId || !details || !details.trim()) {
      res.status(400);
      throw new Error("Target ID and details are required");
    }

    // Determine target model based on report type
    let targetModel;
    if (reportType === 'post') {
      targetModel = 'Post';
    } else if (reportType === 'user') {
      targetModel = 'User';
    } else if (reportType === 'review') {
      targetModel = 'Review';
    }

    // Create report
    const report = new Report({
      reporter: req.user._id,
      reportType,
      targetId,
      targetModel,
      reason,
      details,
      media: media || '',
      loadingDate: loadingDate || '',
      unloadingDate: unloadingDate || '',
    });

    const createdReport = await report.save();

    res.status(201).json({
      message: "تم إرسال البلاغ بنجاح. سيتم مراجعته من قبل فريقنا.",
      report: createdReport
    });
  })
);

// @desc    Get all reports (admin only - for future use)
// @route   GET /api/v1/reports
// @access  Private/Admin
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const reports = await Report.find({})
      .populate("reporter", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ data: reports });
  })
);

module.exports = router;

