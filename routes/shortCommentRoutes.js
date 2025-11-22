const express = require('express');
const router = express.Router();
const ShortComment = require('../models/ShortComment');
const Short = require('../models/Short');
const { protect } = require('../middleware/authMiddleware');

/**
 * POST /api/v1/short-comments/:shortId
 * إضافة تعليق جديد على فيديو
 */
router.post('/:shortId', protect, async (req, res) => {
  try {
    const { shortId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'نص التعليق مطلوب' });
    }

    // التحقق من وجود الفيديو
    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({ message: 'الفيديو غير موجود' });
    }

    // إنشاء التعليق
    const comment = await ShortComment.create({
      short: shortId,
      user: req.user._id,
      text: text.trim()
    });

    // تحديث عدد التعليقات
    await Short.findByIdAndUpdate(shortId, { $inc: { comments: 1 } });

    // جلب التعليق مع بيانات المستخدم
    const populatedComment = await comment.populate('user', 'companyName avatar firstName lastName');

    res.status(201).json({
      success: true,
      comment: populatedComment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'فشل إضافة التعليق' });
  }
});

/**
 * GET /api/v1/short-comments/:shortId
 * جلب جميع التعليقات على فيديو
 */
router.get('/:shortId', protect, async (req, res) => {
  try {
    const { shortId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await ShortComment.find({ short: shortId, isDeleted: false })
      .populate('user', 'companyName avatar firstName lastName')
      .populate('replies.user', 'companyName avatar firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ShortComment.countDocuments({ short: shortId, isDeleted: false });

    res.json({
      success: true,
      comments,
      page: parseInt(page),
      hasMore: skip + comments.length < total
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'فشل جلب التعليقات' });
  }
});

/**
 * POST /api/v1/short-comments/:commentId/like
 * إضافة إعجاب على التعليق
 */
router.post('/:commentId/like', protect, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    // التحقق من وجود الإعجاب بالفعل
    const existingLike = comment.likes.find(like => like.user.toString() === req.user._id.toString());
    
    if (existingLike) {
      return res.status(400).json({ message: 'أنت بالفعل أعجبت بهذا التعليق' });
    }

    // إضافة الإعجاب
    comment.likes.push({ user: req.user._id });
    await comment.save();

    res.json({
      success: true,
      likesCount: comment.likes.length
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ message: 'فشل إضافة الإعجاب' });
  }
});

/**
 * DELETE /api/v1/short-comments/:commentId/like
 * إزالة الإعجاب من التعليق
 */
router.delete('/:commentId/like', protect, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    // إزالة الإعجاب
    comment.likes = comment.likes.filter(like => like.user.toString() !== req.user._id.toString());
    await comment.save();

    res.json({
      success: true,
      likesCount: comment.likes.length
    });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ message: 'فشل إزالة الإعجاب' });
  }
});

/**
 * POST /api/v1/short-comments/:commentId/reply
 * إضافة رد على التعليق
 */
router.post('/:commentId/reply', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'نص الرد مطلوب' });
    }

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    // إضافة الرد
    const reply = {
      user: req.user._id,
      text: text.trim()
    };

    comment.replies.push(reply);
    await comment.save();

    // جلب التعليق مع البيانات المحدثة
    const updatedComment = await ShortComment.findById(commentId)
      .populate('user', 'companyName avatar firstName lastName')
      .populate('replies.user', 'companyName avatar firstName lastName');

    res.status(201).json({
      success: true,
      comment: updatedComment
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'فشل إضافة الرد' });
  }
});

/**
 * POST /api/v1/short-comments/:commentId/replies/:replyIndex/like
 * إضافة إعجاب على الرد
 */
router.post('/:commentId/replies/:replyIndex/like', protect, async (req, res) => {
  try {
    const { commentId, replyIndex } = req.params;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    const reply = comment.replies[parseInt(replyIndex)];
    if (!reply) {
      return res.status(404).json({ message: 'الرد غير موجود' });
    }

    // التحقق من وجود الإعجاب بالفعل
    const existingLike = reply.likes.find(like => like.user.toString() === req.user._id.toString());
    
    if (existingLike) {
      return res.status(400).json({ message: 'أنت بالفعل أعجبت بهذا الرد' });
    }

    // إضافة الإعجاب
    reply.likes.push({ user: req.user._id });
    await comment.save();

    res.json({
      success: true,
      likesCount: reply.likes.length
    });
  } catch (error) {
    console.error('Error liking reply:', error);
    res.status(500).json({ message: 'فشل إضافة الإعجاب' });
  }
});

/**
 * DELETE /api/v1/short-comments/:commentId/replies/:replyIndex/like
 * إزالة الإعجاب من الرد
 */
router.delete('/:commentId/replies/:replyIndex/like', protect, async (req, res) => {
  try {
    const { commentId, replyIndex } = req.params;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    const reply = comment.replies[parseInt(replyIndex)];
    if (!reply) {
      return res.status(404).json({ message: 'الرد غير موجود' });
    }

    // إزالة الإعجاب
    reply.likes = reply.likes.filter(like => like.user.toString() !== req.user._id.toString());
    await comment.save();

    res.json({
      success: true,
      likesCount: reply.likes.length
    });
  } catch (error) {
    console.error('Error unliking reply:', error);
    res.status(500).json({ message: 'فشل إزالة الإعجاب' });
  }
});

/**
 * DELETE /api/v1/short-comments/:commentId
 * حذف التعليق
 */
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'التعليق غير موجود' });
    }

    // التحقق من أن المستخدم هو صاحب التعليق
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'لا يمكنك حذف تعليق شخص آخر' });
    }

    // تحديث عدد التعليقات
    await Short.findByIdAndUpdate(comment.short, { $inc: { comments: -1 } });

    // حذف التعليق
    comment.isDeleted = true;
    await comment.save();

    res.json({
      success: true,
      message: 'تم حذف التعليق بنجاح'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'فشل حذف التعليق' });
  }
});

module.exports = router;
