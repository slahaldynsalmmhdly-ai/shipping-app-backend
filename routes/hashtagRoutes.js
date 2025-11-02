const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');

// @desc    Search hashtags (autocomplete)
// @route   GET /api/v1/hashtags/search?q=searchTerm
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = q.toLowerCase().trim();
    
    // البحث في جميع الهاشتاقات من Posts و ShipmentAds و EmptyTruckAds
    const [posts, shipmentAds, emptyTruckAds] = await Promise.all([
      Post.find({ 
        hashtags: { $regex: `^${searchTerm}`, $options: 'i' },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      }).select('hashtags').lean(),
      ShipmentAd.find({ 
        hashtags: { $regex: `^${searchTerm}`, $options: 'i' },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      }).select('hashtags').lean(),
      EmptyTruckAd.find({ 
        hashtags: { $regex: `^${searchTerm}`, $options: 'i' },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      }).select('hashtags').lean()
    ]);

    // جمع جميع الهاشتاقات وحساب عدد استخدام كل واحد
    const hashtagMap = new Map();
    
    [...posts, ...shipmentAds, ...emptyTruckAds].forEach(item => {
      if (item.hashtags && Array.isArray(item.hashtags)) {
        item.hashtags.forEach(tag => {
          if (tag.toLowerCase().startsWith(searchTerm)) {
            const count = hashtagMap.get(tag) || 0;
            hashtagMap.set(tag, count + 1);
          }
        });
      }
    });

    // تحويل إلى مصفوفة وترتيب حسب الاستخدام
    const hashtags = Array.from(hashtagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // أول 10 نتائج

    res.json(hashtags);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get trending hashtags
// @route   GET /api/v1/hashtags/trending
// @access  Private
router.get('/trending', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // الحصول على المنشورات والإعلانات من آخر 7 أيام
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [posts, shipmentAds, emptyTruckAds] = await Promise.all([
      Post.find({ 
        createdAt: { $gte: sevenDaysAgo },
        hashtags: { $exists: true, $ne: [] },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      }).select('hashtags reactions comments').lean(),
      ShipmentAd.find({ 
        createdAt: { $gte: sevenDaysAgo },
        hashtags: { $exists: true, $ne: [] },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      }).select('hashtags reactions comments').lean(),
      EmptyTruckAd.find({ 
        createdAt: { $gte: sevenDaysAgo },
        hashtags: { $exists: true, $ne: [] },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      }).select('hashtags reactions comments').lean()
    ]);

    // حساب نقاط الترند لكل هاشتاق
    const hashtagScores = new Map();
    
    [...posts, ...shipmentAds, ...emptyTruckAds].forEach(item => {
      if (item.hashtags && Array.isArray(item.hashtags)) {
        const engagementScore = 
          (item.reactions?.length || 0) * 2 + 
          (item.comments?.length || 0) * 3;
        
        item.hashtags.forEach(tag => {
          const currentScore = hashtagScores.get(tag) || { count: 0, engagement: 0 };
          hashtagScores.set(tag, {
            count: currentScore.count + 1,
            engagement: currentScore.engagement + engagementScore
          });
        });
      }
    });

    // ترتيب الهاشتاقات حسب النقاط (الاستخدام + التفاعل)
    const trendingHashtags = Array.from(hashtagScores.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        engagement: data.engagement,
        score: data.count + (data.engagement * 0.5)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit));

    res.json(trendingHashtags);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get posts by hashtag
// @route   GET /api/v1/hashtags/:hashtag/posts
// @access  Private
router.get('/:hashtag/posts', protect, async (req, res) => {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const hashtagLower = hashtag.toLowerCase().replace(/^#/, '');

    // البحث في جميع أنواع المحتوى
    const [posts, shipmentAds, emptyTruckAds] = await Promise.all([
      Post.find({ 
        hashtags: hashtagLower,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      })
        .populate('user', ['name', 'avatar', 'userType', 'companyName'])
        .populate('mentions', ['name', 'avatar'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ShipmentAd.find({ 
        hashtags: hashtagLower,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      })
        .populate('user', ['name', 'avatar', 'userType', 'companyName'])
        .populate('mentions', ['name', 'avatar'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EmptyTruckAd.find({ 
        hashtags: hashtagLower,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      })
        .populate('user', ['name', 'avatar', 'userType', 'companyName'])
        .populate('mentions', ['name', 'avatar'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
    ]);

    // إضافة نوع المحتوى لكل عنصر
    const allContent = [
      ...posts.map(p => ({ ...p, contentType: 'post' })),
      ...shipmentAds.map(s => ({ ...s, contentType: 'shipmentAd' })),
      ...emptyTruckAds.map(e => ({ ...e, contentType: 'emptyTruckAd' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      hashtag: hashtagLower,
      content: allContent,
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
