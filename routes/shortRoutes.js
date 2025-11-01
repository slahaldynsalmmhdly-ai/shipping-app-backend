const express = require('express');
const router = express.Router();
const Short = require('../models/Short');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { applySmartShortsAlgorithm, analyzeVideoContent } = require('../utils/smartShortsAlgorithm');

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

    // تطبيق الخوارزمية الذكية
    const recommendedShorts = await applySmartShortsAlgorithm(allShorts, currentUser, userViewHistory);

    res.json({
      success: true,
      count: recommendedShorts.length,
      data: recommendedShorts
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
    const { title, description, videoUrl, thumbnailUrl, duration } = req.body;

    // إنشاء الشورت
    const short = await Short.create({
      user: req.user._id,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration
    });

    // تحليل محتوى الفيديو بالذكاء الاصطناعي
    const analysis = await analyzeVideoContent(short);
    
    // تحديث الشورت بنتائج التحليل
    short.tags = analysis.tags;
    short.categories = analysis.categories;
    short.topics = analysis.topics;
    short.mood = analysis.mood;
    short.targetAudience = analysis.targetAudience;
    await short.save();

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

    // التحقق من وجود مشاهدة سابقة
    const existingView = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());

    if (existingView) {
      // تحديث المشاهدة الموجودة
      existingView.watchDuration = Math.max(existingView.watchDuration, watchDuration || 0);
      existingView.completed = existingView.completed || completed || false;
      existingView.viewedAt = Date.now();
    } else {
      // إضافة مشاهدة جديدة
      short.viewedBy.push({
        user: req.user._id,
        watchDuration: watchDuration || 0,
        completed: completed || false
      });
      short.views += 1;
    }

    await short.save();

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
      liked: view ? view.liked : true,
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
