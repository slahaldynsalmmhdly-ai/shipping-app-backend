const express = require('express');
const router = express.Router();
const Short = require('../models/Short');
const ShortComment = require('../models/ShortComment');
const ShortInteraction = require('../models/ShortInteraction');
const Post = require('../models/Post');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { generateNotificationMessage } = require('../utils/notificationHelper');
const Hashtag = require('../models/Hashtag');
const { extractHashtags, extractMentionIds } = require('../utils/textHelpers');
const { createFollowingPostNotifications, createMentionNotifications } = require('../utils/notificationHelpers');

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
 * GET /api/v1/posts
 * Get all posts with filtering (category, postType, etc.)
 */
router.get("/", protect, async (req, res) => {
  try {
    const { userType, limit, skip, category, postType, country, city } = req.query;
    
    // إذا كان category أو postType أو userType محدد، نستخدم فلترة بسيطة بدون خوارزمية
    if (category || postType || userType) {
      // بناء مصفوفة الشروط
      const conditions = [];
      
      // 1. شرط النشر (إلزامي)
      conditions.push({ $or: [{ isPublished: true }, { isPublished: { $exists: false } }] });
      
      // 2. شرط userType
      if (userType) {
        const users = await User.find({ userType: userType }).select('_id');
        const userIds = users.map(u => u._id);
        conditions.push({ user: { $in: userIds } });
      }
      
      // 3. شرط category
      if (category) {
        conditions.push({ category: category });
      } else {
        conditions.push({ publishScope: { $ne: 'category_only' } });
      }
      
      // 4. شرط postType
      if (postType) {
        conditions.push({ postType: postType });
      }
      
      // 5. فلترة حسب الموقع (country/city)
      const filterCountry = country === '' ? null : country;
      const filterCity = city === '' ? null : city;
      
      if (filterCountry && filterCountry !== 'عالمي') {
        if (filterCity) {
          conditions.push({
            $or: [
              { country: filterCountry, city: filterCity },
              { country: filterCountry, $or: [{ city: null }, { city: { $exists: false } }] },
              { $or: [{ country: null }, { country: { $exists: false } }] }
            ]
          });
        } else {
          conditions.push({
            $or: [
              { country: filterCountry },
              { $or: [{ country: null }, { country: { $exists: false } }] }
            ]
          });
        }
      }
      
      // 6. بناء الاستعلام النهائي
      const query = { $and: conditions };
      
      console.log('\n🔍 استعلام المنشورات:', JSON.stringify(query, null, 2));
      console.log('📍 المعاملات:', { category, postType, country, city, userType });
      
      const posts = await Post.find(query)
        .populate('user', 'name avatar userType companyName')
        .populate('reactions.user', 'name avatar')
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(parseInt(limit) || 10)
        .skip(parseInt(skip) || 0);
      
      console.log('✅ عدد النتائج:', posts.length);
      
      return res.json({ posts });
    }
    
    // الخوارزمية العادية للصفحة الرئيسية (بدون فلترة)
    const allPosts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      publishScope: { $ne: 'category_only' }
    })
      .populate('user', 'name avatar userType companyName')
      .populate('reactions.user', 'name avatar')
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(parseInt(limit) || 20)
      .skip(parseInt(skip) || 0);
    
    return res.json(allPosts);
  } catch (err) {
    console.error('Error in GET /api/v1/posts:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * POST /api/v1/posts
 * Create a new post
 */
router.post("/", protect, async (req, res) => {
  try {
    const { text, media, scheduledTime, hashtags, mentions, category, postType, scope, contactPhone, contactEmail, contactMethods, isHighlighted, publishScope, country, city, isShort, title, privacy, allowComments, allowDownload, allowDuet, location, thumbnail } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // استخراج الهاشتاقات والإشارات
    const extractedHashtags = text ? extractHashtags(text) : [];
    const extractedMentions = text ? extractMentionIds(text) : [];
    const finalHashtags = [...new Set([...extractedHashtags, ...(hashtags || [])])];
    
    // تحديث الهاشتاقات
    for (const tag of finalHashtags) {
      await Hashtag.findOneAndUpdate(
        { tag: tag.toLowerCase() },
        { 
          $inc: { count: 1 },
          $set: { lastUsed: new Date() }
        },
        { upsert: true, new: true }
      );
    }
    const finalMentions = [...new Set([...extractedMentions, ...(mentions || [])])];

    const newPost = new Post({
      user: req.user._id,
      text,
      media: media || [],
      scheduledTime: scheduledTime || null,
      isPublished: scheduledTime ? false : true,
      hashtags: finalHashtags,
      mentions: finalMentions,
      category: category || null,
      postType: postType || null,
      scope: scope || 'global',
      country: country || null,
      city: city || null,
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      contactMethods: contactMethods || [],
      isFeatured: isHighlighted || false,
      publishScope: publishScope || 'home_and_category',
      isShort: isShort || false,
      title: title || '',
      privacy: privacy || 'public',
      allowComments: allowComments !== undefined ? allowComments : true,
      allowDownload: allowDownload !== undefined ? allowDownload : true,
      allowDuet: allowDuet !== undefined ? allowDuet : true,
      location: location || '',
      thumbnail: thumbnail || null
    });

    const post = await newPost.save();
    
    // إخفاء المنشور من صاحبه في الصفحة الرئيسية
    if (!scheduledTime) {
      post.hiddenFromHomeFeedFor.push(req.user._id);
      await post.save();
    }
    
    // إرسال إشعارات
    if (!scheduledTime) {
      try {
        await createFollowingPostNotifications(req.user._id, post._id, 'post', 0);
      } catch (notifError) {
        console.error('خطأ في إرسال الإشعارات:', notifError);
      }
      
      if (finalMentions && finalMentions.length > 0) {
        try {
          await createMentionNotifications(req.user._id, finalMentions, post._id, 'post');
        } catch (mentionError) {
          console.error('خطأ في إرسال إشعارات الإشارات:', mentionError);
        }
      }
    }
    
    console.log('✅ تم إنشاء منشور جديد:', post._id);
    res.status(201).json(post);
  } catch (err) {
    console.error('Error in POST /api/v1/posts:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

/**
 * GET /api/v1/posts/:id
 * Get a single post or short by ID
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short
      const short = await Short.findById(id)
        .populate('user', 'companyName avatar firstName lastName name')
        .populate('hashtags');

      if (!short) {
        return res.status(404).json({ message: 'الشورت غير موجود' });
      }

      // Format user name for frontend compatibility
      const shortObj = short.toObject();
      if (shortObj.user && !shortObj.user.name) {
        shortObj.user.name = shortObj.user.companyName || 
          `${shortObj.user.firstName || ''} ${shortObj.user.lastName || ''}`.trim() || 
          'مستخدم';
      }

      return res.json(shortObj);
    }

    // Handle as Post
    const post = await Post.findById(id)
      .populate("user", ["name", "avatar"])
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "name avatar"
        }
      })
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

    res.json(post);
  } catch (err) {
    console.error('Error fetching post/short:', err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/**
 * PUT /api/v1/posts/:id/react
 * Add/Remove a reaction to a post or short
 */
router.put("/:id/react", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;

    if (!reactionType || !['like'].includes(reactionType)) {
      return res.status(400).json({ msg: "Invalid reaction type" });
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

      // Update interaction record
      let interaction = await ShortInteraction.findOne({
        user: req.user._id,
        short: short._id
      });

      let liked = false;

      if (interaction) {
        // Toggle like state
        interaction.liked = !interaction.liked;
        liked = interaction.liked;
        interaction.calculateInterestScore();
        await interaction.save();
      } else {
        // Create new interaction with like
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

      // Find the view
      const view = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());

      if (view) {
        if (view.liked) {
          // Unlike
          view.liked = false;
          short.likes = Math.max(0, short.likes - 1);
        } else {
          // Like
          view.liked = true;
          short.likes += 1;
        }
      } else {
        // Add new view with like
        short.viewedBy.push({
          user: req.user._id,
          liked: true,
          watchDuration: 0
        });
        short.likes += 1;
        short.views += 1;
      }

      await short.save();

      return res.json({
        success: true,
        liked: liked,
        likes: short.likes,
        reactions: [{ user: req.user._id, type: 'like' }] // For frontend compatibility
      });
    }

    // Handle as Post (original logic)
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Check if the user has already reacted
    const existingReactionIndex = post.reactions.findIndex(
      (reaction) => reaction.user.toString() === req.user._id
    );

    if (existingReactionIndex > -1) {
      // User has already reacted, check if it's the same reaction type
      if (post.reactions[existingReactionIndex].type === reactionType) {
        // Same reaction type, remove it (toggle off)
        post.reactions.splice(existingReactionIndex, 1);

        // Remove notification for the post owner
        if (post.user.toString() !== req.user._id) {
          const postOwner = await User.findById(post.user);
          if (postOwner) {
            postOwner.notifications = postOwner.notifications.filter(
              (notif) =>
                !(notif.type === 'like' &&
                  notif.sender.toString() === req.user._id &&
                  notif.post.toString() === post._id.toString())
            );
            await postOwner.save();
          }
        }
      } else {
        // Different reaction type, update it
        post.reactions[existingReactionIndex].type = reactionType;
      }
    } else {
      // User has not reacted, add new reaction
      post.reactions.unshift({ user: req.user._id, type: reactionType });

      // Create notification for the post owner if not self-liking
      if (post.user.toString() !== req.user._id) {
        const sender = await User.findById(req.user._id).select('name');
        const postOwner = await User.findById(post.user);
        if (postOwner && sender) {
          postOwner.notifications.unshift({
            type: 'like',
            sender: req.user._id,
            post: post._id,
            message: generateNotificationMessage('like', sender.name)
          });
          await postOwner.save();
        }
      }
    }

    post.markModified("reactions");
    await post.save();
    
    const updatedPost = await Post.findById(id)
      .populate('user', ['name', 'avatar'])
      .populate('reactions.user', ['name', 'avatar'])
      .populate({
        path: 'comments.user',
        select: 'name avatar'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'name avatar'
      });

    // Add id for frontend compatibility
    const postWithId = {
      ...updatedPost.toObject(),
      id: updatedPost._id.toString()
    };

    res.json(postWithId);
  } catch (err) {
    console.error('Error reacting to post/short:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

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
      text: text.trim(),
    };

    post.comments.unshift(newComment);
    post.markModified("comments");
    await post.save();

    // Create notification for the post owner if not self-commenting
    if (post.user.toString() !== req.user._id.toString()) {
      const sender = await User.findById(req.user._id).select('name');
      const postOwner = await User.findById(post.user);
      if (postOwner && sender) {
        postOwner.notifications.unshift({
          type: 'comment',
          sender: req.user._id,
          post: post._id,
          commentId: post.comments[0]._id,
          message: generateNotificationMessage('comment', sender.name)
        });
        await postOwner.save();
      }
    }

    const updatedPost = await Post.findById(id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    res.status(201).json(updatedPost.comments[0]);
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

    // Check if this is a Short
    if (await isShort(id)) {
      // Handle as Short Comment
      const comment = await ShortComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: 'التعليق غير موجود' });
      }

      // Check if already liked
      const existingLike = comment.likes.find(like => like.user.toString() === req.user._id.toString());
      
      if (existingLike) {
        // Remove like (toggle)
        comment.likes = comment.likes.filter(like => like.user.toString() !== req.user._id.toString());
      } else {
        // Add like
        comment.likes.push({ user: req.user._id });
      }
      
      await comment.save();

      return res.json({
        success: true,
        likesCount: comment.likes.length
      });
    }

    // Handle as Post Comment
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const alreadyLiked = comment.likes.some(like => like.user.toString() === req.user._id);
    const alreadyDisliked = comment.dislikes.some(dislike => dislike.user.toString() === req.user._id);

    // If user has disliked, remove dislike
    if (alreadyDisliked) {
      comment.dislikes = comment.dislikes.filter(dislike => dislike.user.toString() !== req.user._id);
    }

    // If user has not liked, add like
    if (!alreadyLiked) {
      comment.likes.unshift({ user: req.user._id });
    } else {
      // If already liked, remove like (toggle)
      comment.likes = comment.likes.filter(like => like.user.toString() !== req.user._id);
    }

    post.markModified("comments");
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    res.json(updatedPost.comments.id(comment_id));
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
      await Short.findByIdAndUpdate(comment.short, { $inc: { comments: -1 } });

      // Delete comment
      comment.isDeleted = true;
      await comment.save();

      return res.json({
        success: true,
        message: 'تم حذف التعليق بنجاح'
      });
    }

    // Handle as Post Comment
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
      // Handle as Short Comment Reply
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

      // Get updated comment with populated data
      const updatedComment = await ShortComment.findById(comment_id)
        .populate('user', 'companyName avatar firstName lastName name')
        .populate('replies.user', 'companyName avatar firstName lastName name');

      const formatted = formatComment(updatedComment, req.user._id);
      
      // Ensure user has name field
      if (formatted.user && !formatted.user.name) {
        formatted.user.name = formatted.user.companyName || 
          `${formatted.user.firstName || ''} ${formatted.user.lastName || ''}`.trim() || 
          'مستخدم';
      }

      return res.status(201).json(formatted);
    }

    // Handle as Post Comment Reply
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
      text: text.trim(),
    };

    comment.replies.unshift(newReply);
    post.markModified("comments");
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    const updatedComment = updatedPost.comments.id(comment_id);
    res.status(201).json(updatedComment);
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

      // Check if already liked
      const existingLike = reply.likes.find(like => like.user.toString() === req.user._id.toString());
      
      if (existingLike) {
        // Remove like (toggle)
        reply.likes = reply.likes.filter(like => like.user.toString() !== req.user._id.toString());
      } else {
        // Add like
        reply.likes.push({ user: req.user._id });
      }
      
      await comment.save();

      return res.json({
        success: true,
        likesCount: reply.likes.length
      });
    }

    // Handle as Post Comment Reply
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

    const alreadyLiked = reply.likes.some(like => like.user.toString() === req.user._id);
    const alreadyDisliked = reply.dislikes.some(dislike => dislike.user.toString() === req.user._id);

    // If user has disliked, remove dislike
    if (alreadyDisliked) {
      reply.dislikes = reply.dislikes.filter(dislike => dislike.user.toString() !== req.user._id);
    }

    // If user has not liked, add like
    if (!alreadyLiked) {
      reply.likes.unshift({ user: req.user._id });
    } else {
      // If already liked, remove like (toggle)
      reply.likes = reply.likes.filter(like => like.user.toString() !== req.user._id);
    }

    post.markModified("comments");
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });

    const updatedComment = updatedPost.comments.id(comment_id);
    const updatedReply = updatedComment.replies.id(reply_id);
    res.json(updatedReply);
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

    // Handle as Post Comment Reply
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

module.exports = router;
