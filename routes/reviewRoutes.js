const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const ReviewDeletionRequest = require("../models/ReviewDeletionRequest");
const User = require("../models/User"); // Import User model
const { protect } = require("../middleware/authMiddleware");

// @desc    Add new review to a user
// @route   POST /api/reviews/:userId
// @access  Private
router.post(
  "/:userId",
  protect,
  asyncHandler(async (req, res) => {
    const { rating, comment, media } = req.body;
    const targetUserId = req.params.userId;

    // Ensure the user is not reviewing their own profile
    if (req.user._id.toString() === targetUserId) {
      res.status(400);
      throw new Error("Cannot review your own profile");
    }

    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      res.status(404);
      throw new Error("User not found");
    }

    const alreadyReviewed = await Review.findOne({
      author: req.user._id,
      user: targetUserId,
    });

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("You have already reviewed this user");
    }

    const review = new Review({
      author: req.user._id,
      user: targetUserId,
      rating,
      comment,
      media: media || [],
    });

    const createdReview = await review.save();

    res.status(201).json(createdReview);
  })
);

// @desc    Get reviews for a user
// @route   GET /api/reviews/:userId
// @access  Public
router.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      res.status(404);
      throw new Error("User not found");
    }

    const reviews = await Review.find({ user: req.params.userId }).populate(
      "author",
      "name avatar"
    );

    res.json({ data: reviews });
  })
);

// @desc    Request deletion of a review
// @route   POST /api/reviews/:reviewId/delete-request
// @access  Private
router.post(
  "/:reviewId/delete-request",
  protect,
  asyncHandler(async (req, res) => {
    const { reason, otherReasonText } = req.body;
    const reviewId = req.params.reviewId;

    // Validate reason
    const validReasons = [
      'تعليق غير مرغوب فيه أو إسبام',
      'محتوى يحض على الكراهية أو عنيف',
      'مضايقة أو تنمر',
      'معلومات زائفة',
      'سبب آخر'
    ];

    if (!reason || !validReasons.includes(reason)) {
      res.status(400);
      throw new Error("Invalid or missing reason");
    }

    // If reason is "سبب آخر", otherReasonText is required
    if (reason === 'سبب آخر' && (!otherReasonText || !otherReasonText.trim())) {
      res.status(400);
      throw new Error("Other reason text is required when selecting 'سبب آخر'");
    }

    // Check if review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404);
      throw new Error("Review not found");
    }

    // Check if user is the owner of the profile being reviewed (they can request deletion)
    if (review.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only request deletion of reviews on your profile");
    }

    // Check if a deletion request already exists for this review
    const existingRequest = await ReviewDeletionRequest.findOne({
      review: reviewId,
      status: 'pending'
    });

    if (existingRequest) {
      res.status(400);
      throw new Error("A deletion request for this review is already pending");
    }

    // Create deletion request
    const deletionRequest = new ReviewDeletionRequest({
      review: reviewId,
      requestedBy: req.user._id,
      reason,
      otherReasonText: reason === 'سبب آخر' ? otherReasonText : '',
    });

    const createdRequest = await deletionRequest.save();

    res.status(201).json({
      message: "تم إرسال طلب حذف التقييم بنجاح. سيتم مراجعته قريباً.",
      request: createdRequest
    });
  })
);

module.exports = router;

