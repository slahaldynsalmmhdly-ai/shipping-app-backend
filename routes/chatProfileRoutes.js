const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const ChatProfile = require("../models/ChatProfile");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// @desc    Get chat profile for logged-in user
// @route   GET /api/v1/chat-profile/me
// @access  Private
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    // Get user basic info
    const user = await User.findById(req.user._id).select("name email");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Get or create chat profile
    let chatProfile = await ChatProfile.findOne({ user: req.user._id });

    if (!chatProfile) {
      // Create default chat profile if doesn't exist
      chatProfile = await ChatProfile.create({
        user: req.user._id,
        avatar: "",
        description: "",
      });
    }

    res.json({
      name: user.name,
      email: user.email,
      avatar: chatProfile.avatar,
      description: chatProfile.description,
    });
  })
);

// @desc    Update chat profile
// @route   PUT /api/v1/chat-profile/me
// @access  Private
router.put(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const { avatar, description } = req.body;

    // Get or create chat profile
    let chatProfile = await ChatProfile.findOne({ user: req.user._id });

    if (!chatProfile) {
      // Create new chat profile
      chatProfile = await ChatProfile.create({
        user: req.user._id,
        avatar: avatar || "",
        description: description || "",
      });
    } else {
      // Update existing chat profile
      if (avatar !== undefined) chatProfile.avatar = avatar;
      if (description !== undefined) chatProfile.description = description;
      await chatProfile.save();
    }

    res.json({
      avatar: chatProfile.avatar,
      description: chatProfile.description,
      message: "تم تحديث الملف الشخصي بنجاح",
    });
  })
);

module.exports = router;
