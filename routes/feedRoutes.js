const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');

/**
 * @desc    Get unified feed (Posts + ShipmentAds + EmptyTruckAds)
 * @route   GET /api/v1/feed
 * @access  Private
 * 
 * خوارزمية بسيطة:
 * - ترتيب حسب الوقت (الأحدث أولاً)
 * - فلترة publishScope: إخفاء المنشورات category_only من الصفحة الرئيسية
 * - pagination ثابت ومستقر
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log(`📥 جلب الصفحة ${page}, limit: ${limit}`);

    // جلب بيانات المستخدم الحالي (الدولة والمدينة)
    const currentUser = await User.findById(req.user.id).select('country city').lean();
    const userCountry = currentUser?.country || null;
    const userCity = currentUser?.city || null;

    // بناء فلتر المنشورات حسب الموقع
    const locationFilter = {
      $or: [
        { scope: 'global' }, // المنشورات العالمية
        { scope: { $exists: false } }, // المنشورات القديمة بدون scope
        { scope: null }, // المنشورات بدون scope
        // المنشورات المحلية: تظهر حسب الدولة والمدينة
        {
          $and: [
            { scope: 'local' },
            {
              $or: [
                // إذا كان للمنشور مدينة محددة: يظهر فقط لنفس المدينة
                { $and: [{ city: { $exists: true, $ne: null } }, { city: userCity }] },
                // إذا كان للمنشور دولة فقط (بدون مدينة): يظهر لنفس الدولة
                { $and: [{ city: { $in: [null, undefined] } }, { country: userCountry }] },
                // إذا لم يكن للمنشور دولة ولا مدينة: يظهر للجميع (منشورات قديمة)
                { $and: [{ country: { $in: [null, undefined] } }, { city: { $in: [null, undefined] } }] }
              ]
            }
          ]
        }
      ]
    };

    // جلب المنشورات العادية (فقط التي يجب أن تظهر في الصفحة الرئيسية)
    const posts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { hiddenFromHomeFeedFor: { $ne: req.user.id } },
        { user: { $ne: req.user.id } },
        // إخفاء المنشورات التي فقط للفئة (category_only)
        { $or: [
          { publishScope: { $exists: false } },
          { publishScope: null },
          { publishScope: 'home_and_category' }
        ] },
        // فلترة حسب الموقع (الدولة والمدينة)
        locationFilter
      ]
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
      .limit(limit)
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
      .limit(limit)
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
      .limit(limit)
      .lean();

    // فلترة العناصر التي لديها user (بعد populate)
    const validPosts = posts.filter(p => p.user !== null);
    const validShipmentAds = shipmentAds.filter(s => s.user !== null);
    const validEmptyTruckAds = emptyTruckAds.filter(e => e.user !== null);

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
