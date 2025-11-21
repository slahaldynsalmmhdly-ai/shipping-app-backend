const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Report = require('../models/Report');
const Review = require('../models/Review');

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
router.get('/stats', protect, admin, asyncHandler(async (req, res) => {
  try {
    // Total users count
    const totalUsers = await User.countDocuments();
    
    // Companies statistics
    const totalCompanies = await User.countDocuments({ userType: 'company' });
    const activeCompanies = await User.countDocuments({ userType: 'company', banned: false, isActive: true });
    const bannedCompanies = await User.countDocuments({ userType: 'company', banned: true });
    
    // Individuals statistics
    const totalIndividuals = await User.countDocuments({ userType: 'individual' });
    const activeIndividuals = await User.countDocuments({ userType: 'individual', banned: false, isActive: true });
    const bannedIndividuals = await User.countDocuments({ userType: 'individual', banned: true });
    
    // Recruitment offices statistics
    const totalRecruitmentOffices = await User.countDocuments({ userType: 'recruitment_office' });
    const activeRecruitmentOffices = await User.countDocuments({ userType: 'recruitment_office', banned: false, isActive: true });
    const bannedRecruitmentOffices = await User.countDocuments({ userType: 'recruitment_office', banned: true });
    
    // Drivers statistics
    const totalDrivers = await User.countDocuments({ userType: 'driver' });
    const activeDrivers = await User.countDocuments({ userType: 'driver', banned: false, isActive: true });
    const bannedDrivers = await User.countDocuments({ userType: 'driver', banned: true });
    
    // Online users (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await User.countDocuments({ 
      isOnline: true,
      lastActive: { $gte: fiveMinutesAgo }
    });
    
    // Total posts
    const totalPosts = await Post.countDocuments();
    
    // Pending reports
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    
    // New users in last 7 days (for chart)
    const newUsersLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - i);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      
      const count = await User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      
      newUsersLast7Days.push(count);
    }
    
    // Reports by type
    const reportsByType = {
      post: await Report.countDocuments({ reportType: 'post' }),
      user: await Report.countDocuments({ reportType: 'user' }),
      review: await Report.countDocuments({ reportType: 'review' })
    };
    
    res.json({
      totalUsers,
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        banned: bannedCompanies
      },
      individuals: {
        total: totalIndividuals,
        active: activeIndividuals,
        banned: bannedIndividuals
      },
      recruitmentOffices: {
        total: totalRecruitmentOffices,
        active: activeRecruitmentOffices,
        banned: bannedRecruitmentOffices
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
        banned: bannedDrivers
      },
      onlineUsers,
      totalPosts,
      pendingReports,
      newUsersLast7Days,
      reportsByType
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get all users with pagination and filters
// @route   GET /api/v1/admin/users
// @access  Private/Admin
router.get('/users', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, userType, status, search, country, city } = req.query;
    
    const query = {};
    
    // Filter by user type
    if (userType) {
      query.userType = userType;
    }
    
    // Filter by status
    if (status === 'active') {
      query.banned = false;
      query.isActive = true;
    } else if (status === 'banned') {
      query.banned = true;
    } else if (status === 'disabled') {
      query.isActive = false;
    }
    
    // Filter by country
    if (country) {
      query.country = country;
    }
    
    // Filter by city
    if (city) {
      query.city = city;
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await User.countDocuments(query);
    
    // Get post count for each user
    const usersWithPostCount = await Promise.all(
      users.map(async (user) => {
        const postCount = await Post.countDocuments({ user: user._id });
        return {
          ...user.toObject(),
          postCount
        };
      })
    );
    
    res.json({
      users: usersWithPostCount,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get single user details with all data
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    // Get user's posts
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Get user's stories
    const stories = await Story.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Get reports about this user
    const reportsAboutUser = await Report.find({ 
      targetId: user._id,
      reportType: 'user'
    })
      .populate('reporter', 'name avatar')
      .sort({ createdAt: -1 });
    
    // Get reviews by this user
    const reviews = await Review.find({ reviewer: user._id })
      .populate('reviewedUser', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Extract images and videos from posts
    const images = [];
    const videos = [];
    
    posts.forEach(post => {
      if (post.media && post.media.length > 0) {
        post.media.forEach(item => {
          if (item.type === 'image') {
            images.push({
              url: item.url,
              postId: post._id,
              createdAt: post.createdAt
            });
          } else if (item.type === 'video') {
            videos.push({
              url: item.url,
              thumbnail: item.thumbnail,
              postId: post._id,
              createdAt: post.createdAt
            });
          }
        });
      }
    });
    
    res.json({
      user: user.toObject(),
      posts,
      stories,
      images: images.slice(0, 50),
      videos: videos.slice(0, 20),
      reviews,
      reportsAboutUser,
      stats: {
        totalPosts: posts.length,
        totalImages: images.length,
        totalVideos: videos.length,
        totalReviews: reviews.length,
        totalReports: reportsAboutUser.length,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Ban/Unban user
// @route   PUT /api/v1/admin/users/:id/ban
// @access  Private/Admin
router.put('/users/:id/ban', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { banned, banReason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    user.banned = banned;
    if (banned) {
      user.banReason = banReason || '';
      user.bannedAt = new Date();
    } else {
      user.banReason = '';
      user.bannedAt = null;
    }
    
    await user.save();
    
    res.json({ 
      message: banned ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم بنجاح', 
      user: {
        _id: user._id,
        name: user.name,
        banned: user.banned,
        banReason: user.banReason
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Activate/Deactivate user account
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private/Admin
router.put('/users/:id/status', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    user.isActive = isActive;
    if (!isActive) {
      user.deactivationReason = reason || '';
      user.deactivatedAt = new Date();
    } else {
      user.deactivationReason = '';
      user.deactivatedAt = null;
    }
    
    await user.save();
    
    res.json({ 
      message: isActive ? 'تم تفعيل الحساب بنجاح' : 'تم تعطيل الحساب بنجاح', 
      user: {
        _id: user._id,
        name: user.name,
        isActive: user.isActive,
        deactivationReason: user.deactivationReason
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete user permanently
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { confirm } = req.query;
    
    if (confirm !== 'true') {
      return res.status(400).json({ message: 'يجب تأكيد الحذف' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    // Delete user's posts
    await Post.deleteMany({ user: user._id });
    
    // Delete user's stories
    await Story.deleteMany({ user: user._id });
    
    // Delete user's reviews
    await Review.deleteMany({ reviewer: user._id });
    
    // Delete reports about this user
    await Report.deleteMany({ targetId: user._id, reportType: 'user' });
    
    // Delete the user
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'تم حذف المستخدم وجميع بياناته بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get all posts with pagination
// @route   GET /api/v1/admin/posts
// @access  Private/Admin
router.get('/posts', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    const query = {};
    
    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }
    
    const posts = await Post.find(query)
      .populate('user', 'name avatar userType')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Post.countDocuments(query);
    
    res.json({
      posts,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete post
// @route   DELETE /api/v1/admin/posts/:id
// @access  Private/Admin
router.delete('/posts/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'المنشور غير موجود' });
    }
    
    // Delete reports about this post
    await Report.deleteMany({ targetId: post._id, reportType: 'post' });
    
    res.json({ message: 'تم حذف المنشور بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Update report status
// @route   PUT /api/v1/admin/reports/:id/status
// @access  Private/Admin
router.put('/reports/:id/status', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'البلاغ غير موجود' });
    }
    
    report.status = status;
    await report.save();
    
    res.json({ message: 'تم تحديث حالة البلاغ بنجاح', report });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete report
// @route   DELETE /api/v1/admin/reports/:id
// @access  Private/Admin
router.delete('/reports/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'البلاغ غير موجود' });
    }
    
    res.json({ message: 'تم حذف البلاغ بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get all stories
// @route   GET /api/v1/admin/stories
// @access  Private/Admin
router.get('/stories', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const stories = await Story.find({})
      .populate('user', 'name avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Story.countDocuments();
    
    res.json({
      stories,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete story
// @route   DELETE /api/v1/admin/stories/:id
// @access  Private/Admin
router.delete('/stories/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'القصة غير موجودة' });
    }
    
    res.json({ message: 'تم حذف القصة بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

module.exports = router;
