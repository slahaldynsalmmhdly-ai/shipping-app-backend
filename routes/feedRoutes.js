const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');
const { applySmartFeedAlgorithm, recordImpression, recordInteraction } = require('../utils/smartFeedAlgorithm');

/**
 * حساب نقاط التفاعل للمنشور/الإعلان
 */
function calculateEngagementScore(item) {
  const reactionsCount = item.reactions?.length || 0;
  const commentsCount = item.comments?.length || 0;
  
  // التفاعلات لها وزن أكبر من التعليقات
  return (reactionsCount * 2) + (commentsCount * 3);
}

/**
 * حساب نقاط الوقت (المنشورات الأحدث تحصل على نقاط أعلى)
 */
function calculateTimeScore(createdAt) {
  const now = new Date();
  const postDate = new Date(createdAt);
  const hoursDiff = (now - postDate) / (1000 * 60 * 60);
  
  // المنشورات الأحدث من 24 ساعة تحصل على نقاط عالية
  if (hoursDiff < 24) {
    return 100 - (hoursDiff * 2); // من 100 إلى 52
  } else if (hoursDiff < 72) {
    return 50 - ((hoursDiff - 24) / 2); // من 50 إلى 26
  } else if (hoursDiff < 168) { // أسبوع
    return 25 - ((hoursDiff - 72) / 10); // من 25 إلى 15
  } else {
    return Math.max(1, 15 - ((hoursDiff - 168) / 100)); // من 15 إلى 1
  }
}

/**
 * حساب النقاط الإجمالية للمنشور/الإعلان
 */
function calculateFeedScore(item, isFollowing, userId) {
  const engagementScore = calculateEngagementScore(item);
  const timeScore = calculateTimeScore(item.createdAt);
  
  // نقاط العلاقة: إذا كان من المتابَعين، يحصل على boost
  let relationshipScore = 0;
  if (isFollowing) {
    relationshipScore = 30; // boost للمتابَعين
  }
  
  // حساب النقاط النهائية
  // 30% للوقت، 40% للتفاعل، 30% للعلاقة
  const finalScore = (
    (timeScore * 0.3) +
    (engagementScore * 0.4) +
    (relationshipScore * 0.3)
  );
  
  return finalScore;
}

/**
 * خلط المصفوفة بطريقة ثابتة (seeded random)
 * يستخدم userId كـ seed لضمان نفس الترتيب للمستخدم نفسه
 */
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  
  // استخدام seed بسيط
  let random = seed;
  
  while (currentIndex !== 0) {
    // توليد رقم عشوائي بناءً على seed
    random = (random * 9301 + 49297) % 233280;
    const randomIndex = Math.floor((random / 233280) * currentIndex);
    currentIndex--;
    
    // تبديل العناصر
    [shuffled[currentIndex], shuffled[randomIndex]] = 
    [shuffled[randomIndex], shuffled[currentIndex]];
  }
  
  return shuffled;
}

/**
 * التحقق من أن المنشور يجب أن يظهر في الخلاصة للمستخدم الحالي
 * بناءً على نظام الإشعارات (15% من منشورات المتابعين تظهر في الخلاصة)
 */
async function shouldShowInFeed(item, currentUserId) {
  try {
    // جلب المستخدم الحالي مع إشعاراته
    const user = await User.findById(currentUserId).select('notifications').lean();
    
    if (!user || !user.notifications) {
      return true; // إذا لم توجد إشعارات، نعرض المنشور
    }
    
    // البحث عن إشعار مرتبط بهذا المنشور/الإعلان
    const notification = user.notifications.find(notif => {
      if (item.itemType === 'post' && notif.post) {
        return notif.post.toString() === item._id.toString();
      } else if (item.itemType === 'shipmentAd' && notif.shipmentAd) {
        return notif.shipmentAd.toString() === item._id.toString();
      } else if (item.itemType === 'emptyTruckAd' && notif.emptyTruckAd) {
        return notif.emptyTruckAd.toString() === item._id.toString();
      }
      return false;
    });
    
    // إذا لم يوجد إشعار، نعرض المنشور (منشورات غير المتابعين)
    if (!notification) {
      return true;
    }
    
    // إذا وجد إشعار، نتحقق من showInFeed
    // إذا لم يوجد showInFeed في الإشعار، نفترض أنه يجب عرضه (للتوافق مع البيانات القديمة)
    return notification.showInFeed !== false;
    
  } catch (error) {
    console.error('خطأ في التحقق من showInFeed:', error);
    return true; // في حالة الخطأ، نعرض المنشور
  }
}

