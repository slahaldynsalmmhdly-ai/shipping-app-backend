const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Post = require("../models/Post");
const ShipmentAd = require("../models/ShipmentAd");
const EmptyTruckAd = require("../models/EmptyTruckAd");
const Review = require("../models/Review");

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Calculate rating and reviewCount
    const reviews = await Review.find({ user: user._id });
    const rating = reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;
    const reviewCount = reviews.length;

    // Calculate likes count from all posts
    const posts = await Post.find({ user: user._id });
    const likesCount = posts.reduce((total, post) => {
      return total + (post.reactions?.filter(r => r.type === 'like').length || 0);
    }, 0);

    res.json({
      user: {
        ...user.toObject(),
        rating,
        reviewCount,
        likesCount,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get user notifications
// @route   GET /api/v1/users/me/notifications
// @access  Private
router.get("/me/notifications", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "notifications.sender",
      select: "name avatar",
    }).populate({
      path: "notifications.post",
      select: "text originalPost originalPostType media",
    }).populate({
      path: "notifications.shipmentAd",
      select: "pickupLocation deliveryLocation description media",
    }).populate({
      path: "notifications.emptyTruckAd",
      select: "currentLocation preferredDestination additionalNotes media",
    }).sort({"notifications.createdAt": -1});

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Manually populate comment and reply details
    const populatedNotifications = user.notifications.map(notif => {
      let commentData = null;
      let replyData = null;

      // If notification has a commentId and the post is available with comments
      if (notif.commentId && notif.post && notif.post.comments) {
        const foundComment = notif.post.comments.find(c => c._id.toString() === notif.commentId.toString());
        if (foundComment) {
          commentData = { _id: foundComment._id, text: foundComment.text };
        }
      }

      // If notification has a replyId and the post is available with comments and replies
      if (notif.replyId && notif.post && notif.post.comments) {
        let foundCommentForReply = null;
        // Try to find the parent comment using commentId from notification if available
        if (notif.commentId) {
          foundCommentForReply = notif.post.comments.find(c => c._id.toString() === notif.commentId.toString());
        } else { // Fallback: iterate through all comments to find the reply
          for (const c of notif.post.comments) {
            const r = c.replies.find(r => r._id.toString() === notif.replyId.toString());
            if (r) { foundCommentForReply = c; break; }
          }
        }

        if (foundCommentForReply && foundCommentForReply.replies) {
          const foundReply = foundCommentForReply.replies.find(r => r._id.toString() === notif.replyId.toString());
          if (foundReply) {
            replyData = { _id: foundReply._id, text: foundReply.text };
          }
        }
      }

      return {
        ...notif.toObject(), // Convert mongoose document to plain object
        comment: commentData, // Attach the found comment object
        reply: replyData,     // Attach the found reply object
      };
    });

    res.json(populatedNotifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Mark a single notification as read
// @route   PUT /api/v1/users/me/notifications/:id/read
// @access  Private
router.put("/me/notifications/:id/read", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const notification = user.notifications.id(req.params.id);
    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    notification.read = true;
    await user.save();
    
    res.json({ msg: "Notification marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Mark all user notifications as read
// @route   POST /api/v1/users/me/notifications/mark-all-as-read
// @access  Private
router.post("/me/notifications/mark-all-as-read", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.notifications.forEach(notif => {
      notif.read = true;
    });

    await user.save();
    res.json({ msg: "All notifications marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Mark user notifications as read (legacy endpoint)
// @route   PUT /api/v1/users/me/notifications/mark-as-read
// @access  Private
router.put("/me/notifications/mark-as-read", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.notifications.forEach(notif => {
      notif.read = true;
    });

    await user.save();
    res.json({ msg: "Notifications marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get unread notification count
// @route   GET /api/v1/users/me/notifications/unread-count
// @access  Private
router.get("/me/notifications/unread-count", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const unreadCount = user.notifications.filter(notif => !notif.read).length;
    res.json({ unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get following posts notifications (posts from followed users that didn't appear in feed)
// @route   GET /api/v1/users/me/notifications/following-posts
// @access  Private
router.get("/me/notifications/following-posts", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.user.id).select('notifications');

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // فلترة الإشعارات من نوع new_following_post
    const followingPostNotifications = user.notifications
      .filter(notif => notif.type === 'new_following_post')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);
    
    // جلب بيانات المنشورات/الإعلانات مع معلومات المستخدم
    const populatedNotifications = await Promise.all(
      followingPostNotifications.map(async (notif) => {
        let itemData = null;
        let senderData = null;
        
        // جلب بيانات المرسل
        if (notif.sender) {
          senderData = await User.findById(notif.sender).select('name avatar userType companyName');
        }
        
        // جلب بيانات المحتوى حسب النوع
        if (notif.itemType === 'post' && notif.post) {
          itemData = await Post.findById(notif.post)
            .populate('user', 'name avatar userType companyName')
            .populate({
              path: 'originalPost',
              populate: { path: 'user', select: 'name avatar' }
            });
        } else if (notif.itemType === 'shipmentAd' && notif.shipmentAd) {
          itemData = await ShipmentAd.findById(notif.shipmentAd)
            .populate('user', 'name avatar userType companyName');
        } else if (notif.itemType === 'emptyTruckAd' && notif.emptyTruckAd) {
          itemData = await EmptyTruckAd.findById(notif.emptyTruckAd)
            .populate('user', 'name avatar userType companyName');
        }
        
        return {
          _id: notif._id,
          type: notif.type,
          itemType: notif.itemType,
          sender: senderData,
          item: itemData,
          read: notif.read,
          createdAt: notif.createdAt
        };
      })
    );
    
    // حساب إجمالي الإشعارات
    const totalFollowingPostNotifications = user.notifications.filter(
      notif => notif.type === 'new_following_post'
    ).length;
    
    res.json({
      notifications: populatedNotifications,
      pagination: {
        currentPage: page,
        totalItems: totalFollowingPostNotifications,
        totalPages: Math.ceil(totalFollowingPostNotifications / limit),
        itemsPerPage: limit,
        hasMore: skip + populatedNotifications.length < totalFollowingPostNotifications
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get unread following posts count
// @route   GET /api/v1/users/me/notifications/following-posts/unread-count
// @access  Private
router.get("/me/notifications/following-posts/unread-count", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const unreadCount = user.notifications.filter(
      notif => notif.type === 'new_following_post' && !notif.read
    ).length;
    
    res.json({ unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

