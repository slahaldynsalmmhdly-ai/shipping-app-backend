const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Story = require('../models/Story');
const User = require('../models/User');

// @desc    Create a new story
// @route   POST /api/v1/stories
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { media, text, backgroundColor } = req.body;

    // التحقق من وجود وسائط
    if (!media || !media.url || !media.type) {
      return res.status(400).json({ message: 'يجب إضافة صورة أو فيديو للقصة' });
    }

    // حساب وقت انتهاء الصلاحية (24 ساعة من الآن)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newStory = new Story({
      user: req.user.id,
      media,
      text: text || '',
      backgroundColor: backgroundColor || '#000000',
      expiresAt,
    });

    const story = await newStory.save();
    
    // إرجاع القصة مع معلومات المستخدم
    const populatedStory = await Story.findById(story._id)
      .populate('user', 'name avatar userType companyName');

    res.status(201).json(populatedStory);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

// @desc    Get all active stories grouped by user
// @route   GET /api/v1/stories
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const currentTime = new Date();

    // جلب جميع القصص النشطة (غير منتهية الصلاحية)
    const stories = await Story.find({
      expiresAt: { $gt: currentTime },
      isActive: true,
    })
      .populate('user', 'name avatar userType companyName')
      .populate('views.user', 'name')
      .sort({ createdAt: -1 });

    // تجميع القصص حسب المستخدم
    const groupedStories = {};
    
    stories.forEach(story => {
      const userId = story.user._id.toString();
      
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: story.user,
          stories: [],
          hasUnviewed: false, // هل توجد قصص لم يشاهدها المستخدم الحالي
          latestStoryTime: story.createdAt,
        };
      }
      
      groupedStories[userId].stories.push(story);
      
      // التحقق من المشاهدة
      const viewedByCurrentUser = story.views.some(
        view => view.user && view.user._id && view.user._id.toString() === req.user.id
      );
      
      if (!viewedByCurrentUser) {
        groupedStories[userId].hasUnviewed = true;
      }
    });

    // تحويل الكائن إلى مصفوفة وترتيبها
    const result = Object.values(groupedStories).sort((a, b) => {
      // القصص غير المشاهدة أولاً
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      // ثم الأحدث
      return new Date(b.latestStoryTime) - new Date(a.latestStoryTime);
    });

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

// @desc    Get stories for a specific user
// @route   GET /api/v1/stories/user/:userId
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const currentTime = new Date();

    const stories = await Story.find({
      user: req.params.userId,
      expiresAt: { $gt: currentTime },
      isActive: true,
    })
      .populate('user', 'name avatar userType companyName')
      .populate('views.user', 'name avatar')
      .sort({ createdAt: 1 }); // الأقدم أولاً

    res.json(stories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

// @desc    Mark story as viewed
// @route   POST /api/v1/stories/:id/view
// @access  Private
router.post('/:id/view', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'القصة غير موجودة' });
    }

    // التحقق من عدم تسجيل المشاهدة مسبقًا
    const alreadyViewed = story.views.some(
      view => view.user.toString() === req.user.id
    );

    if (!alreadyViewed) {
      story.views.push({
        user: req.user.id,
        viewedAt: new Date(),
      });
      await story.save();
    }

    res.json({ message: 'تم تسجيل المشاهدة' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

// @desc    Delete a story
// @route   DELETE /api/v1/stories/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'القصة غير موجودة' });
    }

    // التحقق من أن المستخدم هو صاحب القصة
    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذه القصة' });
    }

    await Story.findByIdAndDelete(req.params.id);

    res.json({ message: 'تم حذف القصة بنجاح' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

// @desc    Get my active stories
// @route   GET /api/v1/stories/my-stories
// @access  Private
router.get('/my-stories', protect, async (req, res) => {
  try {
    const currentTime = new Date();

    const stories = await Story.find({
      user: req.user.id,
      expiresAt: { $gt: currentTime },
      isActive: true,
    })
      .populate('views.user', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

module.exports = router;
