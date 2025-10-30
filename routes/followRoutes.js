const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

// @desc    Follow a user
// @route   POST /api/v1/follow/:userId
// @access  Private
router.post("/:userId", protect, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ msg: "لا يمكنك متابعة نفسك" });
    }

    // Check if already following
    if (currentUser.following.includes(req.params.userId)) {
      return res.status(400).json({ msg: "أنت تتابع هذا المستخدم بالفعل" });
    }

    // Add to following and followers
    currentUser.following.push(req.params.userId);
    userToFollow.followers.push(req.user._id);

    await currentUser.save();
    await userToFollow.save();

    res.json({ 
      msg: "تمت المتابعة بنجاح",
      followersCount: userToFollow.followers.length,
      followingCount: currentUser.following.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

// @desc    Unfollow a user
// @route   DELETE /api/v1/follow/:userId
// @access  Private
router.delete("/:userId", protect, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    // Check if not following
    if (!currentUser.following.includes(req.params.userId)) {
      return res.status(400).json({ msg: "أنت لا تتابع هذا المستخدم" });
    }

    // Remove from following and followers
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== req.params.userId
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ 
      msg: "تم إلغاء المتابعة بنجاح",
      followersCount: userToUnfollow.followers.length,
      followingCount: currentUser.following.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

// @desc    Get user followers
// @route   GET /api/v1/follow/:userId/followers
// @access  Public
router.get("/:userId/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("followers", "name avatar userType")
      .select("followers");

    if (!user) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    res.json({
      followers: user.followers,
      count: user.followers.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

// @desc    Get user following
// @route   GET /api/v1/follow/:userId/following
// @access  Public
router.get("/:userId/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("following", "name avatar userType")
      .select("following");

    if (!user) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    res.json({
      following: user.following,
      count: user.following.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

// @desc    Check if current user follows a specific user
// @route   GET /api/v1/follow/:userId/status
// @access  Private
router.get("/:userId/status", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select("following");

    if (!currentUser) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    const isFollowing = currentUser.following.some(
      id => id.toString() === req.params.userId
    );

    res.json({ isFollowing });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

// @desc    Get followers count
// @route   GET /api/v1/follow/:userId/followers/count
// @access  Public
router.get("/:userId/followers/count", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("followers");

    if (!user) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    res.json({ count: user.followers.length });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

// @desc    Get following count
// @route   GET /api/v1/follow/:userId/following/count
// @access  Public
router.get("/:userId/following/count", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("following");

    if (!user) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    res.json({ count: user.following.length });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("خطأ في الخادم");
  }
});

module.exports = router;
