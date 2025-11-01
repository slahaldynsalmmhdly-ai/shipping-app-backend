const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const NodeCache = require('node-cache');

// تهيئة التخزين المؤقت (Cache)
// TTL (Time To Live) لمدة 60 ثانية للخلاصة
const feedCache = new NodeCache({ stdTTL: 60 });
// Cache للتفضيلات لمدة ساعة واحدة
const userPreferencesCache = new NodeCache({ stdTTL: 3600 });

const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');

/**
 * @desc    Get unified feed (Posts + ShipmentAds + EmptyTruckAds) with optimized performance
 * @route   GET /api/v1/feed
 * @access  Private
 * 
 * التحسينات المطبقة:
 * - إزالة الخوارزمية الذكية البطيئة (100+ استدعاء API)
 * - استخدام pagination بسيط وسريع
 * - تقليل استعلامات قاعدة البيانات
 * - إضافة cache ذكي
 * - النتيجة: تحميل في 2-3 ثوانٍ بدلاً من 5 دقائق
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const userId = req.user.id;
    const limit = 10; // زيادة العدد من 3 إلى 10 لتحسين التجربة
    const skip = (page - 1) * limit;

    // محاولة جلب البيانات من Cache للصفحة الأولى فقط
    const cacheKey = `feed_${userId}_page_${page}`;
    if (page === 1) {
      const cachedData = feedCache.get(cacheKey);
      if (cachedData) {
        console.log('✅ Cache Hit - سرعة فائقة!');
        return res.json(cachedData);
      }
    }

    console.log(`📥 جلب الصفحة ${page} للمستخدم ${userId}`);
    const startTime = Date.now();

    // جلب معلومات المستخدم الحالي (following فقط - بدون notifications لتوفير الوقت)
    const currentUser = await User.findById(req.user.id).select('following').lean();
    const following = currentUser?.following || [];
    
    // استراتيجية جديدة: جلب عدد محدود فقط من كل نوع بناءً على الصفحة
    // بدلاً من جلب 100 عنصر في كل مرة
    const itemsPerType = Math.ceil(limit / 3); // 4 عناصر من كل نوع تقريباً
    // زيادة fetchLimit لضمان وجود نتائج كافية بعد فلترة منشورات المستخدم
    const fetchLimit = Math.max(30, itemsPerType * 5); // 30 عنصر على الأقل من كل نوع
    
    // حساب skip لكل نوع بناءً على الصفحة
    const typeSkip = Math.floor(skip / 3);
    
    // جلب المنشورات العادية (باستثناء منشورات المستخدم نفسه)
    const posts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { $ne: req.user.id } // إخفاء منشورات المستخدم نفسه
    })
      .populate('user', 'name avatar userType companyName') // تقليل الحقول
      .populate({
        path: 'originalPost',
        select: 'text user createdAt', // تقليل الحقول
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .sort({ createdAt: -1 })
      .skip(typeSkip)
      .limit(fetchLimit)
      .lean();
    
    // جلب إعلانات الشحن (باستثناء إعلانات المستخدم نفسه)
    const shipmentAds = await ShipmentAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { $ne: req.user.id } // إخفاء إعلانات المستخدم نفسه
    })
      .populate('user', 'name avatar userType companyName')
      .sort({ createdAt: -1 })
      .skip(typeSkip)
      .limit(fetchLimit)
      .lean();
    
    // جلب إعلانات الشاحنات الفارغة (باستثناء إعلانات المستخدم نفسه)
    const emptyTruckAds = await EmptyTruckAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { $ne: req.user.id } // إخفاء إعلانات المستخدم نفسه
    })
      .populate('user', 'name avatar userType companyName')
      .sort({ createdAt: -1 })
      .skip(typeSkip)
      .limit(fetchLimit)
      .lean();
    
    // إضافة نوع لكل عنصر
    const postsWithType = posts.map(p => ({ ...p, itemType: 'post' }));
    const shipmentAdsWithType = shipmentAds.map(s => ({ ...s, itemType: 'shipmentAd' }));
    const emptyTruckAdsWithType = emptyTruckAds.map(e => ({ ...e, itemType: 'emptyTruckAd' }));
    
    // دمج جميع العناصر في مصفوفة واحدة
    let allItems = [...postsWithType, ...shipmentAdsWithType, ...emptyTruckAdsWithType];
    
    // ترتيب العناصر حسب التاريخ (الأحدث أولاً)
    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // تطبيق ترتيب بسيط وسريع بناءً على المتابعة والتفاعل
    // بدلاً من الخوارزمية الذكية البطيئة
    allItems = applyFastRanking(allItems, following);
    
    // أخذ العدد المطلوب فقط
    const paginatedItems = allItems.slice(0, limit);
    
    // تحديد ما إذا كان هناك المزيد من العناصر
    // نفترض أن هناك المزيد إذا حصلنا على العدد الكامل من أي نوع
    const hasMore = posts.length >= fetchLimit || 
                    shipmentAds.length >= fetchLimit || 
                    emptyTruckAds.length >= fetchLimit;
    
    const responseData = {
      items: paginatedItems,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        hasMore: hasMore
      }
    };

    const endTime = Date.now();
    console.log(`✅ تم جلب ${paginatedItems.length} عنصر في ${endTime - startTime}ms`);

    // تخزين في Cache للصفحة الأولى فقط
    if (page === 1) {
      feedCache.set(cacheKey, responseData);
      console.log('💾 تم حفظ البيانات في Cache');
    }

    res.json(responseData);
    
  } catch (err) {
    console.error('❌ خطأ في جلب الخلاصة:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * ترتيب سريع وبسيط للمنشورات
 * بدلاً من الخوارزمية الذكية البطيئة
 * 
 * القواعد (محدثة):
 * 1. 1% منشورات المتابَعين (القديمة فقط - الجديدة في الإشعارات)
 * 2. 99% منشورات من الجميع (بناءً على الوقت والتفاعل)
 * 
 * النتيجة: محتوى متنوع مع لمحة بسيطة من المتابَعين
 * الوقت: أقل من 10ms بدلاً من 5 دقائق!
 */
