const express = require('express');
const router = express.Router();
const Short = require('../models/Short');
const User = require('../models/User');
const ShortInteraction = require('../models/ShortInteraction');
const { protect } = require('../middleware/authMiddleware');
// تم إزالة smartShortsAlgorithm (بطيء جداً) - نستخدم خوارزمية بسيطة وسريعة

/**
 * GET /api/v1/shorts/:tab
 * الحصول على الشورتس حسب التبويب (for-you أو following)
 * ✅ مطابق مع الواجهة الأمامية
 */
router.get('/:tab', protect, async (req, res) => {
  try {
    const { tab } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (!['for-you', 'following'].includes(tab)) {
      return res.status(400).json({ message: 'Invalid tab' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { isActive: true, isPublic: true };
    
    if (tab === 'following') {
      const user = await User.findById(req.user._id).select('following');
      query.user = { $in: user.following };
    }
    
    const shorts = await Short.find(query)
      .select('_id title description videoUrl thumbnailUrl duration user likes comments views viewedBy createdAt')
      .populate('user', 'companyName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // إضافة isLiked و shortCommentCount لكل شورت
    const formattedShorts = shorts.map(short => {
      const shortObj = short.toObject();
      const userView = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());
      return {
        ...shortObj,
        isLiked: userView?.liked || false,
        shortCommentCount: shortObj.comments || 0,
        commentCount: shortObj.comments || 0,
        viewedBy: undefined // إزالة viewedBy من الاستجابة
      };
    });
    
    const total = await Short.countDocuments(query);
    
    res.json({
      success: true,
      posts: formattedShorts,
      page: parseInt(page),
      hasMore: skip + formattedShorts.length < total
    });
  } catch (error) {
    console.error('Error fetching shorts:', error);
    res.status(500).json({ message: 'Failed to fetch shorts' });
  }
});

/**
 * GET /api/v1/shorts
 * الحصول على قائمة الشورتس بالخوارزمية الذكية
 */
router.get('/', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).populate('following');

    // جلب جميع الشورتس النشطة
    const allShorts = await Short.find({ isActive: true, isPublic: true })
      .populate('user', 'companyName avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    // جلب سجل المشاهدة للمستخدم
    const viewHistory = await Short.find({
      'viewedBy.user': currentUser._id
    }).select('_id tags categories viewedBy').lean();

    // استخراج تفاصيل المشاهدة
    const userViewHistory = viewHistory.map(short => {
      const userView = short.viewedBy.find(v => v.user.toString() === currentUser._id.toString());
      return {
        shortId: short._id,
        tags: short.tags,
        categories: short.categories,
        watchDuration: userView?.watchDuration || 0,
        completed: userView?.completed || false,
        liked: userView?.liked || false,
        commented: userView?.commented || false,
        shared: userView?.shared || false
      };
    });

    // ترتيب بسيط حسب التفاعل والتنوع (بدون AI)
    const sortedShorts = allShorts.sort((a, b) => {
      const engagementA = (a.likes || 0) * 2 + (a.comments || 0) * 3 + (a.views || 0) * 0.1;
      const engagementB = (b.likes || 0) * 2 + (b.comments || 0) * 3 + (b.views || 0) * 0.1;
      
      // ترتيب حسب التفاعل أولاً، ثم حسب الوقت
      if (Math.abs(engagementB - engagementA) > 10) {
        return engagementB - engagementA;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      count: sortedShorts.length,
      data: sortedShorts
    });
  } catch (error) {
    console.error('خطأ في جلب الشورتس:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الشورتس'
    });
  }
});

/**
 * POST /api/v1/shorts
 * إنشاء شورت جديد
 */
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, duration, hashtags } = req.body;

    // إنشاء الشورت
    const short = await Short.create({
      user: req.user._id,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      hashtags: hashtags || []
    });

    // تم إزالة تحليل AI (بطيء جداً)
    // الشورت يحتوي على الهاشتاقات من الواجهة الأمامية

    // جلب الشورت مع بيانات المستخدم
    const populatedShort = await Short.findById(short._id).populate('user', 'companyName avatar');

    res.status(201).json({
      success: true,
      data: populatedShort
    });
  } catch (error) {
    console.error('خطأ في إنشاء الشورت:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الشورت'
    });
  }
});

/**
 * POST /api/v1/shorts/:id/view
 * تسجيل مشاهدة شورت
 */
