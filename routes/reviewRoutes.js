const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const User = require("../models/User"); // Import User model
const { protect } = require("../middleware/authMiddleware");

// @desc    Add new review to a user
// @route   POST /api/reviews/:userId
// @access  Private
router.post(
  "/:userId",
  protect,
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
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

module.exports = router;

