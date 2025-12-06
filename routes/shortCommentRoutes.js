const express = require('express');
const router = express.Router();
const ShortComment = require('../models/ShortComment');
const Short = require('../models/Short');
const { protect } = require('../middleware/authMiddleware');
const { createShortCommentNotification, createShortReplyNotification, createShortCommentLikeNotification, createShortReplyLikeNotification } = require('../utils/notificationHelper');

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

    // إرسال إشعار لصاحب الفيديو
    await createShortCommentNotification(req.user._id, short.user.toString(), shortId, comment._id);

    // جلب التعليق مع بيانات المستخدم
    const populatedComment = await comment.populate('user', 'companyName avatar firstName lastName');

    // تحويل البيانات لتتوافق مع الواجهة الأمامية
    const commentObj = populatedComment.toObject();
    const formattedComment = {
      _id: commentObj._id,
      short: commentObj.short,
      user: commentObj.user,
      text: commentObj.text,
      createdAt: commentObj.createdAt,
      updatedAt: commentObj.updatedAt,
      isDeleted: commentObj.isDeleted,
      likes: populatedComment.likes.map(like => like.user.toString()),
      replyCount: 0,
      replies: []
    };

    res.status(201).json(formattedComment);
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

    // تحويل البيانات لتتوافق مع الواجهة الأمامية
    const formattedComments = comments.map(comment => {
      const commentObj = comment.toObject();
      return {
        _id: commentObj._id,
        short: commentObj.short,
        user: commentObj.user,
        text: commentObj.text,
        createdAt: commentObj.createdAt,
        updatedAt: commentObj.updatedAt,
        isDeleted: commentObj.isDeleted,
        likes: comment.likes.map(like => like.user.toString()),
        replyCount: comment.replies.length,
        replies: comment.replies.map(reply => {
          const replyObj = reply.toObject();
          return {
            _id: replyObj._id,
            user: replyObj.user,
            text: replyObj.text,
            createdAt: replyObj.createdAt,
            likes: reply.likes ? reply.likes.map(like => like.user.toString()) : []
          };
        })
      };
    });

    res.json(formattedComments);
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
    
    let isNewLike = false;
    if (existingLike) {
      // إزالة الإعجاب (تبديل)
      comment.likes = comment.likes.filter(like => like.user.toString() !== req.user._id.toString());
    } else {
      // إضافة الإعجاب
      comment.likes.push({ user: req.user._id });
      isNewLike = true;
    }
    
    await comment.save();

    // إرسال إشعار إذا كان إعجاب جديد
    if (isNewLike) {
      await createShortCommentLikeNotification(req.user._id, comment.user.toString(), comment.short, commentId);
    }

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

    // إرسال إشعار لصاحب التعليق
    const replyId = comment.replies[comment.replies.length - 1]._id;
    await createShortReplyNotification(req.user._id, comment.user.toString(), comment.short, commentId, replyId);

    // جلب التعليق مع البيانات المحدثة
    const updatedComment = await ShortComment.findById(commentId)
      .populate('user', 'companyName avatar firstName lastName')
      .populate('replies.user', 'companyName avatar firstName lastName');

    // تحويل البيانات لتتوافق مع الواجهة الأمامية
    const commentObj = updatedComment.toObject();
    const formattedComment = {
      _id: commentObj._id,
      short: commentObj.short,
      user: commentObj.user,
      text: commentObj.text,
      createdAt: commentObj.createdAt,
      updatedAt: commentObj.updatedAt,
      isDeleted: commentObj.isDeleted,
      likes: updatedComment.likes.map(like => like.user.toString()),
      replyCount: updatedComment.replies.length,
      replies: updatedComment.replies.map(reply => {
        const replyObj = reply.toObject();
        return {
          _id: replyObj._id,
          user: replyObj.user,
          text: replyObj.text,
          createdAt: replyObj.createdAt,
          likes: reply.likes ? reply.likes.map(like => like.user.toString()) : []
        };
      })
    };

    res.status(201).json(formattedComment);
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

    // إرسال إشعار لصاحب الرد
    await createShortReplyLikeNotification(req.user._id, reply.user.toString(), comment.short, commentId, reply._id);

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