router.post('/:id/view', protect, async (req, res) => {
  try {
    const { watchDuration, completed } = req.body;
    const short = await Short.findById(req.params.id);
    
    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // تحديث أو إنشاء سجل التفاعل
    let interaction = await ShortInteraction.findOne({
      user: req.user._id,
      short: short._id
    });

    if (interaction) {
      // تحديث سجل موجود
      interaction.updateWatchData(watchDuration || 0, short.duration);
      interaction.recordRewatch();
      await interaction.save();
    } else {
      // إنشاء سجل جديد
      interaction = await ShortInteraction.create({
        user: req.user._id,
        short: short._id,
        watchDuration: watchDuration || 0,
        totalDuration: short.duration,
        completed: completed || false,
        hashtags: short.hashtags || []
      });
      interaction.updateWatchData(watchDuration || 0, short.duration);
      await interaction.save();
    }

    // تحديث الشورت القديم (للتوافق مع الكود القديم)
    const short2 = await Short.findById(req.params.id);

    // التحقق من وجود مشاهدة سابقة
    const existingView = short2.viewedBy.find(v => v.user.toString() === req.user._id.toString());

    if (existingView) {
      // تحديث المشاهدة الموجودة
      existingView.watchDuration = Math.max(existingView.watchDuration, watchDuration || 0);
      existingView.completed = existingView.completed || completed || false;
      existingView.viewedAt = Date.now();
    } else {
      // إضافة مشاهدة جديدة
      short2.viewedBy.push({
        user: req.user._id,
        watchDuration: watchDuration || 0,
        completed: completed || false
      });
      short2.views += 1;
    }

    await short2.save();

    res.json({
      success: true,
      message: 'تم تسجيل المشاهدة'
    });
  } catch (error) {
    console.error('خطأ في تسجيل المشاهدة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل المشاهدة'
    });
  }
});

/**
 * POST /api/v1/shorts/:id/like
 * الإعجاب بشورت
 */
router.post('/:id/like', protect, async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // تحديث سجل التفاعل
    let interaction = await ShortInteraction.findOne({
      user: req.user._id,
      short: short._id
    });

    let liked = false;

    if (interaction) {
      // تبديل حالة الإعجاب
      interaction.liked = !interaction.liked;
      liked = interaction.liked;
      interaction.calculateInterestScore();
      await interaction.save();
    } else {
      // إنشاء سجل جديد مع إعجاب
      interaction = await ShortInteraction.create({
        user: req.user._id,
        short: short._id,
        totalDuration: short.duration,
        liked: true,
        hashtags: short.hashtags || []
      });
      interaction.calculateInterestScore();
      await interaction.save();
      liked = true;
    }

    // البحث عن المشاهدة
    const view = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());

    if (view) {
      if (view.liked) {
        // إلغاء الإعجاب
        view.liked = false;
        short.likes = Math.max(0, short.likes - 1);
      } else {
        // إضافة إعجاب
        view.liked = true;
        short.likes += 1;
      }
    } else {
      // إضافة مشاهدة جديدة مع إعجاب
      short.viewedBy.push({
        user: req.user._id,
        liked: true,
        watchDuration: 0
      });
      short.likes += 1;
      short.views += 1;
    }

    await short.save();

    res.json({
      success: true,
      liked: liked,
      likes: short.likes
    });
  } catch (error) {
    console.error('خطأ في الإعجاب:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الإعجاب'
    });
  }
});

/**
 * POST /api/v1/shorts/:id/react
 * التفاعل مع شورت (إعجاب) - endpoint بديل يتوافق مع الواجهة الأمامية
 */
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { reactionType } = req.body;
    
    // حالياً ندعم فقط 'like'
    if (reactionType !== 'like') {
      return res.status(400).json({
        success: false,
        message: 'نوع التفاعل غير مدعوم'
      });
    }

    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // تحديث سجل التفاعل
    let interaction = await ShortInteraction.findOne({
      user: req.user._id,
      short: short._id
    });

    let liked = false;

    if (interaction) {
      // تبديل حالة الإعجاب
      interaction.liked = !interaction.liked;
      liked = interaction.liked;
      interaction.calculateInterestScore();
      await interaction.save();
    } else {
      // إنشاء سجل جديد مع إعجاب
      interaction = await ShortInteraction.create({
        user: req.user._id,
        short: short._id,
        totalDuration: short.duration,
        liked: true,
        hashtags: short.hashtags || []
      });
      interaction.calculateInterestScore();
      await interaction.save();
      liked = true;
    }

    // البحث عن المشاهدة
    const view = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());

    if (view) {
      if (view.liked) {
        // إلغاء الإعجاب
        view.liked = false;
        short.likes = Math.max(0, short.likes - 1);
      } else {
        // إضافة إعجاب
        view.liked = true;
        short.likes += 1;
      }
    } else {
      // إضافة مشاهدة جديدة مع إعجاب
      short.viewedBy.push({
        user: req.user._id,
        liked: true,
        watchDuration: 0
      });
      short.likes += 1;
      short.views += 1;
    }

    await short.save();

    res.json({
      success: true,
      liked: liked,
      likes: short.likes
    });
  } catch (error) {
    console.error('خطأ في التفاعل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التفاعل'
    });
  }
});

