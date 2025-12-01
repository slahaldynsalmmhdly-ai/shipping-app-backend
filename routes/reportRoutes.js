const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Report = require("../models/Report");
const { protect } = require("../middleware/authMiddleware");

// @desc    Submit a report (post, user, review, comment, reply, video)
// @route   POST /api/v1/reports
// @access  Private
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { reportType, targetId, reason, details, media, loadingDate, unloadingDate } = req.body;

    // Validate reportType
    const validReportTypes = ['post', 'user', 'review', 'comment', 'reply', 'video'];
    if (!reportType || !validReportTypes.includes(reportType)) {
      res.status(400);
      throw new Error("Invalid or missing report type");
    }

    // Validate required fields
    if (!targetId) {
      res.status(400);
      throw new Error("Target ID is required");
    }

    if (!reason || !reason.trim()) {
      res.status(400);
      throw new Error("Reason is required");
    }

    // Determine target model based on report type
    let targetModel;
    if (reportType === 'post') {
      targetModel = 'Post';
    } else if (reportType === 'user') {
      targetModel = 'User';
    } else if (reportType === 'review') {
      targetModel = 'Review';
    } else if (reportType === 'comment') {
      targetModel = 'Comment';
    } else if (reportType === 'reply') {
      targetModel = 'Reply';
    } else if (reportType === 'video') {
      targetModel = 'Short'; // Assuming videos are stored as Shorts
    }

    // Create report
    const report = new Report({
      reporter: req.user._id,
      reportType,
      targetId,
      targetModel,
      reason,
      details: details || '',
      media: Array.isArray(media) ? media : (media ? [media] : []),
      loadingDate: loadingDate || null,
      unloadingDate: unloadingDate || null,
    });

    const createdReport = await report.save();

    res.status(201).json({
      message: "Report submitted successfully",
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

// @desc    Get user's own reports
// @route   GET /api/v1/reports/my-reports
// @access  Private
router.get(
  "/my-reports",
  protect,
  asyncHandler(async (req, res) => {
    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ data: reports });
  })
);

// @desc    Update report status (admin only - for future use)
// @route   PATCH /api/v1/reports/:id/status
// @access  Private/Admin
router.patch(
  "/:id/status",
  protect,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400);
      throw new Error("Invalid status");
    }

    const report = await Report.findById(req.params.id);
    
    if (!report) {
      res.status(404);
      throw new Error("Report not found");
    }

    report.status = status;
    const updatedReport = await report.save();

    res.json({
      message: "Report status updated successfully",
      report: updatedReport
    });
  })
);

module.exports = router;
