const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const User = require('../models/User'); // Assuming User model is needed for populating user info
// تم إزالة smartFeedAlgorithm (بطيء جداً) - نستخدم خوارزمية بسيطة وسريعة
const { createFollowingPostNotifications, createLikeNotification, createCommentNotification, generateNotificationMessage } = require('../utils/notificationHelper');
const { extractHashtags, extractMentionIds } = require('../utils/textParser');
const { createMentionNotifications } = require('../utils/mentionNotificationHelper');

// @desc    Create a new post
// @route   POST /api/v1/posts
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { text, media, scheduledTime, hashtags, mentions, category, postType, scope, contactPhone, contactEmail, contactMethods, isHighlighted, publishScope, country, city } = req.body;

    // Check if user exists (optional, but good for data integrity)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // استخراج الهاشتاقات والإشارات من النص
    const extractedHashtags = text ? extractHashtags(text) : [];
    const extractedMentions = text ? extractMentionIds(text) : [];
    
    // دمج الهاشتاقات والإشارات المستخرجة مع تلك المرسلة من الواجهة الأمامية
    const finalHashtags = [...new Set([...extractedHashtags, ...(hashtags || [])])];
    const finalMentions = [...new Set([...extractedMentions, ...(mentions || [])])];

    const newPost = new Post({
      user: req.user.id,
      text,
      media: media || [], // media should be an array of { url, type: 'image' | 'video' }
      scheduledTime: scheduledTime || null,
      isPublished: scheduledTime ? false : true, // If scheduled, not published yet
      hashtags: finalHashtags,
      mentions: finalMentions,
      category: category || null,
      postType: postType || null,
      scope: scope || 'global', // local or global
      country: country || null, // الدولة
      city: city || null, // المدينة
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      contactMethods: contactMethods || [],
      isFeatured: isHighlighted || false,
      publishScope: publishScope || 'home_and_category' // category_only or home_and_category
    });

    const post = await newPost.save();
    
    // إخفاء المنشور من صاحبه في الصفحة الرئيسية بعد النشر
    if (!scheduledTime) {
      post.hiddenFromHomeFeedFor.push(req.user.id);
      await post.save();
    }
    
    // إرسال إشعارات للمتابعين عند نشر منشور جديد
    if (!scheduledTime) { // فقط إذا كان المنشور منشور فوراً وليس مجدول
      try {
        // تم تعديل النظام: 100% إشعارات فقط - لا يظهر في الصفحة الرئيسية
        await createFollowingPostNotifications(req.user.id, post._id, 'post', 0);
      } catch (notifError) {
        console.error('خطأ في إرسال الإشعارات:', notifError);
        // لا نوقف العملية إذا فشل إرسال الإشعارات
      }
      
      // إرسال إشعارات للمستخدمين المشار إليهم
      if (finalMentions && finalMentions.length > 0) {
        try {
          await createMentionNotifications(req.user.id, finalMentions, post._id, 'post');
        } catch (mentionError) {
          console.error('خطأ في إرسال إشعارات الإشارات:', mentionError);
        }
      }
    }
    
    res.status(201).json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get all posts by a specific user
