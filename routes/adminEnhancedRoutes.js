const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');
const Short = require('../models/Short');
const Report = require('../models/Report');

// @desc    Get all reports with filtering and pagination
// @route   GET /api/v1/admin/reports
// @access  Private/Admin
router.get('/reports', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      reportType, 
      status, 
      search 
    } = req.query;
    
    const query = {};
    
    // Filter by report type
    if (reportType) {
      query.reportType = reportType;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Search by reason or details
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }
    
    const reports = await Report.find(query)
      .populate('reporter', 'name avatar userType')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Report.countDocuments(query);
    
    // Populate target details based on reportType
    const reportsWithTarget = await Promise.all(
      reports.map(async (report) => {
        const reportObj = report.toObject();
        
        try {
          if (report.reportType === 'post') {
            const post = await Post.findById(report.targetId)
              .populate('user', 'name avatar userType')
              .select('text media createdAt');
            reportObj.targetDetails = post;
          } else if (report.reportType === 'video') {
            const video = await Short.findById(report.targetId)
              .populate('user', 'name avatar userType')
              .select('videoUrl thumbnail caption createdAt');
            reportObj.targetDetails = video;
          } else if (report.reportType === 'user') {
            const user = await User.findById(report.targetId)
              .select('name avatar userType companyName country city');
            reportObj.targetDetails = user;
          }
        } catch (error) {
          reportObj.targetDetails = null;
        }
        
        return reportObj;
      })
    );
    
    res.json({
      reports: reportsWithTarget,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
      stats: {
        pending: await Report.countDocuments({ status: 'pending' }),
        reviewed: await Report.countDocuments({ status: 'reviewed' }),
        resolved: await Report.countDocuments({ status: 'resolved' }),
        dismissed: await Report.countDocuments({ status: 'dismissed' })
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get reports by type
// @route   GET /api/v1/admin/reports/:type
// @access  Private/Admin
router.get('/reports/:type', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 50, status } = req.query;
    
    const validTypes = ['post', 'video', 'comment', 'reply', 'user', 'review'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'نوع الإبلاغ غير صحيح' });
    }
    
    const query = { reportType: type };
    if (status) {
      query.status = status;
    }
    
    const reports = await Report.find(query)
      .populate('reporter', 'name avatar userType')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Report.countDocuments(query);
    
    res.json({
      reports,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get new posts (last 7 days) with filtering
// @route   GET /api/v1/admin/posts/new
// @access  Private/Admin
router.get('/posts/new', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, userType, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const query = {
      createdAt: { $gte: startDate }
    };
    
    const posts = await Post.find(query)
      .populate('user', 'name avatar userType companyName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    // Filter by userType if specified
    let filteredPosts = posts;
    if (userType) {
      filteredPosts = posts.filter(post => post.user && post.user.userType === userType);
    }
    
    const count = filteredPosts.length;
    
    // Separate by userType
    const companyPosts = filteredPosts.filter(p => p.user && p.user.userType === 'company');
    const individualPosts = filteredPosts.filter(p => p.user && p.user.userType === 'individual');
    
    res.json({
      posts: filteredPosts,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
      stats: {
        total: count,
        companies: companyPosts.length,
        individuals: individualPosts.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get new videos/shorts (last 7 days)
// @route   GET /api/v1/admin/videos/new
// @access  Private/Admin
router.get('/videos/new', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, userType, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const query = {
      createdAt: { $gte: startDate }
    };
    
    const videos = await Short.find(query)
      .populate('user', 'name avatar userType companyName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    // Filter by userType if specified
    let filteredVideos = videos;
    if (userType) {
      filteredVideos = videos.filter(video => video.user && video.user.userType === userType);
    }
    
    const count = filteredVideos.length;
    
    // Separate by userType
    const companyVideos = filteredVideos.filter(v => v.user && v.user.userType === 'company');
    const individualVideos = filteredVideos.filter(v => v.user && v.user.userType === 'individual');
    
    res.json({
      videos: filteredVideos,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
      stats: {
        total: count,
        companies: companyVideos.length,
        individuals: individualVideos.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get all companies
// @route   GET /api/v1/admin/companies
// @access  Private/Admin
router.get('/companies', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    
    const query = { userType: 'company' };
    
    // Filter by status
    if (status === 'active') {
      query.banned = false;
      query.isActive = true;
    } else if (status === 'banned') {
      query.banned = true;
    } else if (status === 'disabled') {
      query.isActive = false;
    }
    
    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const companies = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await User.countDocuments(query);
    
    // Get post count for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const postCount = await Post.countDocuments({ user: company._id });
        const videoCount = await Short.countDocuments({ user: company._id });
        return {
          ...company.toObject(),
          postCount,
          videoCount
        };
      })
    );
    
    res.json({
      companies: companiesWithStats,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Get all individuals
// @route   GET /api/v1/admin/individuals
// @access  Private/Admin
router.get('/individuals', protect, admin, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    
    const query = { userType: 'individual' };
    
    // Filter by status
    if (status === 'active') {
      query.banned = false;
      query.isActive = true;
    } else if (status === 'banned') {
      query.banned = true;
    } else if (status === 'disabled') {
      query.isActive = false;
    }
    
    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const individuals = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await User.countDocuments(query);
    
    // Get post count for each individual
    const individualsWithStats = await Promise.all(
      individuals.map(async (individual) => {
        const postCount = await Post.countDocuments({ user: individual._id });
        const videoCount = await Short.countDocuments({ user: individual._id });
        return {
          ...individual.toObject(),
          postCount,
          videoCount
        };
      })
    );
    
    res.json({
      individuals: individualsWithStats,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete user and all their data (cascade delete)
// @route   DELETE /api/v1/admin/users/:id/cascade
// @access  Private/Admin
router.delete('/users/:id/cascade', protect, admin, asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    console.log(`[ADMIN DELETE] Starting cascade delete for user: ${user.name} (${userId})`);
    
    // Delete all posts
    const deletedPosts = await Post.deleteMany({ user: userId });
    console.log(`[ADMIN DELETE] Deleted ${deletedPosts.deletedCount} posts`);
    
    // Delete all shorts/videos
    const deletedShorts = await Short.deleteMany({ user: userId });
    console.log(`[ADMIN DELETE] Deleted ${deletedShorts.deletedCount} shorts`);
    
    // Delete all reports by this user
    const deletedReportsByUser = await Report.deleteMany({ reporter: userId });
    console.log(`[ADMIN DELETE] Deleted ${deletedReportsByUser.deletedCount} reports by user`);
    
    // Delete all reports about this user
    const deletedReportsAboutUser = await Report.deleteMany({ 
      targetId: userId,
      reportType: 'user'
    });
    console.log(`[ADMIN DELETE] Deleted ${deletedReportsAboutUser.deletedCount} reports about user`);
    
    // Remove from followers/following lists
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );
    console.log(`[ADMIN DELETE] Removed from followers/following lists`);
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    console.log(`[ADMIN DELETE] User deleted successfully`);
    
    res.json({
      message: 'تم حذف المستخدم وجميع بياناته بنجاح',
      deletedData: {
        posts: deletedPosts.deletedCount,
        shorts: deletedShorts.deletedCount,
        reportsByUser: deletedReportsByUser.deletedCount,
        reportsAboutUser: deletedReportsAboutUser.deletedCount
      }
    });
  } catch (error) {
    console.error('[ADMIN DELETE] Error:', error);
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete post by admin
// @route   DELETE /api/v1/admin/posts/:id
// @access  Private/Admin
router.delete('/posts/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'المنشور غير موجود' });
    }
    
    await Post.findByIdAndDelete(req.params.id);
    
    // Delete related reports
    await Report.deleteMany({ 
      targetId: req.params.id,
      reportType: 'post'
    });
    
    res.json({ message: 'تم حذف المنشور بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

// @desc    Delete video/short by admin
// @route   DELETE /api/v1/admin/videos/:id
// @access  Private/Admin
router.delete('/videos/:id', protect, admin, asyncHandler(async (req, res) => {
  try {
    const video = await Short.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'الفيديو غير موجود' });
    }
    
    await Short.findByIdAndDelete(req.params.id);
    
    // Delete related reports
    await Report.deleteMany({ 
      targetId: req.params.id,
      reportType: 'video'
    });
    
    res.json({ message: 'تم حذف الفيديو بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
}));

module.exports = router;
