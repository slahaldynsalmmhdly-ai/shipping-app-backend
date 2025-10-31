const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const ShipmentAd = require('../models/ShipmentAd');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const User = require('../models/User');
const { diversifyContent } = require('../utils/contentDiversity');
const { advancedDiversityAlgorithm } = require('../utils/advancedDiversity');

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
 * @desc    Get unified feed (Posts + ShipmentAds + EmptyTruckAds) with Facebook-style algorithm
 * @route   GET /api/v1/feed
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // جلب معلومات المستخدم الحالي مع الإشعارات
    const currentUser = await User.findById(req.user.id).select('following notifications').lean();
    const following = currentUser?.following || [];
    const notifications = currentUser?.notifications || [];
    
    // جلب جميع المنشورات
    const posts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
      // تم إزالة فلتر generatedByAI لعرض المنشورات المولدة بالذكاء الاصطناعي
    })
      .populate('user', ['name', 'avatar', 'userType', 'companyName'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .lean();
    
    // جلب جميع إعلانات الشحن
    const shipmentAds = await ShipmentAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
      // تم إزالة فلتر generatedByAI
    })
      .populate('user', ['name', 'avatar', 'userType', 'companyName'])
      .lean();
    
    // جلب جميع إعلانات الشاحنات الفارغة
    const emptyTruckAds = await EmptyTruckAd.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
      // تم إزالة فلتر generatedByAI
    })
      .populate('user', ['name', 'avatar', 'userType', 'companyName'])
      .lean();
    
    // دمج جميع العناصر مع إضافة نوع لكل عنصر
    const allItems = [
      ...posts.map(p => ({ ...p, itemType: 'post' })),
      ...shipmentAds.map(s => ({ ...s, itemType: 'shipmentAd' })),
      ...emptyTruckAds.map(e => ({ ...e, itemType: 'emptyTruckAd' }))
    ];
    
    // فلترة العناصر بناءً على نظام الإشعارات (15% من المتابعين)
    const feedItems = [];
    
    for (const item of allItems) {
      const isFollowing = following.some(id => id.toString() === item.user._id.toString());
      
      // إذا كان من غير المتابعين، نعرضه دائماً
      if (!isFollowing) {
        feedItems.push(item);
        continue;
      }
      
      // إذا كان من المتابعين، نتحقق من الإشعار
      const notification = notifications.find(notif => {
        if (item.itemType === 'post' && notif.post) {
          return notif.post.toString() === item._id.toString();
        } else if (item.itemType === 'shipmentAd' && notif.shipmentAd) {
          return notif.shipmentAd.toString() === item._id.toString();
        } else if (item.itemType === 'emptyTruckAd' && notif.emptyTruckAd) {
          return notif.emptyTruckAd.toString() === item._id.toString();
        }
        return false;
      });
      
      // إذا لم يوجد إشعار أو showInFeed = true، نعرض المنشور
      if (!notification || notification.showInFeed !== false) {
        feedItems.push(item);
      }
    }
    
    // فصل العناصر إلى متابَعين وغير متابَعين مع حساب النقاط
    const followingItems = [];
    const nonFollowingItems = [];
    
    feedItems.forEach(item => {
      const isFollowing = following.some(id => id.toString() === item.user._id.toString());
      const score = calculateFeedScore(item, isFollowing, req.user.id);
      
      const itemWithScore = { ...item, feedScore: score };
      
      if (isFollowing) {
        followingItems.push(itemWithScore);
      } else {
        nonFollowingItems.push(itemWithScore);
      }
    });
    
    // ترتيب كل مجموعة حسب النقاط
    followingItems.sort((a, b) => b.feedScore - a.feedScore);
    nonFollowingItems.sort((a, b) => b.feedScore - a.feedScore);
    
    // دمج العناصر مع إعطاء الأولوية للمتابعين
    let finalItems = [...followingItems, ...nonFollowingItems];
    
    // ترتيب نهائي حسب النقاط مع خلط خفيف
    finalItems.sort((a, b) => {
      // إذا كان الفرق في النقاط كبير (أكثر من 20)، نرتب حسب النقاط
      if (Math.abs(b.feedScore - a.feedScore) > 20) {
        return b.feedScore - a.feedScore;
      }
      // إذا كان الفرق صغير، نستخدم التاريخ
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // تطبيق خوارزمية التنويع المتقدمة (مثل فيسبوك)
    // هذه الخوارزمية تمنع ظهور 50 منشور من نفس الشركة مباشرة!
    const shuffledItems = advancedDiversityAlgorithm(finalItems, {
      maxPerUser: 3,      // حد أقصى 3 منشورات لكل مستخدم/شركة
      companyRatio: 0.4,  // 40% شركات، 60% أفراد (تنويع متوازن)
      minGap: 5,          // فجوة 5 منشورات بين منشورات نفس المستخدم
    });
    
    // تطبيق pagination
    const paginatedItems = shuffledItems.slice(skip, skip + limit);
    
    // إزالة feedScore من النتيجة النهائية
    const cleanedItems = paginatedItems.map(item => {
      const { feedScore, ...cleanItem } = item;
      return cleanItem;
    });
    
    res.json({
      items: cleanedItems,
      pagination: {
        currentPage: page,
        totalItems: shuffledItems.length,
        totalPages: Math.ceil(shuffledItems.length / limit),
        itemsPerPage: limit,
        hasMore: skip + paginatedItems.length < shuffledItems.length
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
