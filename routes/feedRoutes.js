const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');

/**
 * @desc    Get unified feed with scope filtering
 * @route   GET /api/v1/feed
 * @access  Private
 * 
 * الفلترة:
 * - المنشورات العالمية (scope=global): تظهر للجميع
 * - المنشورات المحلية (scope=local): تظهر فقط لنفس الدولة
 * - الترتيب: الأحدث أولاً
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log(`📥 جلب الصفحة ${page}`);

    // جلب معلومات المستخدم الحالي
    const currentUser = await User.findById(req.user.id).select('country').lean();
    const userCountry = currentUser?.country || '';

    console.log(`🌍 دولة المستخدم: ${userCountry}`);

    // جلب المنشورات العادية
    const posts = await Post.find({
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { $ne: req.user.id }
    })
      .populate('user', 'name avatar userType companyName country')
      .populate({
        path: 'originalPost',
        select: 'text user createdAt',
        populate: {
          path: 'user',
          select: 'name avatar country'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit * 3)
      .lean();

    // جلب إعلانات الشحن
    const shipmentAds = await ShipmentAd.find({
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { $ne: req.user.id }
    })
      .populate('user', 'name avatar userType companyName country')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit * 3)
      .lean();

    // جلب إعلانات الشاحنات الفارغة
    const emptyTruckAds = await EmptyTruckAd.find({
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { $ne: req.user.id }
    })
      .populate('user', 'name avatar userType companyName country')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit * 3)
      .lean();

    // فلترة المنشورات حسب scope
    const filterByScope = (items) => {
      return items.filter(item => {
        // إذا لم يكن للعنصر user، نتجاهله
        if (!item.user) return false;

        // إذا كان المنشور عالمي، يظهر للجميع
        if (item.scope === 'global' || !item.scope) return true;

        // إذا كان المنشور محلي، يظهر فقط لنفس الدولة
        if (item.scope === 'local') {
          return item.user.country === userCountry;
        }

        return true;
      });
    };

    const validPosts = filterByScope(posts);
    const validShipmentAds = filterByScope(shipmentAds);
    const validEmptyTruckAds = filterByScope(emptyTruckAds);

    console.log(`📊 منشورات: ${validPosts.length}, إعلانات شحن: ${validShipmentAds.length}, شاحنات فارغة: ${validEmptyTruckAds.length}`);

    // إضافة نوع لكل عنصر
    const postsWithType = validPosts.map(p => ({ ...p, itemType: 'post' }));
    const shipmentAdsWithType = validShipmentAds.map(s => ({ ...s, itemType: 'shipmentAd' }));
    const emptyTruckAdsWithType = validEmptyTruckAds.map(e => ({ ...e, itemType: 'emptyTruckAd' }));

    // دمج جميع العناصر
    let allItems = [
      ...postsWithType,
      ...shipmentAdsWithType,
      ...emptyTruckAdsWithType
    ];

    // إزالة التكرار
    const uniqueItemsMap = new Map();
    allItems.forEach(item => {
      const itemId = item._id.toString();
      if (!uniqueItemsMap.has(itemId)) {
        uniqueItemsMap.set(itemId, item);
      }
    });
    allItems = Array.from(uniqueItemsMap.values());

    // ترتيب بسيط حسب الوقت (الأحدث أولاً)
    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`✅ إجمالي العناصر: ${allItems.length}`);

    // أخذ العدد المطلوب فقط
    const paginatedItems = allItems.slice(0, limit);
    const hasMore = allItems.length > limit;

    const responseData = {
      items: paginatedItems,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        hasMore: hasMore
      }
    };

    res.json(responseData);

  } catch (err) {
    console.error('❌ خطأ في جلب الخلاصة:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * @desc    Get feed statistics
 * @route   GET /api/v1/feed/stats
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select('country');
    const userCountry = currentUser?.country || '';

    const postsCount = await Post.countDocuments({
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    });

    const shipmentAdsCount = await ShipmentAd.countDocuments({
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    });

    const emptyTruckAdsCount = await EmptyTruckAd.countDocuments({
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    });

    const responseData = {
      totalPosts: postsCount,
      totalShipmentAds: shipmentAdsCount,
      totalEmptyTruckAds: emptyTruckAdsCount,
      totalItems: postsCount + shipmentAdsCount + emptyTruckAdsCount,
      userCountry: userCountry
    };

    res.json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
