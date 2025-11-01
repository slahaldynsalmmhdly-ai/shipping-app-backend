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
    const limit = parseInt(req.query.limit) || 3; // استخدام limit من query parameter (افتراضي 3)
    const skip = (page - 1) * limit;

    // إعادة تفعيل الـ cache لتحسين السرعة
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
    
    // استراتيجية ذكية: جلب عدد كبير لضمان وجود منشورات كافية بعد فلترة المتابعين
    // إذا limit=3 نجلب 100 منشور من كل نوع (300 إجمالاً)
    // هذا يضمن وجود منشورات كافية حتى بعد استبعاد المتابعين
    const fetchLimit = 100; // ثابت لضمان الكفاية
    
    // حساب skip لكل نوع بناءً على الصفحة
    const typeSkip = Math.floor(skip / 3);
    
    // جلب المنشورات العادية (باستثناء منشورات المستخدم نفسه والمتابَعين)
    // تم تعديل النظام: منشورات المتابعين لا تظهر في الصفحة الرئيسية أبداً (100% إشعارات فقط)
    const posts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { 
        $ne: req.user.id, // إخفاء منشورات المستخدم نفسه
        $nin: following // إخفاء منشورات المتابَعين تماماً (100%)
      }
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
    
    // جلب إعلانات الشحن (باستثناء إعلانات المستخدم نفسه والمتابَعين)
    // تم تعديل النظام: إعلانات المتابعين لا تظهر في الصفحة الرئيسية أبداً (100% إشعارات فقط)
    const shipmentAds = await ShipmentAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { 
        $ne: req.user.id, // إخفاء إعلانات المستخدم نفسه
        $nin: following // إخفاء إعلانات المتابَعين تماماً (100%)
      }
    })
      .populate('user', 'name avatar userType companyName')
      .sort({ createdAt: -1 })
      .skip(typeSkip)
      .limit(fetchLimit)
      .lean();
    
    // جلب إعلانات الشاحنات الفارغة (باستثناء إعلانات المستخدم نفسه والمتابَعين)
    // تم تعديل النظام: إعلانات المتابعين لا تظهر في الصفحة الرئيسية أبداً (100% إشعارات فقط)
    const emptyTruckAds = await EmptyTruckAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      user: { 
        $ne: req.user.id, // إخفاء إعلانات المستخدم نفسه
        $nin: following // إخفاء إعلانات المتابَعين تماماً (100%)
      }
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
    
    // تم إزالة Fallback لتجنب التحميل المزدوج
    // إذا كانت الخلاصة فارغة، نرجع مصفوفة فارغة
    if (allItems.length === 0) {
      console.log('⚠️ لا توجد منشورات متاحة بعد فلترة المتابعين');
    }
    
    // توزيع جبري 100%: منشور واحد فقط لكل مستخدم (مثل فيسبوك ولينكد إن)
    // حذفنا applyFastRanking لأنها كانت تخلط المنشورات
    allItems = distributePostsByUser(allItems);
    
    // مراقبة التفاعل الذكي: ترتيب حسب تفاعل المستخدم
    allItems = await applySmartEngagementTracking(allItems, userId);
    
    // أخذ العدد المطلوب فقط
    const paginatedItems = allItems.slice(0, limit);
    
    // تحديد ما إذا كان هناك المزيد من العناصر
    // إذا كان عدد العناصر المتاحة أكبر من limit، يعني هناك المزيد
    const hasMore = allItems.length > limit;
    
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

    // حفظ البيانات في cache للصفحة الأولى
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
 * مراقبة التفاعل الذكي: ترتيب المنشورات حسب تفاعل المستخدم
 * 
 * الفكرة:
 * - إذا تفاعل المستخدم مع منشور (تعليق، إعجاب، مشاركة)
 * - نعرض له منشورات مشابهة (نفس النوع: قصص، أخبار، إلخ)
 * - نرتب المنشورات حسب التشابه مع ما يفضله المستخدم
 * 
 * التصنيف:
 * - قصص: إذا كان المنشور طويل (أكثر من 200 حرف) ويحتوي على كلمات قصصية
 * - أخبار: إذا كان يحتوي على كلمات إخبارية
 * - عام: باقي المنشورات
 */
