const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
// const ShipmentAd = require('../models/ShipmentAd');
// const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');

/**
 * @desc    Get unified feed (Posts only)
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
    
    // إذا كان هناك فلتر موقع من query parameters، استخدمه، وإلا استخدم موقع المستخدم
    const filterCountry = req.query.country || null;
    const filterCity = req.query.city || null;
    
    let userCountry, userCity;
    
    if (filterCountry !== null) {
      // المستخدم اختار فلتر محدد
      userCountry = filterCountry === '' ? null : filterCountry;
      userCity = filterCity === '' ? null : filterCity;
    } else {
      // استخدم موقع المستخدم من قاعدة البيانات
      userCountry = currentUser?.country || null;
      userCity = currentUser?.city || null;
    }

    // بناء فلتر المنشورات حسب الموقع
    let locationFilter;
    
    console.log(`🔍 فلترة حسب: country=${userCountry}, city=${userCity}`);
    
    if (userCountry === null) {
      // المستخدم بدون دولة: يرى جميع المنشورات (عالمية ومحلية)
      console.log('📍 عرض جميع المنشورات (بدون فلتر)');
      locationFilter = {
        $or: [
          { scope: 'global' },
          { scope: { $exists: false } },
          { scope: null },
          { scope: 'local' }
        ]
      };
    } else {
      // المستخدم لديه دولة: فلترة حسب الموقع
      console.log(`📍 فلترة حسب الدولة: ${userCountry}`);
      
      const localPostsFilter = [];
      
      if (userCity) {
        // إذا كان هناك مدينة محددة: أظهر منشورات نفس المدينة + منشورات الدولة بدون مدينة
        console.log(`📍 فلترة حسب المدينة: ${userCity}`);
        localPostsFilter.push(
          // منشورات من نفس المدينة
          { $and: [
            { scope: 'local' },
            { country: userCountry },
            { city: userCity }
          ]},
          // منشورات من نفس الدولة بدون مدينة محددة
          { $and: [
            { scope: 'local' },
            { country: userCountry },
            { $or: [{ city: null }, { city: { $exists: false } }] }
          ]}
        );
      } else {
        // إذا لم يكن هناك مدينة: أظهر جميع منشورات الدولة
        console.log(`📍 عرض جميع منشورات الدولة: ${userCountry}`);
        localPostsFilter.push(
          { $and: [
            { scope: 'local' },
            { country: userCountry }
          ]}
        );
      }
      
      locationFilter = {
        $or: [
          { scope: 'global' },
          { scope: { $exists: false } },
          { scope: null },
          ...localPostsFilter
        ]
      };
    }

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

    // جلب المنشورات فقط (تم حذف إعلانات الشحن والشاحنات الفارغة)

    // فلترة العناصر التي لديها user (بعد populate)
    const validPosts = posts.filter(p => p.user !== null);

    console.log(`📊 منشورات: ${validPosts.length}`);

    // إضافة نوع لكل عنصر
    const postsWithType = validPosts.map(p => ({ ...p, itemType: 'post' }));

    // المنشورات فقط
    let allItems = [
      ...postsWithType
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

    const responseData = {
      totalPosts: postsCount,
      totalItems: postsCount,
      userCountry: userCountry
    };

    res.json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
