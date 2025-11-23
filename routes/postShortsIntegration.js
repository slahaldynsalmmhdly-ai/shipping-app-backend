const express = require('express');
const router = express.Router();
const Short = require('../models/Short');
const ShortComment = require('../models/ShortComment');
const ShortInteraction = require('../models/ShortInteraction');
const Post = require('../models/Post');
const { protect } = require('../middleware/authMiddleware');

/**
 * Middleware to handle Shorts through Posts API
 * This allows the frontend to use Posts API for both Posts and Shorts
 */

// Helper function to check if an ID belongs to a Short or Post
async function isShort(id) {
  try {
    const short = await Short.findById(id);
    return !!short;
  } catch (error) {
    return false;
  }
}

// Helper function to format comment for frontend compatibility
function formatComment(comment, currentUserId = null) {
  const commentObj = comment.toObject ? comment.toObject() : comment;
  return {
    _id: commentObj._id,
    user: commentObj.user,
    text: commentObj.text,
    createdAt: commentObj.createdAt,
    updatedAt: commentObj.updatedAt,
    isDeleted: commentObj.isDeleted || false,
    likes: comment.likes ? comment.likes.map(like => like.user.toString()) : [],
    dislikes: comment.dislikes ? comment.dislikes.map(dislike => dislike.user.toString()) : [],
    replyCount: comment.replies ? comment.replies.length : 0,
    replies: comment.replies ? comment.replies.map(reply => formatReply(reply, currentUserId)) : []
  };
}

function formatReply(reply, currentUserId = null) {
  const replyObj = reply.toObject ? reply.toObject() : reply;
  return {
    _id: replyObj._id,
    user: replyObj.user,
    text: replyObj.text,
    createdAt: replyObj.createdAt,
    likes: reply.likes ? reply.likes.map(like => like.user.toString()) : [],
    dislikes: reply.dislikes ? reply.dislikes.map(dislike => dislike.user.toString()) : []
  };
}