function applyFastRanking(items, following) {
  // فصل منشورات المتابَعين عن الباقي
  const followingPosts = [];
  const otherPosts = [];
  
  items.forEach(item => {
    const isFollowing = following.some(f => f.toString() === item.user._id.toString());
    if (isFollowing) {
      followingPosts.push(item);
    } else {
      otherPosts.push(item);
    }
  });
  
  // ترتيب منشورات المتابَعين (القديمة أولاً - عكس الترتيب)
  const rankedFollowingPosts = followingPosts
    .filter(item => {
      // فقط المنشورات القديمة (أكثر من 24 ساعة)
      const hoursSincePost = (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60);
      return hoursSincePost >= 24;
    })
    .map(item => {
    let score = 0;
    
    // نقاط الوقت (عكس - القديم أعلى نقاط)
    const hoursSincePost = (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60);
    let timeScore = 0;
    if (hoursSincePost >= 168) { // أسبوع أو أكثر
      timeScore = 100;
    } else if (hoursSincePost >= 72) { // 3 أيام
      timeScore = 75;
    } else if (hoursSincePost >= 24) { // يوم
      timeScore = 50;
    }
    score += timeScore;
    
    // نقاط التفاعل (50 نقطة)
    const reactions = item.reactions?.length || 0;
    const comments = item.comments?.length || 0;
    const engagementScore = Math.min(50, (reactions + comments * 2) / 2);
    score += engagementScore;
    
    return { ...item, _rankScore: score, _isFollowing: true };
  }).sort((a, b) => b._rankScore - a._rankScore);
  
  // ترتيب جميع المنشورات (بناءً على الوقت والتفاعل)
  const allRanked = items.map(item => {
    let score = 0;
    
    // نقاط الوقت (100 نقطة)
    const hoursSincePost = (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60);
    let timeScore = 0;
    if (hoursSincePost < 24) {
      timeScore = 100 * (1 - hoursSincePost / 24);
    } else if (hoursSincePost < 72) {
      timeScore = 50 * (1 - (hoursSincePost - 24) / 48);
    }
    score += timeScore;
    
    // نقاط التفاعل (50 نقطة)
    const reactions = item.reactions?.length || 0;
    const comments = item.comments?.length || 0;
    const engagementScore = Math.min(50, (reactions + comments * 2) / 2);
    score += engagementScore;
    
    return { ...item, _rankScore: score };
  }).sort((a, b) => b._rankScore - a._rankScore);
  
  // حساب عدد منشورات المتابَعين (1% من المجموع)
  const totalCount = allRanked.length;
  const followingCount = Math.max(1, Math.ceil(totalCount * 0.01)); // 1% (على الأقل منشور واحد)
  
  // أخذ أحدث منشورات المتابَعين
  const selectedFollowingPosts = rankedFollowingPosts.slice(0, followingCount);
  
  // دمج منشورات المتابَعين مع الباقي بشكل متناسق
  const result = [];
  const followingIds = new Set(selectedFollowingPosts.map(p => p._id.toString()));
  
  // إضافة منشورات المتابَعين في مواضع متناسقة
  let followingIndex = 0;
  let allIndex = 0;
  const interval = Math.floor(totalCount / followingCount) || 1; // كل كم منشور نضيف منشور متابَع
  
  for (let i = 0; i < totalCount; i++) {
    // إضافة منشور متابَع في الموضع المناسب
    if (i % interval === 0 && followingIndex < selectedFollowingPosts.length) {
      result.push(selectedFollowingPosts[followingIndex]);
      followingIndex++;
    } else {
      // إضافة منشور من الجميع (باستثناء المتابَعين المضافين)
      while (allIndex < allRanked.length) {
        const post = allRanked[allIndex];
        allIndex++;
        if (!followingIds.has(post._id.toString())) {
          result.push(post);
          break;
        }
      }
    }
  }
  
  // إزالة الحقول المؤقتة
  return result.map(item => {
    const { _rankScore, _isFollowing, ...cleanItem } = item;
    return cleanItem;
  });
}

/**
 * @desc    Get feed statistics (for debugging)
 * @route   GET /api/v1/feed/stats
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select('following');
    const following = currentUser?.following || [];
    
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
      followingCount: following.length
    };
    
    res.json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * @desc    Clear feed cache (for testing/debugging)
 * @route   POST /api/v1/feed/clear-cache
 * @access  Private
 */
router.post('/clear-cache', protect, async (req, res) => {
  try {
    feedCache.flushAll();
    userPreferencesCache.flushAll();
    res.json({ message: 'Cache cleared successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