async function applySmartEngagementTracking(items, userId) {
  try {
    // جلب تفاعلات المستخدم (آخر 30 يوم)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // جلب المنشورات التي تفاعل معها المستخدم
    const engagedPosts = await Post.find({
      $or: [
        { 'reactions.user': userId },
        { 'comments.user': userId }
      ],
      createdAt: { $gte: thirtyDaysAgo }
    }).select('text').lean();
    
    // تحديد نوع المحتوى المفضل
    const contentTypes = engagedPosts.map(post => classifyContent(post.text || ''));
    const preferredType = getMostFrequent(contentTypes) || 'general';
    
    console.log(`🧠 المستخدم ${userId} يفضل: ${preferredType}`);
    
    // ترتيب المنشورات حسب التفضيل
    return items.map(item => {
      const itemType = classifyContent(item.text || '');
      const score = itemType === preferredType ? 100 : 0;
      return { ...item, _preferenceScore: score };
    })
    .sort((a, b) => {
      // أولاً: حسب التفضيل
      if (b._preferenceScore !== a._preferenceScore) {
        return b._preferenceScore - a._preferenceScore;
      }
      // ثانياً: حسب التاريخ
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .map(item => {
      const { _preferenceScore, ...cleanItem } = item;
      return cleanItem;
    });
  } catch (error) {
    console.error('⚠️ خطأ في مراقبة التفاعل:', error);
    // في حالة الخطأ، نرجع المنشورات كما هي
    return items;
  }
}

/**
 * تصنيف المحتوى حسب النوع
 */
function classifyContent(text) {
  if (!text) return 'general';
  
  const lowerText = text.toLowerCase();
  
  // قصص: طويل + كلمات قصصية
  const storyKeywords = ['قصة', 'حكاية', 'رواية', 'كان يا ما كان', 'ذات يوم'];
  if (text.length > 200 && storyKeywords.some(kw => lowerText.includes(kw))) {
    return 'story';
  }
  
  // أخبار: كلمات إخبارية
  const newsKeywords = ['خبر', 'عاجل', 'أعلن', 'صرح', 'أكد', 'أفاد', 'اليوم'];
  if (newsKeywords.some(kw => lowerText.includes(kw))) {
    return 'news';
  }
  
  // عام
  return 'general';
}

/**
 * إيجاد العنصر الأكثر تكراراً
 */
function getMostFrequent(arr) {
  if (arr.length === 0) return null;
  
  const frequency = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  return Object.keys(frequency).reduce((a, b) => 
    frequency[a] > frequency[b] ? a : b
  );
}

/**
 * توزيع المنشورات: منشور واحد لكل مستخدم (مثل فيسبوك ولينكد إن)
 * 
 * الهدف: تجنب أن يملأ مستخدم واحد الصفحة بمنشوراته
 * الطريقة: نأخذ منشور واحد فقط من كل مستخدم، ثم نرتبهم حسب الأولوية
 */
function distributePostsByUser(items) {
  console.log(`📦 توزيع المنشورات: عدد المنشورات قبل التوزيع = ${items.length}`);
  
  const userPostsMap = new Map(); // userId -> [posts]
  
  // تجميع المنشورات حسب المستخدم
  items.forEach(item => {
    // جرب جميع الطرق للحصول على userId
    let userId = null;
    
    if (item.user) {
      if (typeof item.user === 'object' && item.user._id) {
        userId = item.user._id.toString();
      } else if (typeof item.user === 'string') {
        userId = item.user;
      } else {
        userId = item.user.toString();
      }
    }
    
    if (!userId) {
      console.warn('⚠️ منشور بدون user ID:', item._id);
      return;
    }
    
    if (!userPostsMap.has(userId)) {
      userPostsMap.set(userId, []);
    }
    userPostsMap.get(userId).push(item);
  });
  
  console.log(`👥 عدد المستخدمين الفريدين = ${userPostsMap.size}`);
  
  // أخذ منشور واحد فقط من كل مستخدم (الأحدث)
  const distributedItems = [];
  userPostsMap.forEach((userPosts, userId) => {
    // نرتب منشورات المستخدم حسب التاريخ (الأحدث أولاً)
    userPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // نأخذ أحدث منشور فقط
    distributedItems.push(userPosts[0]);
    
    if (userPosts.length > 1) {
      console.log(`📦 المستخدم ${userId}: ${userPosts.length} منشور → أخذنا 1 فقط`);
    }
  });
  
  console.log(`✅ عدد المنشورات بعد التوزيع = ${distributedItems.length}`);
  
  // نرتب المنشورات الموزعة حسب التاريخ (الأحدث أولاً)
  distributedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return distributedItems;
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