/**
 * GET /api/v1/posts/:id/comments
 * Get comments for a post or short
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short
      const comments = await ShortComment.find({ short: id, isDeleted: false })
        .populate('user', 'companyName avatar firstName lastName name')
        .populate('replies.user', 'companyName avatar firstName lastName name')
        .sort({ createdAt: -1 });

      const formattedComments = comments.map(comment => {
        const formatted = formatComment(comment, req.user?._id);
        // Ensure user has name field for frontend compatibility
        if (formatted.user && !formatted.user.name) {
          formatted.user.name = formatted.user.companyName || 
            `${formatted.user.firstName || ''} ${formatted.user.lastName || ''}`.trim() || 
            'مستخدم';
        }
        return formatted;
      });

      return res.json(formattedComments);
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post.comments);
  } catch (err) {
    console.error('Error fetching comments:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * POST /api/v1/posts/:id/comment
 * Add a comment to a post or short
 */
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'نص التعليق مطلوب' });
    }

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short
      const short = await Short.findById(id);
      if (!short) {
        return res.status(404).json({ message: 'الشورت غير موجود' });
      }

      const comment = await ShortComment.create({
        short: id,
        user: req.user._id,
        text: text.trim()
      });

      // Update comment count
      await Short.findByIdAndUpdate(id, { $inc: { comments: 1 } });

      // Populate and return
      const populatedComment = await comment.populate('user', 'companyName avatar firstName lastName name');
      const formatted = formatComment(populatedComment, req.user._id);
      
      // Ensure user has name field
      if (formatted.user && !formatted.user.name) {
        formatted.user.name = formatted.user.companyName || 
          `${formatted.user.firstName || ''} ${formatted.user.lastName || ''}`.trim() || 
          'مستخدم';
      }

      return res.status(201).json(formatted);
    }

    // Handle as Post (original logic - simplified version)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const newComment = {
      user: req.user._id,
      text: text.trim()
    };

    post.comments.unshift(newComment);
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("comments.user", "name avatar");

    res.json(updatedPost.comments[0]);
  } catch (err) {
    console.error('Error adding comment:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * PUT /api/v1/posts/:id/comment/:comment_id/like
 * Like/unlike a comment
 */
router.put("/:id/comment/:comment_id/like", protect, async (req, res) => {
  try {
    const { id, comment_id } = req.params;
    console.log('[LIKE] Request received:', { id, comment_id, userId: req.user?._id });

    // Check if this is a Short
    const shortCheck = await isShort(id);
    console.log('[LIKE] Is Short?', shortCheck);
    
    if (shortCheck) {
      // Handle as Short Comment
      const comment = await ShortComment.findById(comment_id);
      console.log('[LIKE] Comment found?', !!comment);
      
      if (!comment) {
        console.log('[LIKE] Comment not found!');
        return res.status(404).json({ message: 'التعليق غير موجود' });
      }
      
      console.log('[LIKE] Comment likes before:', comment.likes.length);

      // Toggle like
      const existingLike = comment.likes.find(like => like.user.toString() === req.user._id.toString());
      
      if (existingLike) {
        // Remove like
        comment.likes = comment.likes.filter(like => like.user.toString() !== req.user._id.toString());
      } else {
        // Add like
        comment.likes.push({ user: req.user._id });
        
        // Remove dislike if exists
        if (comment.dislikes && Array.isArray(comment.dislikes)) {
          comment.dislikes = comment.dislikes.filter(dislike => dislike.user.toString() !== req.user._id.toString());
        }
      }
      
      await comment.save();
      console.log('[LIKE] Comment likes after:', comment.likes.length);
      console.log('[LIKE] Success! Returning response');

      return res.json({
        success: true,
        likesCount: comment.likes.length,
        dislikesCount: comment.dislikes ? comment.dislikes.length : 0
      });
    }

    // Handle as Post (original logic - simplified)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    // Toggle like
    const likeIndex = comment.likes.findIndex(like => like.user.toString() === req.user._id.toString());
    
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push({ user: req.user._id });
      
      // Remove dislike if exists
      const dislikeIndex = comment.dislikes.findIndex(dislike => dislike.user.toString() === req.user._id.toString());
      if (dislikeIndex > -1) {
        comment.dislikes.splice(dislikeIndex, 1);
      }
    }

    await post.save();
    res.json(comment);
  } catch (err) {
    console.error('Error liking comment:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * DELETE /api/v1/posts/:id/comment/:comment_id
 * Delete a comment
 */
router.delete("/:id/comment/:comment_id", protect, async (req, res) => {
  try {
    const { id, comment_id } = req.params;

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short Comment
      const comment = await ShortComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: 'التعليق غير موجود' });
      }

      // Check ownership
      if (comment.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'لا يمكنك حذف تعليق شخص آخر' });
      }

      // Update comment count
      await Short.findByIdAndUpdate(id, { $inc: { comments: -1 } });

      // Soft delete
      comment.isDeleted = true;
      await comment.save();

      return res.json({
        success: true,
        message: 'تم حذف التعليق بنجاح'
      });
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    comment.remove();
    await post.save();

    res.json({ msg: "Comment removed" });
  } catch (err) {
    console.error('Error deleting comment:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * POST /api/v1/posts/:id/comment/:comment_id/reply
 * Add a reply to a comment
 */
router.post("/:id/comment/:comment_id/reply", protect, async (req, res) => {
  try {
    const { id, comment_id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'نص الرد مطلوب' });
    }

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short Comment
      const comment = await ShortComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: 'التعليق غير موجود' });
      }

      // Add reply
      const reply = {
        user: req.user._id,
        text: text.trim()
      };

      comment.replies.push(reply);
      await comment.save();

      // Populate and return updated comment
      const updatedComment = await ShortComment.findById(comment_id)
        .populate('user', 'companyName avatar firstName lastName name')
        .populate('replies.user', 'companyName avatar firstName lastName name');

      const formatted = formatComment(updatedComment, req.user._id);
      
      // Ensure user names are set
      if (formatted.user && !formatted.user.name) {
        formatted.user.name = formatted.user.companyName || 
          `${formatted.user.firstName || ''} ${formatted.user.lastName || ''}`.trim() || 
          'مستخدم';
      }
      
      formatted.replies.forEach(reply => {
        if (reply.user && !reply.user.name) {
          reply.user.name = reply.user.companyName || 
            `${reply.user.firstName || ''} ${reply.user.lastName || ''}`.trim() || 
            'مستخدم';
        }
      });

      return res.status(201).json(formatted);
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const newReply = {
      user: req.user._id,
      text: text.trim()
    };

    comment.replies.push(newReply);
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("comments.replies.user", "name avatar");

    const updatedComment = updatedPost.comments.id(comment_id);
    res.json(updatedComment);
  } catch (err) {
    console.error('Error adding reply:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * PUT /api/v1/posts/:id/comment/:comment_id/reply/:reply_id/like
 * Like/unlike a reply
 */
router.put("/:id/comment/:comment_id/reply/:reply_id/like", protect, async (req, res) => {
  try {
    const { id, comment_id, reply_id } = req.params;

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short Comment Reply
      const comment = await ShortComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: 'التعليق غير موجود' });
      }

      const reply = comment.replies.id(reply_id);
      if (!reply) {
        return res.status(404).json({ message: 'الرد غير موجود' });
      }

      // Toggle like
      const existingLike = reply.likes.find(like => like.user.toString() === req.user._id.toString());
      
      if (existingLike) {
        // Remove like
        reply.likes = reply.likes.filter(like => like.user.toString() !== req.user._id.toString());
      } else {
        // Add like
        reply.likes.push({ user: req.user._id });
        
        // Remove dislike if exists
        if (reply.dislikes && Array.isArray(reply.dislikes)) {
          reply.dislikes = reply.dislikes.filter(dislike => dislike.user.toString() !== req.user._id.toString());
        }
      }

      await comment.save();

      return res.json({
        success: true,
        likesCount: reply.likes.length,
        dislikesCount: reply.dislikes ? reply.dislikes.length : 0
      });
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    // Toggle like
    const likeIndex = reply.likes.findIndex(like => like.user.toString() === req.user._id.toString());
    
    if (likeIndex > -1) {
      reply.likes.splice(likeIndex, 1);
    } else {
      reply.likes.push({ user: req.user._id });
      
      // Remove dislike if exists
      const dislikeIndex = reply.dislikes.findIndex(dislike => dislike.user.toString() === req.user._id.toString());
      if (dislikeIndex > -1) {
        reply.dislikes.splice(dislikeIndex, 1);
      }
    }

    await post.save();
    res.json(reply);
  } catch (err) {
    console.error('Error liking reply:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * DELETE /api/v1/posts/:id/comment/:comment_id/reply/:reply_id
 * Delete a reply
 */
router.delete("/:id/comment/:comment_id/reply/:reply_id", protect, async (req, res) => {
  try {
    const { id, comment_id, reply_id } = req.params;

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short Comment Reply
      const comment = await ShortComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: 'التعليق غير موجود' });
      }

      const reply = comment.replies.id(reply_id);
      if (!reply) {
        return res.status(404).json({ message: 'الرد غير موجود' });
      }

      // Check ownership
      if (reply.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'لا يمكنك حذف رد شخص آخر' });
      }

      reply.remove();
      await comment.save();

      return res.json({
        success: true,
        message: 'تم حذف الرد بنجاح'
      });
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    // Check ownership
    if (reply.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    reply.remove();
    await post.save();

    res.json({ msg: "Reply removed" });
  } catch (err) {
    console.error('Error deleting reply:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * GET /api/v1/posts/:id
 * Get a single post or short by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short
      const short = await Short.findById(id)
        .populate('user', 'companyName avatar firstName lastName name')
        .populate('repostedBy.user', 'companyName avatar firstName lastName name');

      if (!short) {
        return res.status(404).json({ message: 'الشورت غير موجود' });
      }

      // Format the short data to match frontend expectations
      const shortObj = short.toObject();
      const userView = short.viewedBy.find(v => v.user.toString() === req.user?._id?.toString());
      const isReposted = short.repostedBy.some(r => r.user._id.toString() === req.user?._id?.toString());
      
      const reposters = short.repostedBy.map(r => ({
        _id: r.user._id,
        name: r.user.companyName || `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
        avatar: r.user.avatar,
        repostedAt: r.repostedAt
      }));

      // Ensure user has name field
      if (shortObj.user && !shortObj.user.name) {
        shortObj.user.name = shortObj.user.companyName || 
          `${shortObj.user.firstName || ''} ${shortObj.user.lastName || ''}`.trim() || 
          'مستخدم';
      }
      
      const formattedShort = {
        ...shortObj,
        isLiked: userView?.liked || false,
        shortCommentCount: shortObj.comments || 0,
        commentCount: shortObj.comments || 0,
        isReposted: isReposted,
        repostCount: shortObj.shares || 0,
        reposters: reposters,
        visibility: shortObj.visibility || 'everyone',
        allowComments: shortObj.allowComments !== false,
        allowDownload: shortObj.allowDownload !== false,
        allowDuet: shortObj.allowDuet !== false,
        contactNumbers: shortObj.contactNumbers || [],
        hashtags: shortObj.hashtags || [],
        viewedBy: undefined,
        repostedBy: undefined
      };

      return res.json(formattedShort);
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id)
      .populate("user", "name avatar");

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error('Error fetching post/short:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * POST /api/v1/posts/:id/react
 * React to a post or short (like)
 */
router.post("/:id/react", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;
    
    // حالياً ندعم فقط 'like'
    if (reactionType !== 'like') {
      return res.status(400).json({
        success: false,
        message: 'نوع التفاعل غير مدعوم'
      });
    }

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short
      const short = await Short.findById(id);
      
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

      // Return format matching frontend expectations
      return res.json({
        _id: short._id,
        likes: short.likes,
        isLiked: liked,
        success: true
      });
    }

    // Handle as Post (if needed)
    return res.status(400).json({
      success: false,
      message: 'Post reactions not implemented yet'
    });
    
  } catch (error) {
    console.error('خطأ في التفاعل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التفاعل'
    });
  }
});

module.exports = router;