/**
 * POST /api/v1/shorts/:id/comment
 * التعليق على شورت
 */
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // تحديث سجل التفاعل
    let interaction = await ShortInteraction.findOne({
      user: req.user._id,
      short: short._id
    });

    if (interaction) {
      interaction.commented = true;
      interaction.calculateInterestScore();
      await interaction.save();
    } else {
      interaction = await ShortInteraction.create({
        user: req.user._id,
        short: short._id,
        totalDuration: short.duration,
        commented: true,
        hashtags: short.hashtags || []
      });
      interaction.calculateInterestScore();
      await interaction.save();
    }

    // البحث عن المشاهدة
    const view = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());

    if (view) {
      view.commented = true;
    } else {
      // إضافة مشاهدة جديدة مع تعليق
      short.viewedBy.push({
        user: req.user._id,
        commented: true,
        watchDuration: 0
      });
      short.views += 1;
    }

    short.comments += 1;
    await short.save();

    res.json({
      success: true,
      comments: short.comments
    });
  } catch (error) {
    console.error('خطأ في التعليق:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التعليق'
    });
  }
});

/**
 * POST /api/v1/shorts/:id/share
 * مشاركة شورت
 */
router.post('/:id/share', protect, async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // تحديث سجل التفاعل
    let interaction = await ShortInteraction.findOne({
      user: req.user._id,
      short: short._id
    });

    if (interaction) {
      interaction.shared = true;
      interaction.calculateInterestScore();
      await interaction.save();
    } else {
      interaction = await ShortInteraction.create({
        user: req.user._id,
        short: short._id,
        totalDuration: short.duration,
        shared: true,
        hashtags: short.hashtags || []
      });
      interaction.calculateInterestScore();
      await interaction.save();
    }

    // البحث عن المشاهدة
    const view = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());

    if (view) {
      view.shared = true;
    } else {
      // إضافة مشاهدة جديدة مع مشاركة
      short.viewedBy.push({
        user: req.user._id,
        shared: true,
        watchDuration: 0
      });
      short.views += 1;
    }

    short.shares += 1;
    await short.save();

    res.json({
      success: true,
      shares: short.shares
    });
  } catch (error) {
    console.error('خطأ في المشاركة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء المشاركة'
    });
  }
});

/**
 * DELETE /api/v1/shorts/:id
 * حذف شورت
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // التحقق من أن المستخدم هو صاحب الشورت
    if (short.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا الشورت'
      });
    }

    await short.deleteOne();

    res.json({
      success: true,
      message: 'تم حذف الشورت بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الشورت:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الشورت'
    });
  }
});

module.exports = router;

/**
 * GET /api/v1/shorts/:id/similar
 * الحصول على فيديوهات مشابهة لفيديو معين
 */
const { getSimilarShorts, getShortsbyHashtags, getRecommendedShorts } = require('../utils/similarShortsAlgorithm');

router.get('/:id/similar', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const similarShorts = await getSimilarShorts(req.params.id, req.user._id, limit);

    res.json({
      success: true,
      count: similarShorts.length,
      data: similarShorts
    });
  } catch (error) {
    console.error('خطأ في جلب الفيديوهات المشابهة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الفيديوهات المشابهة'
    });
  }
});

/**
 * GET /api/v1/shorts/hashtag/:hashtag
 * الحصول على فيديوهات بهاشتاق معين
 */
router.get('/hashtag/:hashtag', protect, async (req, res) => {
  try {
    const hashtag = req.params.hashtag;
    const limit = parseInt(req.query.limit) || 10;
    const shorts = await getShortsbyHashtags([hashtag], req.user._id, limit);

    res.json({
      success: true,
      count: shorts.length,
      data: shorts
    });
  } catch (error) {
    console.error('خطأ في جلب الفيديوهات بالهاشتاق:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الفيديوهات'
    });
  }
});

/**
 * GET /api/v1/shorts/recommended
 * الحصول على فيديوهات موصى بها بناءً على اهتمامات المستخدم
 */
router.get('/recommended', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recommendedShorts = await getRecommendedShorts(req.user._id, limit);

    res.json({
      success: true,
      count: recommendedShorts.length,
      data: recommendedShorts
    });
  } catch (error) {
    console.error('خطأ في جلب الفيديوهات الموصى بها:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الفيديوهات الموصى بها'
    });
  }
});

module.exports = router;