/**
 * @desc    Get unified feed (Posts + ShipmentAds + EmptyTruckAds) with smart pagination
 * @route   GET /api/v1/feed
 * @access  Private
 * 
 * الاستراتيجية:
 * - عند الطلب الأول (page=1): يجلب منشور عادي + إعلان شاحنة فارغة + إعلان حمولة (3 عناصر)
 * - إذا لم توجد إعلانات: يجلب 3 منشورات عادية
 * - عند "تحميل المزيد": يجلب 3 عناصر إضافية بنفس المنطق
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3; // دائماً 3 عناصر في كل طلب
    const skip = (page - 1) * limit;
    
    // جلب معلومات المستخدم الحالي مع الإشعارات
    const currentUser = await User.findById(req.user.id).select('following notifications').lean();
    const following = currentUser?.following || [];
    
    // جلب جميع المنشورات العادية
    const posts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    })
      .populate('user', ['name', 'avatar', 'userType', 'companyName'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // جلب جميع إعلانات الشحن
    const shipmentAds = await ShipmentAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    })
      .populate('user', ['name', 'avatar', 'userType', 'companyName'])
      .sort({ createdAt: -1 })
      .lean();
    
    // جلب جميع إعلانات الشاحنات الفارغة
    const emptyTruckAds = await EmptyTruckAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    })
      .populate('user', ['name', 'avatar', 'userType', 'companyName'])
      .sort({ createdAt: -1 })
      .lean();
    
    // إضافة نوع لكل عنصر
    const postsWithType = posts.map(p => ({ ...p, itemType: 'post' }));
    const shipmentAdsWithType = shipmentAds.map(s => ({ ...s, itemType: 'shipmentAd' }));
    const emptyTruckAdsWithType = emptyTruckAds.map(e => ({ ...e, itemType: 'emptyTruckAd' }));
    
    // Apply Smart Feed Algorithm على كل نوع بشكل منفصل
    const sortedPosts = await applySmartFeedAlgorithm(postsWithType, currentUser, []);
    const sortedShipmentAds = await applySmartFeedAlgorithm(shipmentAdsWithType, currentUser, []);
    const sortedEmptyTruckAds = await applySmartFeedAlgorithm(emptyTruckAdsWithType, currentUser, []);
    
    // بناء الخلاصة بطريقة ذكية: توزيع متوازن بين الأنواع الثلاثة
    const feedItems = [];
    let postIndex = 0;
    let shipmentAdIndex = 0;
    let emptyTruckAdIndex = 0;
    
    // نمط التوزيع: منشور عادي -> إعلان شاحنة فارغة -> إعلان حمولة -> منشور عادي -> ...
    const totalItemsNeeded = skip + limit;
    
    for (let i = 0; i < totalItemsNeeded; i++) {
      const position = i % 3;
      
      if (position === 0) {
        // منشور عادي
        if (postIndex < sortedPosts.length) {
          feedItems.push(sortedPosts[postIndex]);
          postIndex++;
        } else if (shipmentAdIndex < sortedShipmentAds.length) {
          // إذا انتهت المنشورات العادية، نستخدم إعلان حمولة
          feedItems.push(sortedShipmentAds[shipmentAdIndex]);
          shipmentAdIndex++;
        } else if (emptyTruckAdIndex < sortedEmptyTruckAds.length) {
          // إذا انتهت إعلانات الحمولة، نستخدم إعلان شاحنة فارغة
          feedItems.push(sortedEmptyTruckAds[emptyTruckAdIndex]);
          emptyTruckAdIndex++;
        }
      } else if (position === 1) {
        // إعلان شاحنة فارغة
        if (emptyTruckAdIndex < sortedEmptyTruckAds.length) {
          feedItems.push(sortedEmptyTruckAds[emptyTruckAdIndex]);
          emptyTruckAdIndex++;
        } else if (postIndex < sortedPosts.length) {
          // إذا انتهت إعلانات الشاحنات الفارغة، نستخدم منشور عادي
          feedItems.push(sortedPosts[postIndex]);
          postIndex++;
        } else if (shipmentAdIndex < sortedShipmentAds.length) {
          // إذا انتهت المنشورات العادية، نستخدم إعلان حمولة
          feedItems.push(sortedShipmentAds[shipmentAdIndex]);
          shipmentAdIndex++;
        }
      } else {
        // إعلان حمولة
        if (shipmentAdIndex < sortedShipmentAds.length) {
          feedItems.push(sortedShipmentAds[shipmentAdIndex]);
          shipmentAdIndex++;
        } else if (postIndex < sortedPosts.length) {
          // إذا انتهت إعلانات الحمولة، نستخدم منشور عادي
          feedItems.push(sortedPosts[postIndex]);
          postIndex++;
        } else if (emptyTruckAdIndex < sortedEmptyTruckAds.length) {
          // إذا انتهت المنشورات العادية، نستخدم إعلان شاحنة فارغة
          feedItems.push(sortedEmptyTruckAds[emptyTruckAdIndex]);
          emptyTruckAdIndex++;
        }
      }
    }
    
    // تطبيق pagination: أخذ العناصر من skip إلى skip + limit
    const paginatedItems = feedItems.slice(skip, skip + limit);
    
    // إزالة feedScore من النتيجة النهائية
    const cleanedItems = paginatedItems.map(item => {
      const { feedScore, ...cleanItem } = item;
      return cleanItem;
    });
    
    // حساب إجمالي العناصر المتاحة
    const totalAvailableItems = sortedPosts.length + sortedShipmentAds.length + sortedEmptyTruckAds.length;
    
    res.json({
      items: cleanedItems,
      pagination: {
        currentPage: page,
        totalItems: totalAvailableItems,
        totalPages: Math.ceil(totalAvailableItems / limit),
        itemsPerPage: limit,
        hasMore: feedItems.length > skip + limit || 
                 postIndex < sortedPosts.length || 
                 shipmentAdIndex < sortedShipmentAds.length || 
                 emptyTruckAdIndex < sortedEmptyTruckAds.length
      }
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

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
    
    res.json({
      totalPosts: postsCount,
      totalShipmentAds: shipmentAdsCount,
      totalEmptyTruckAds: emptyTruckAdsCount,
      totalItems: postsCount + shipmentAdsCount + emptyTruckAdsCount,
      followingCount: following.length
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