// @route   GET /api/v1/posts/user/:userId
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const posts = await Post.find({ 
      user: req.params.userId, 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }] 
    })
      .sort({ createdAt: -1 })
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get all posts (with Facebook-style algorithm)
// @route   GET /api/v1/posts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { userType, limit, skip, category, postType, country, city } = req.query;
    
    // إذا كان category أو postType أو userType محدد، نستخدم فلترة بسيطة بدون خوارزمية
    if (category || postType || userType) {
      const users = await User.find({ userType: userType }).select('_id');
      const userIds = users.map(u => u._id);
      
      let query = {
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      };
      
      if (userType) {
        query.user = { $in: userIds };
      }
      
      if (category) {
        query.category = category;
        // إذا كان الفلتر حسب الفئة، نعرض كل المنشورات في هذه الفئة
        // (سواء category_only أو home_and_category)
      } else {
        // إذا لم يكن هناك فلتر فئة، نعرض فقط المنشورات التي يجب أن تظهر في الصفحة الرئيسية
        query.publishScope = { $ne: 'category_only' };
      }
      
      if (postType) {
        query.postType = postType;
      }
      
      // فلترة حسب الموقع والنطاق (scope)
      if (country && country !== 'عالمي') {
        // المستخدم اختار دولة محددة - نعرض فقط المنشورات المحلية في هذه الدولة
        query.scope = 'local';
        query.country = country;
        
        if (city) {
          // إذا كانت المدينة محددة: منشورات نفس المدينة + منشورات الدولة بدون مدينة
          query.$or = [
            { city: city },
            { city: null },
            { city: { $exists: false } }
          ];
        }
      } else {
        // المستخدم اختار 'عالمي' - نعرض فقط المنشورات العالمية
        // المنشورات القديمة بدون scope أو بدون country تعتبر عالمية
        query.$or = [
          { scope: 'global' },
          { scope: { $exists: false }, country: null },
          { scope: { $exists: false }, country: { $exists: false } }
        ];
      }
      
      // طباعة الاستعلام للتحقق من الفلترة
      console.log('\n🔍 استعلام المنشورات:', JSON.stringify(query, null, 2));
      console.log('📍 المعاملات:', { category, postType, country, city, userType });
      
      const posts = await Post.find(query)
        .populate('user', 'name avatar userType companyName')
        .populate('reactions.user', 'name avatar')
        .sort({ isFeatured: -1, createdAt: -1 }) // المنشورات المميزة أولاً
        .limit(parseInt(limit) || 10)
        .skip(parseInt(skip) || 0);
      
      console.log('✅ عدد النتائج:', posts.length);
      if (posts.length > 0) {
        console.log('📝 أول منشور:', {
          text: posts[0].text?.substring(0, 50),
          category: posts[0].category,
          scope: posts[0].scope,
          country: posts[0].country,
          city: posts[0].city
        });
      }
      
      return res.json({ posts });
    }
    
    // الخوارزمية العادية للصفحة الرئيسية
    const currentUser = await User.findById(req.user.id).select('following notifications').lean();
    const following = currentUser?.following || [];
    const notifications = currentUser?.notifications || [];

    // Find all published posts, excluding those hidden from current user's home feed
    // وفقط المنشورات التي يجب أن تظهر في الصفحة الرئيسية
    const allPosts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id },
      publishScope: { $ne: 'category_only' } // إخفاء المنشورات التي فقط للفئة
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

    // تم تعديل النظام: منشورات المتابعين لا تظهر في الصفحة الرئيسية أبداً (100% إشعارات فقط)
    const filteredPosts = [];
    
    for (const post of allPosts) {
      // إخفاء منشورات المتابعين تماماً (100% إشعارات فقط)
      const isFollowing = following.some(id => id.toString() === post.user._id.toString());
      
      if (isFollowing) {
        // منشورات المتابعين لا تظهر في الصفحة الرئيسية أبداً
        continue;
      }
      
      // غير المتابعين فقط: يظهر في الصفحة الرئيسية
      filteredPosts.push(post);
    }

    // توزيع 100%: منشور واحد فقط من كل مستخدم (مثل Facebook)
    const userPostsMap = new Map();
    filteredPosts.forEach(post => {
      const userId = post.user._id.toString();
      if (!userPostsMap.has(userId)) {
        userPostsMap.set(userId, []);
      }
      userPostsMap.get(userId).push(post);
    });
    
    // أخذ أحدث منشور من كل مستخدم
    const distributedPosts = [];
    userPostsMap.forEach((userPosts) => {
      // ترتيب حسب التاريخ (الأحدث أولاً)
      userPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // أخذ الأحدث فقط
      distributedPosts.push(userPosts[0]);
    });
    
    // ترتيب بسيط وسريع حسب التفاعلات والوقت (بدون AI)
    const sortedPosts = distributedPosts.sort((a, b) => {
      // المنشورات المميزة تظهر أولاً دائماً
      const aFeatured = a.isFeatured && (!a.featuredUntil || new Date(a.featuredUntil) > new Date());
      const bFeatured = b.isFeatured && (!b.featuredUntil || new Date(b.featuredUntil) > new Date());
      
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      
      // إذا كلاهما مميز أو كلاهما غير مميز، نرتب حسب التفاعل
      const engagementA = (a.reactions?.length || 0) * 2 + (a.comments?.length || 0) * 3;
      const engagementB = (b.reactions?.length || 0) * 2 + (b.comments?.length || 0) * 3;
      
      // ترتيب حسب التفاعل أولاً، ثم حسب الوقت
      if (Math.abs(engagementB - engagementA) > 5) {
        return engagementB - engagementA;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(sortedPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Add/Remove a reaction to a post
// @route   PUT /api/v1/posts/:id/react
// @access  Private
router.put("/:id/react", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const { reactionType } = req.body;
    if (!reactionType || !['like'].includes(reactionType)) {
      return res.status(400).json({ msg: "Invalid reaction type" });
    }

    // Check if the user has already reacted
    const existingReactionIndex = post.reactions.findIndex(
      (reaction) => reaction.user.toString() === req.user.id
    );

    if (existingReactionIndex > -1) {
      // User has already reacted, check if it's the same reaction type
      if (post.reactions[existingReactionIndex].type === reactionType) {
        // Same reaction type, remove it (toggle off)
        post.reactions.splice(existingReactionIndex, 1);

        // Remove notification for the post owner
        if (post.user.toString() !== req.user.id) {
          const postOwner = await User.findById(post.user);
          if (postOwner) {
            postOwner.notifications = postOwner.notifications.filter(
              (notif) =>
                !(notif.type === 'like' &&
                  notif.sender.toString() === req.user.id &&
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
        post.reactions.unshift({ user: req.user.id, type: reactionType });

        // Create notification for the post owner if not self-liking
        if (post.user.toString() !== req.user.id) {
          const sender = await User.findById(req.user.id).select('name');
          const postOwner = await User.findById(post.user);
          if (postOwner && sender) {
            postOwner.notifications.unshift({
              type: 'like',
              sender: req.user.id,
              post: post._id,
              message: generateNotificationMessage('like', sender.name)
            });
            await postOwner.save();
          }
        }
    }

    post.markModified("reactions");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
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
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get comments for a post
// @route   GET /api/v1/posts/:id/comments
// @access  Public
router.get("/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
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
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Add a comment to a post
// @route   POST /api/v1/posts/:id/comment
// @access  Private
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const post = await Post.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
    };

    post.comments.unshift(newComment);
    post.markModified("comments");
    await post.save();

    // Create notification for the post owner if not self-commenting
    if (post.user.toString() !== req.user.id) {
      const sender = await User.findById(req.user.id).select('name');
      const postOwner = await User.findById(post.user);
      if (postOwner && sender) {
        postOwner.notifications.unshift({
          type: 'comment',
          sender: req.user.id,
          post: post._id,
          commentId: post.comments[0]._id,
          message: generateNotificationMessage('comment', sender.name)
        });
        await postOwner.save();
      }
    }
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a comment from a post
// @route   DELETE /api/v1/posts/:id/comment/:comment_id
// @access  Private
router.delete("/:id/comment/:comment_id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Pull out comment
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exist" });
    }

    // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Get remove index
    const removeIndex = post.comments
      .map((comment) => comment._id.toString())
      .indexOf(req.params.comment_id);

    post.comments.splice(removeIndex, 1);

    // Remove notification for the post owner if comment was deleted
    if (post.user.toString() !== req.user.id) {
      const postOwner = await User.findById(post.user);
      if (postOwner) {
        postOwner.notifications = postOwner.notifications.filter(
          (notif) =>
            !(notif.type === 'comment' &&
              notif.sender.toString() === req.user.id &&
              notif.post.toString() === post._id.toString() &&
              notif.commentId.toString() === comment._id.toString())
        );
        await postOwner.save();
      }
    }

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Like a comment
// @route   PUT /api/v1/posts/:id/comment/:comment_id/like
// @access  Private
router.put("/:id/comment/:comment_id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const alreadyLiked = comment.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = comment.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has disliked, remove dislike
    if (alreadyDisliked) {
      comment.dislikes = comment.dislikes.filter(dislike => dislike.user.toString() !== req.user.id);
    }

    // If user has not liked, add like
    if (!alreadyLiked) {
      comment.likes.unshift({ user: req.user.id });

      // Create notification for the comment owner if not self-liking
      if (comment.user.toString() !== req.user.id) {
        const sender = await User.findById(req.user.id).select('name');
        const commentOwner = await User.findById(comment.user);
        if (commentOwner && sender) {
          commentOwner.notifications.unshift({
            type: 'comment_like',
            sender: req.user.id,
            post: post._id,
            commentId: comment._id,
            message: generateNotificationMessage('comment_like', sender.name)
          });
          await commentOwner.save();
        }
      }
    }
    // If already liked, do nothing (no toggle)

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Reply to a comment
// @route   POST /api/v1/posts/:id/comment/:comment_id/reply
// @access  Private
router.post("/:id/comment/:comment_id/reply", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const post = await Post.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const newReply = {
      user: req.user.id,
      text: req.body.text,
    };

    comment.replies.unshift(newReply);
    post.markModified("comments");
    await post.save();

    // Create notification for the comment owner if not self-replying
    if (comment.user.toString() !== req.user.id) {
      const sender = await User.findById(req.user.id).select('name');
      const commentOwner = await User.findById(comment.user);
      if (commentOwner && sender) {
        commentOwner.notifications.unshift({
          type: 'reply',
          sender: req.user.id,
          post: post._id,
          commentId: comment._id,
          replyId: comment.replies[0]._id,
          message: generateNotificationMessage('reply', sender.name)
        });
        await commentOwner.save();
      }
    }
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Like a reply
// @route   PUT /api/v1/posts/:id/comment/:comment_id/reply/:reply_id/like
// @access  Private
router.put("/:id/comment/:comment_id/reply/:reply_id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    const alreadyLiked = reply.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = reply.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has disliked, remove dislike
    if (alreadyDisliked) {
      reply.dislikes = reply.dislikes.filter(dislike => dislike.user.toString() !== req.user.id);
    }

    // If user has not liked, add like
    if (!alreadyLiked) {
      reply.likes.unshift({ user: req.user.id });

      // Create notification for the reply owner if not self-liking
      if (reply.user.toString() !== req.user.id) {
        const sender = await User.findById(req.user.id).select('name');
        const replyOwner = await User.findById(reply.user);
        if (replyOwner && sender) {
          replyOwner.notifications.unshift({
            type: 'reply_like',
            sender: req.user.id,
            post: post._id,
            commentId: comment._id,
            replyId: reply._id,
            message: generateNotificationMessage('reply_like', sender.name)
          });
          await replyOwner.save();
        }
      }
    }
    // If already liked, do nothing (no toggle)

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Delete a reply from a comment
// @route   DELETE /api/v1/posts/:id/comment/:comment_id/reply/:reply_id
// @access  Private
router.delete("/:id/comment/:comment_id/reply/:reply_id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) {
      return res.status(404).json({ msg: "Reply not found" });
    }

    // Check user
    if (reply.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    comment.replies = comment.replies.filter(
      (r) => r._id.toString() !== req.params.reply_id
    );

    // Remove notification for the comment owner if reply was deleted
    // Remove notification for the comment owner if reply was deleted
    // This check ensures we only remove notifications if the reply was not from the comment owner themselves
    if (comment.user.toString() !== req.user.id) {
      const commentOwner = await User.findById(comment.user);
      if (commentOwner) {
        commentOwner.notifications = commentOwner.notifications.filter(
          (notif) =>
            !(notif.type === 'reply' &&
              notif.sender.toString() === req.user.id &&
              notif.post && notif.post.toString() === post._id.toString() &&
              notif.commentId && notif.commentId.toString() === comment._id.toString() &&
              notif.replyId && notif.replyId.toString() === reply._id.toString())
        );
        await commentOwner.save();
      }
    }

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({
        path: "comments.user",
        select: "name avatar"
      })
      .populate({
        path: "comments.replies.user",
        select: "name avatar"
      });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Delete a post
// @route   DELETE /api/v1/posts/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Check user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await post.deleteOne(); // Use deleteOne() instead of remove()

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get post by ID
// @route   GET /api/v1/posts/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
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
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Repost a post, shipment ad, or empty truck ad
// @route   POST /api/v1/posts/repost
// @access  Private
router.post("/repost", protect, async (req, res) => {
  try {
    const { text, originalPostId, originalPostType } = req.body;

    // Validate required fields
    if (!originalPostId || !originalPostType) {
      return res.status(400).json({ msg: "Original post ID and type are required" });
    }

    // Validate originalPostType
    const validTypes = ["post", "shipmentAd", "emptyTruckAd"];
    if (!validTypes.includes(originalPostType)) {
      return res.status(400).json({ msg: "Invalid original post type" });
    }

    // Map the type to the model name
    const modelMap = {
      "post": "Post",
      "shipmentAd": "ShipmentAd",
      "emptyTruckAd": "EmptyTruckAd"
    };
    const modelName = modelMap[originalPostType];

    // Check if the original post exists
    const Model = mongoose.model(modelName);
    const originalPost = await Model.findById(originalPostId);
    if (!originalPost) {
      return res.status(404).json({ msg: "Original post not found" });
    }

    // Check if user has already reposted this content
    const existingRepost = await Post.findOne({
      user: req.user.id,
      isRepost: true,
      originalPost: originalPostId,
      originalPostType: modelName
    });

    if (existingRepost) {
      return res.status(400).json({ msg: "You have already reposted this content" });
    }

    // Create the repost
    const newRepost = new Post({
      user: req.user.id,
      text: text || "", // Optional comment on the repost
      isRepost: true,
      originalPost: originalPostId,
      originalPostType: modelName,
      repostText: text || "",
      media: [] // Reposts don't have their own media
    });

    const savedRepost = await newRepost.save();
    
    // Populate user info before sending response
    const populatedRepost = await Post.findById(savedRepost._id)
      .populate("user", ["name", "avatar"])
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "name avatar"
        }
      });

    res.status(201).json(populatedRepost);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Original post not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Update a post
// @route   PUT /api/v1/posts/:id
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Check user authorization
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    // Don't allow editing reposts
    if (post.isRepost) {
      return res.status(400).json({ msg: "Cannot edit a repost" });
    }

    const { text, media, contactPhone, contactEmail, contactMethods } = req.body;

    // Update fields
    if (text !== undefined) {
      post.text = text;
    }
    if (media !== undefined) {
      post.media = media;
    }
    if (contactPhone !== undefined) {
      post.contactPhone = contactPhone;
    }
    if (contactEmail !== undefined) {
      post.contactEmail = contactEmail;
    }
    if (contactMethods !== undefined) {
      post.contactMethods = contactMethods;
    }

    await post.save();

    // Return updated post with populated fields
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", ["name", "avatar"])
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "name avatar"
        }
      });

    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Dislike a comment
// @route   PUT /api/v1/posts/:id/comment/:comment_id/dislike
// @access  Private
router.put("/:id/comment/:comment_id/dislike", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    const alreadyLiked = comment.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = comment.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has liked, remove like and notification
    if (alreadyLiked) {
      comment.likes = comment.likes.filter(like => like.user.toString() !== req.user.id);
      
      if (comment.user.toString() !== req.user.id) {
        const commentOwner = await User.findById(comment.user);
        if (commentOwner) {
          commentOwner.notifications = commentOwner.notifications.filter(
            (notif) => !(notif.type === 'comment_like' &&
              notif.sender.toString() === req.user.id &&
              notif.post.toString() === post._id.toString() &&
              notif.commentId.toString() === comment._id.toString())
          );
          await commentOwner.save();
        }
      }
    }

    // If user has not disliked, add dislike
    if (!alreadyDisliked) {
      comment.dislikes.unshift({ user: req.user.id });
    }
    // If already disliked, do nothing (no toggle)

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({ path: "comments.user", select: "name avatar" })
      .populate({ path: "comments.replies.user", select: "name avatar" });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Dislike a reply
// @route   PUT /api/v1/posts/:id/comment/:comment_id/reply/:reply_id/dislike
// @access  Private
router.put("/:id/comment/:comment_id/reply/:reply_id/dislike", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const comment = post.comments.id(req.params.comment_id);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    const reply = comment.replies.id(req.params.reply_id);
    if (!reply) return res.status(404).json({ msg: "Reply not found" });

    const alreadyLiked = reply.likes.some(like => like.user.toString() === req.user.id);
    const alreadyDisliked = reply.dislikes.some(dislike => dislike.user.toString() === req.user.id);

    // If user has liked, remove like and notification
    if (alreadyLiked) {
      reply.likes = reply.likes.filter(like => like.user.toString() !== req.user.id);
      
      if (reply.user.toString() !== req.user.id) {
        const replyOwner = await User.findById(reply.user);
        if (replyOwner) {
          replyOwner.notifications = replyOwner.notifications.filter(
            (notif) => !(notif.type === 'reply_like' &&
              notif.sender.toString() === req.user.id &&
              notif.post.toString() === post._id.toString() &&
              notif.commentId.toString() === comment._id.toString() &&
              notif.replyId.toString() === reply._id.toString())
          );
          await replyOwner.save();
        }
      }
    }

    // If user has not disliked, add dislike
    if (!alreadyDisliked) {
      reply.dislikes.unshift({ user: req.user.id });
    }
    // If already disliked, do nothing (no toggle)

    post.markModified("comments");
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate({ path: "comments.user", select: "name avatar" })
      .populate({ path: "comments.replies.user", select: "name avatar" });
    res.json(updatedPost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// Shorts/Videos Feed Endpoints (TikTok-style)
// ==========================================

// @desc    Get shorts feed - "For You" tab (mixed content with algorithm)
// @route   GET /api/v1/posts/shorts/for-you
// @access  Private
router.get('/shorts/for-you', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user.id).select('following');
    const following = currentUser?.following || [];

    // Find all published posts that contain videos
    const allVideoPosts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' } // Only posts with videos
      ]
    })
      .sort({ createdAt: -1 })
      .populate('user', ['name', 'avatar', 'isVerified'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar isVerified'
        }
      })
      .lean();

    // Separate posts into following and non-following
    const followingPosts = [];
    const nonFollowingPosts = [];

    allVideoPosts.forEach(post => {
      const isFollowing = following.some(id => id.toString() === post.user._id.toString());
      if (isFollowing) {
        followingPosts.push(post);
      } else {
        nonFollowingPosts.push(post);
      }
    });

    // TikTok-style algorithm:
    // 10-15% from following (rare), 85-90% from non-following (discovery)
    const followingPercentage = 0.12; // 12% من المتابعين (نادر)
    const totalPosts = Math.min(allVideoPosts.length, parseInt(limit));
    const followingCount = Math.floor(totalPosts * followingPercentage);
    const nonFollowingCount = totalPosts - followingCount;

    // Randomly select posts from following (to make it "rare")
    const selectedFollowingPosts = followingPosts
      .sort(() => Math.random() - 0.5) // Random shuffle
      .slice(0, followingCount);

    // Select posts from non-following with engagement-based scoring
    const scoredNonFollowingPosts = nonFollowingPosts.map(post => {
      // Simple engagement score: likes + comments + shares
      const engagementScore = 
        (post.likes?.length || 0) * 1 +
        (post.comments?.length || 0) * 2 +
        (post.shares?.length || 0) * 3;
      
      // Add randomness to prevent always showing the same posts
      const randomFactor = Math.random() * 100;
      
      return {
        ...post,
        score: engagementScore + randomFactor
      };
    });

    // Sort by score and select top posts
    const selectedNonFollowingPosts = scoredNonFollowingPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, nonFollowingCount)
      .map(({ score, ...post }) => post); // Remove score from final result

    // Merge and shuffle for natural feel
    let finalPosts = [...selectedFollowingPosts, ...selectedNonFollowingPosts]
      .sort(() => Math.random() - 0.5); // Final shuffle

    // Apply pagination
    finalPosts = finalPosts.slice(skip, skip + parseInt(limit));

    res.json({
      posts: finalPosts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: allVideoPosts.length,
      hasMore: skip + finalPosts.length < allVideoPosts.length
    });
  } catch (err) {
    console.error('Error in shorts/for-you:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get shorts feed - "Following" tab (only from followed users)
// @route   GET /api/v1/posts/shorts/following
// @access  Private
router.get('/shorts/following', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user.id).select('following');
    const following = currentUser?.following || [];

    if (following.length === 0) {
      return res.json({
        posts: [],
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        hasMore: false,
        message: 'You are not following anyone yet'
      });
    }

    // Find all published video posts from followed users only
    const followingVideoPosts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' }, // Only posts with videos
        { user: { $in: following } } // Only from followed users
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', ['name', 'avatar', 'isVerified'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar isVerified'
        }
      })
      .lean();

    // Get total count for pagination
    const totalCount = await Post.countDocuments({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' },
        { user: { $in: following } }
      ]
    });

    res.json({
      posts: followingVideoPosts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      hasMore: skip + followingVideoPosts.length < totalCount
    });
  } catch (err) {
    console.error('Error in shorts/following:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Show post in home feed temporarily (for current session)
// @route   POST /api/v1/posts/:id/show-in-feed
// @access  Private
router.post('/:id/show-in-feed', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Remove current user from hiddenFromHomeFeedFor array
    post.hiddenFromHomeFeedFor = post.hiddenFromHomeFeedFor.filter(
      userId => userId.toString() !== req.user.id
    );
    
    await post.save();
    
    res.json({ msg: 'Post will now appear in your home feed', post });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Hide post from home feed (re-hide after session)
// @route   POST /api/v1/posts/:id/hide-from-feed
// @access  Private
router.post('/:id/hide-from-feed', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Add current user to hiddenFromHomeFeedFor array if not already there
    if (!post.hiddenFromHomeFeedFor.includes(req.user.id)) {
      post.hiddenFromHomeFeedFor.push(req.user.id);
      await post.save();
    }
    
    res.json({ msg: 'Post hidden from your home feed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;

