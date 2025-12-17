const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shipping-app/profiles',
    resource_type: 'image',
  },
});

const uploadProfile = multer({ storage: profileStorage });
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

/// @desc    Update user profile
// @route   PUT /api/v1/users/me
// @access  Private
router.put("/me", protect, uploadProfile.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, phone, description, avatar, companyName, companyDescription, companyLogo, customDetails, website, bio } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Handle uploaded files
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        user.avatar = req.files.avatar[0].path;
      }
      if (req.files.cover && req.files.cover[0]) {
        user.coverImage = req.files.cover[0].path;
      }
    }

    // Update text fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (description !== undefined) user.description = description;
    if (bio !== undefined) user.description = bio; // Support 'bio' as alias for 'description'
    if (avatar !== undefined && !req.files?.avatar) user.avatar = avatar;
    if (companyName !== undefined) user.companyName = companyName;
    if (companyDescription !== undefined) user.companyDescription = companyDescription;
    if (companyLogo !== undefined) user.companyLogo = companyLogo;
    if (customDetails !== undefined) user.customDetails = customDetails;
    if (website !== undefined) user.website = website; // FIX: Add support for website field

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(user._id).select("-password");

    res.json({
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
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
      select: "text originalPost originalPostType media comments",
      populate: [
        {
          path: "comments.user",
          select: "name avatar"
        },
        {
          path: "comments.replies.user",
          select: "name avatar"
        }
      ]
    }).populate({
      path: "notifications.shipmentAd",
      select: "pickupLocation deliveryLocation description media",
    }).populate({
      path: "notifications.emptyTruckAd",
      select: "currentLocation preferredDestination additionalNotes media",
    }).populate({
      path: "notifications.short",
      select: "title description videoUrl thumbnailUrl",
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
        isRead: notif.read,  // إضافة isRead للتوافق مع الواجهة الأمامية
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

// @desc    Get users by type (for suggestions and explore)
// @route   GET /api/v1/users
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { userType, limit = 15, page = 1, search } = req.query;
    
    const filter = {};
    
    // فلترة حسب نوع المستخدم إذا تم تحديده
    if (userType) {
      filter.userType = userType;
    }
    
    // البحث في الاسم أو اسم الشركة أو المدينة
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // استبعاد المستخدم الحالي من النتائج
    filter._id = { $ne: req.user.id };
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // حساب إجمالي عدد المستخدمين
    const totalUsers = await User.countDocuments(filter);
    
    const users = await User.find(filter)
      .select('name avatar userType companyName coverImage rating city description')
      .limit(limitNum)
      .skip(skip)
      .sort({ createdAt: -1 });
    
    // حساب التقييم لكل مستخدم
    const usersWithRating = await Promise.all(
      users.map(async (user) => {
        const reviews = await Review.find({ user: user._id });
        const rating = reviews.length > 0
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : 0;
        
        return {
          ...user.toObject(),
          rating: parseFloat(rating.toFixed(1))
        };
      })
    );
    
    // حساب معلومات الصفحات
    const totalPages = Math.ceil(totalUsers / limitNum);
    const hasMore = pageNum < totalPages;
    
    res.json({ 
      users: usersWithRating,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalUsers,
        itemsPerPage: limitNum,
        hasMore: hasMore
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get user profile by ID
// @route   GET /api/v1/users/:userId
// @access  Private
router.get("/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('following', 'name avatar')
      .populate('followers', 'name avatar');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // حساب عدد المنشورات
    const Post = require('../models/Post');
    const postsCount = await Post.countDocuments({ user: user._id });

    // حساب عدد الإعجابات على جميع منشورات المستخدم
    const userPosts = await Post.find({ user: user._id });
    const totalLikes = userPosts.reduce((sum, post) => {
      const reactions = post.reactions || [];
      const likesCount = reactions.filter(r => !r.type || r.type === 'like').length;
      return sum + likesCount;
    }, 0);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      cover: user.coverImage,
      bio: user.description,
      phone: user.phone,
      website: user.website, // FIX: Add website field to response
      userType: user.userType,
      companyName: user.companyName,
      companyDescription: user.companyDescription,
      companyLogo: user.companyLogo,
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
      postsCount: postsCount,
      totalLikes: totalLikes,
      city: user.city,
      country: user.country,
      address: user.address,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Add custom section to profile
// @route   POST /api/v1/users/sections
// @access  Private
router.post("/sections", protect, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.sections.push({ title, content });
    await user.save();

    const addedSection = user.sections[user.sections.length - 1];
    res.json({ section: addedSection });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete custom section from profile
// @route   DELETE /api/v1/users/sections/:sectionId
// @access  Private
router.delete("/sections/:sectionId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.sections = user.sections.filter(s => s._id.toString() !== req.params.sectionId);
    await user.save();

    res.json({ message: 'Section deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a single notification
// @route   DELETE /api/v1/users/me/notifications/:id
// @access  Private
router.delete("/me/notifications/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const notification = user.notifications.id(req.params.id);
    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    // Remove notification using pull
    user.notifications.pull(req.params.id);
    await user.save();
    
    res.json({ msg: "Notification deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Delete user account permanently
// @route   DELETE /api/v1/users/me
// @access  Private
router.delete("/me", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('[DELETE ACCOUNT] Request received:', {
      userId: userId.toString(),
      userName: req.user.name,
      timestamp: new Date().toISOString()
    });

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('[DELETE ACCOUNT] User not found:', userId);
      return res.status(404).json({ msg: "User not found" });
    }

    console.log('[DELETE ACCOUNT] Starting account deletion process...');

    // Delete all user's posts
    const deletedPosts = await Post.deleteMany({ user: userId });
    console.log('[DELETE ACCOUNT] Deleted posts:', deletedPosts.deletedCount);

    // Delete all user's shorts
    const Short = require('../models/Short');
    const deletedShorts = await Short.deleteMany({ user: userId });
    console.log('[DELETE ACCOUNT] Deleted shorts:', deletedShorts.deletedCount);

    // Delete all user's shipment ads
    const deletedShipmentAds = await ShipmentAd.deleteMany({ user: userId });
    console.log('[DELETE ACCOUNT] Deleted shipment ads:', deletedShipmentAds.deletedCount);

    // Delete all user's empty truck ads
    const deletedEmptyTruckAds = await EmptyTruckAd.deleteMany({ user: userId });
    console.log('[DELETE ACCOUNT] Deleted empty truck ads:', deletedEmptyTruckAds.deletedCount);

    // Delete all user's reviews
    const deletedReviews = await Review.deleteMany({ user: userId });
    console.log('[DELETE ACCOUNT] Deleted reviews:', deletedReviews.deletedCount);

    // Remove user from followers/following lists
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );
    console.log('[DELETE ACCOUNT] Removed from followers/following lists');

    // Delete user's notifications from other users
    await User.updateMany(
      { 'notifications.sender': userId },
      { $pull: { notifications: { sender: userId } } }
    );
    console.log('[DELETE ACCOUNT] Removed notifications');

    // Finally, delete the user account
    await User.findByIdAndDelete(userId);
    
    console.log('[DELETE ACCOUNT] Account deleted successfully:', {
      userId: userId.toString(),
      timestamp: new Date().toISOString(),
      deletedData: {
        posts: deletedPosts.deletedCount,
        shorts: deletedShorts.deletedCount,
        shipmentAds: deletedShipmentAds.deletedCount,
        emptyTruckAds: deletedEmptyTruckAds.deletedCount,
        reviews: deletedReviews.deletedCount
      }
    });

    res.json({ 
      msg: "Account deleted successfully",
      deletedData: {
        posts: deletedPosts.deletedCount,
        shorts: deletedShorts.deletedCount,
        shipmentAds: deletedShipmentAds.deletedCount,
        emptyTruckAds: deletedEmptyTruckAds.deletedCount,
        reviews: deletedReviews.deletedCount
      }
    });
  } catch (err) {
    console.error('[DELETE ACCOUNT] Error occurred:', {
      error: err.message,
      stack: err.stack,
      userId: req.user?._id
    });
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

module.exports = router;

