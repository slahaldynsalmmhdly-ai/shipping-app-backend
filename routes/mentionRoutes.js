const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @desc    Search users for mentions (autocomplete)
// @route   GET /api/v1/mentions/search?q=searchTerm
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = q.trim();
    
    // البحث في الأسماء وأسماء الشركات
    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { companyName: { $regex: searchTerm, $options: 'i' } }
      ],
      _id: { $ne: req.user.id } // استبعاد المستخدم الحالي
    })
      .select('name avatar userType companyName')
      .limit(10)
      .lean();

    // تنسيق النتائج
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.userType === 'company' && user.companyName ? user.companyName : user.name,
      avatar: user.avatar,
      userType: user.userType
    }));

    res.json(formattedUsers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get user mentions (posts where user is mentioned)
// @route   GET /api/v1/mentions/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Post = require('../models/Post');
    const ShipmentAd = require('../models/ShipmentAd');
    const EmptyTruckAd = require('../models/EmptyTruckAd');

    // البحث في جميع المحتويات التي تحتوي على إشارة للمستخدم الحالي
    const [posts, shipmentAds, emptyTruckAds] = await Promise.all([
      Post.find({ 
        mentions: req.user.id,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      })
        .populate('user', ['name', 'avatar', 'userType', 'companyName'])
        .populate('mentions', ['name', 'avatar'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ShipmentAd.find({ 
        mentions: req.user.id,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      })
        .populate('user', ['name', 'avatar', 'userType', 'companyName'])
        .populate('mentions', ['name', 'avatar'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EmptyTruckAd.find({ 
        mentions: req.user.id,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      })
        .populate('user', ['name', 'avatar', 'userType', 'companyName'])
        .populate('mentions', ['name', 'avatar'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
    ]);

    // دمج وترتيب جميع المحتويات
    const allContent = [
      ...posts.map(p => ({ ...p, contentType: 'post' })),
      ...shipmentAds.map(s => ({ ...s, contentType: 'shipmentAd' })),
      ...emptyTruckAds.map(e => ({ ...e, contentType: 'emptyTruckAd' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      mentions: allContent,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: allContent.length === parseInt(limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
