const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const User = require('../models/User'); // Assuming User model is needed for populating user info
const Hashtag = require('../models/Hashtag');
// تم إزالة smartFeedAlgorithm (بطيء جداً) - نستخدم خوارزمية بسيطة وسريعة
const { createFollowingPostNotifications, createLikeNotification, createCommentNotification, generateNotificationMessage } = require('../utils/notificationHelper');
const { extractHashtags, extractMentionIds } = require('../utils/textParser');
const { createMentionNotifications } = require('../utils/mentionNotificationHelper');
const { HARAJ_CATEGORIES, JOB_CATEGORIES } = require('../constants/categories');

// @desc    Create a new post
// @route   POST /api/v1/posts
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { text, media, scheduledTime, hashtags, mentions, category, postType, scope, contactPhone, contactEmail, contactMethods, isHighlighted, publishScope, country, city, isShort, title, privacy, allowComments, allowDownload, allowDuet, location, thumbnail } = req.body;

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
    
    // تحديث أو إنشاء الهاشتاقات في Hashtag model
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
      publishScope: publishScope || 'home_and_category', // category_only or home_and_category
      // ✅ إضافة حقول الفيديو والشورتس
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
    const { page = 1, limit = 10, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('[GET USER POSTS] Request:', {
      userId: req.params.userId,
      page,
      limit,
      type,
      skip
    });

    // Build query conditions
    const conditions = {
      user: req.params.userId,
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
    };

    // Filter by media type if specified
    if (type === 'video') {
      conditions['media.type'] = 'video';
      console.log('[GET USER POSTS] Filtering for videos only');
    } else if (type === 'image') {
      conditions['media.type'] = 'image';
      console.log('[GET USER POSTS] Filtering for images only');
    }

    // Get total count for pagination
    const totalCount = await Post.countDocuments(conditions);

    // Get paginated posts
    const posts = await Post.find(conditions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });

    console.log('[GET USER POSTS] Results:', {
      totalCount,
      returnedCount: posts.length,
      hasMore: skip + posts.length < totalCount
    });

    res.json({
      posts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      hasMore: skip + posts.length < totalCount
    });
  } catch (err) {
    console.error('[GET USER POSTS] Error:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get all posts (with Facebook-style algorithm)
// @route   GET /api/v1/posts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { userType, limit, skip, category, postType, country, city, isShort } = req.query;
    
    // إذا كان category أو postType أو userType أو isShort محدد، نستخدم فلترة بسيطة بدون خوارزمية
    if (category || postType || userType || isShort) {
      // بناء مصفوفة الشروط (مثل feedRoutes.js)
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
      } else if (isShort !== 'true') {
        // فقط إذا لم يكن isShort، نضيف شرط publishScope
        // لأن الشورتس يجب أن تظهر جميع الفئات
        conditions.push({ publishScope: { $ne: 'category_only' } });
      }
      
      // 4. شرط postType
      if (postType) {
        conditions.push({ postType: postType });
      }
      
      // 4.5. شرط isShort (فيديوهات فقط)
      if (isShort === 'true') {
        conditions.push({ 'media.type': 'video' }); // فقط المنشورات التي تحتوي على فيديو
        conditions.push({ isShort: true }); // فقط الفيديوهات المنشورة من صفحة الشورتس
        console.log('📹 [SHORTS QUERY] Fetching shorts with category:', category);
      }
      
      // 5. فلترة حسب الموقع (country/city)
      const filterCountry = country === '' ? null : country;
      const filterCity = city === '' ? null : city;
      
      console.log(`🔍 فلترة الموقع: country=${filterCountry}, city=${filterCity}`);
      
      if (!filterCountry || filterCountry === 'عالمي') {
        // عرض جميع المنشورات - لا نضيف شرط موقع
        console.log('📍 عرض جميع المنشورات (بدون فلتر موقع)');
      } else {
        // فلترة صارمة: عرض المنشورات من نفس الدولة فقط
        console.log(`📍 فلترة صارمة - منشورات من: ${filterCountry}${filterCity ? ` - ${filterCity}` : ''}`);
        
        if (filterCity) {
          // إذا كانت المدينة محددة: عرض منشورات من نفس المدينة أو بدون مدينة (لكن نفس الدولة)
          conditions.push({
            $or: [
              { country: filterCountry, city: filterCity },
              { country: filterCountry, $or: [{ city: null }, { city: { $exists: false } }] }
            ]
          });
        } else {
          // إذا كانت الدولة فقط محددة: عرض منشورات من نفس الدولة فقط
          conditions.push({ country: filterCountry });
        }
      }
      
      // 6. بناء الاستعلام النهائي باستخدام $and
      const query = {
        $and: conditions
      };
      
      // طباعة الاستعلام للتحقق من الفلترة
      console.log('\n🔍 استعلام المنشورات:', JSON.stringify(query, null, 2));
      console.log('📍 المعاملات:', { category, postType, country, city, userType });
      
      let posts = await Post.find(query)
        .populate('user', 'name avatar userType companyName')
        .populate('reactions.user', 'name avatar')
        .sort({ isFeatured: -1, createdAt: -1 }) // المنشورات المميزة أولاً
        .limit(parseInt(limit) || 50)
        .skip(parseInt(skip) || 0);
      
      // إذا كان isShort وليس category محدد، نضيف 10% من فيديوهات المتابعين
      if (isShort === 'true' && !category) {
        const currentUser = await User.findById(req.user.id).select('following');
        const following = currentUser?.following || [];
        
        if (following.length > 0) {
          // جلب فيديوهات المتابعين (فقط الشورتس)
          const followingVideos = await Post.find({
            $and: [
              { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
              { 'media.type': 'video' },
              { isShort: true }, // فقط الفيديوهات المنشورة من صفحة الشورتس
              { user: { $in: following } }
            ]
          })
            .populate('user', 'name avatar userType companyName')
            .populate('reactions.user', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
          
          // حساب 10% من المتابعين
          const totalLimit = parseInt(limit) || 50;
          const followingCount = Math.floor(totalLimit * 0.10); // 10%
          const nonFollowingCount = totalLimit - followingCount;
          
          // اختيار عشوائي من فيديوهات المتابعين
          const selectedFollowing = followingVideos
            .sort(() => Math.random() - 0.5)
            .slice(0, followingCount);
          
          // اختيار من غير المتابعين
          const selectedNonFollowing = posts.slice(0, nonFollowingCount);
          
          // دمج وخلط
          posts = [...selectedFollowing, ...selectedNonFollowing]
            .sort(() => Math.random() - 0.5);
        }
      }
      
      console.log('✅ عدد النتائج:', posts.length);
      if (posts.length > 0) {
        console.log('📋 أول منشور:', {
          text: posts[0].text?.substring(0, 50),
          category: posts[0].category,
          isShort: posts[0].isShort,
          scope: posts[0].scope,
          country: posts[0].country,
          city: posts[0].city,
          hasVideo: posts[0].media?.some(m => m.type === 'video')
        });
      } else {
        console.log('⚠️ [SHORTS QUERY] No results found with conditions:', JSON.stringify(conditions, null, 2));
      }
      
      return res.json({ posts });
    }
    
    // الخوارزمية العادية للصفحة الرئيسية
    const currentUser = await User.findById(req.user.id).select('following notifications').lean();
    const following = currentUser?.following || [];
    const notifications = currentUser?.notifications || [];

    // بناء فلترة الموقع (مثل feedRoutes.js)
    const filterCountry = country === '' ? null : country;
    const filterCity = city === '' ? null : city;
    
    console.log(`🔍 فلترة الموقع (الصفحة الرئيسية): country=${filterCountry}, city=${filterCity}`);
    
    let locationFilter = {};
    
    if (!filterCountry || filterCountry === 'عام') {
      // عرض جميع المنشورات - لا نضيف شرط موقع
      console.log('📍 عرض جميع المنشورات (بدون فلتر موقع)');
      locationFilter = {};
    } else {
      // فلترة صارمة: عرض المنشورات من نفس الدولة فقط
      console.log(`📍 فلترة صارمة - منشورات من: ${filterCountry}${filterCity ? ` - ${filterCity}` : ''}`);
      
      if (filterCity) {
        // إذا كانت المدينة محددة: عرض منشورات من نفس المدينة أو بدون مدينة (لكن نفس الدولة)
        locationFilter = {
          $or: [
            { country: filterCountry, city: filterCity },
            { country: filterCountry, $or: [{ city: null }, { city: { $exists: false } }] }
          ]
        };
      } else {
        // إذا كانت الدولة فقط محددة: عرض منشورات من نفس الدولة فقط
        locationFilter = { country: filterCountry };
      }
    }

    // Find all published posts, excluding those hidden from current user's home feed
    // وفقط المنشورات التي يجب أن تظهر في الصفحة الرئيسية
    const baseConditions = [
      { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
      { hiddenFromHomeFeedFor: { $ne: req.user.id } },
      { publishScope: { $ne: 'category_only' } }
    ];
    
    // إضافة فلترة الموقع إذا كانت موجودة
    if (Object.keys(locationFilter).length > 0) {
      baseConditions.push(locationFilter);
    }
    
    const allPosts = await Post.find({ 
      $and: baseConditions
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

    // عرض جميع المنشورات مرتبة حسب التفاعل والتاريخ
    const sortedPosts = allPosts.sort((a, b) => {
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
            // تحديد نوع الإشعار بناءً على نوع المنشور
            const notifType = post.isShort ? 'short_like' : 'like';
            postOwner.notifications.unshift({
              type: notifType,
              sender: req.user.id,
              post: post._id,
              message: generateNotificationMessage(notifType, sender.name)
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

    // ✅ الإصلاح: إضافة id للكائن المُرجع للتوافق مع الواجهة الأمامية
    const postWithId = {
      ...updatedPost.toObject(),
      id: updatedPost._id.toString()
    };

    res.json(postWithId);
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
        // تحديد نوع الإشعار بناءً على نوع المنشور
        const notifType = post.isShort ? 'short_comment' : 'comment';
        postOwner.notifications.unshift({
          type: notifType,
          sender: req.user.id,
          post: post._id,
          commentId: post.comments[0]._id,
          message: generateNotificationMessage(notifType, sender.name)
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

// @desc    Get all comments for a post
// @route   GET /api/v1/posts/:id/comments
// @access  Private
router.get(":id/comments", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("comments.user", "name avatar")
      .populate("comments.replies.user", "name avatar");

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Delete a comment from a post
// @route   DELETE /api/v1/posts/:id/comment/:comment_id
// @access  Private
router.delete(":id/comment/:comment_id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Pull out comment
    const comment = post.comments.find(
      (comment) => comment._id.toString() === req.params.comment_id
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
          // تحديد نوع الإشعار بناءً على نوع المنشور
          const notifType = post.isShort ? 'short_comment_like' : 'comment_like';
          commentOwner.notifications.unshift({
            type: notifType,
            sender: req.user.id,
            post: post._id,
            commentId: comment._id,
            message: generateNotificationMessage(notifType, sender.name)
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
        // تحديد نوع الإشعار بناءً على نوع المنشور
        const notifType = post.isShort ? 'short_reply' : 'reply';
        commentOwner.notifications.unshift({
          type: notifType,
          sender: req.user.id,
          post: post._id,
          commentId: comment._id,
          replyId: comment.replies[0]._id,
          message: generateNotificationMessage(notifType, sender.name)
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
          // تحديد نوع الإشعار بناءً على نوع المنشور
          const notifType = post.isShort ? 'short_reply_like' : 'reply_like';
          replyOwner.notifications.unshift({
            type: notifType,
            sender: req.user.id,
            post: post._id,
            commentId: comment._id,
            replyId: reply._id,
            message: generateNotificationMessage(notifType, sender.name)
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

// @desc    Delete a post or short
// @route   DELETE /api/v1/posts/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    console.log('[DELETE POST] Request received:', {
      postId: req.params.id,
      userId: req.user?.id,
      userName: req.user?.name,
      userType: req.user?.userType,
      timestamp: new Date().toISOString()
    });

    // Try to find in Post collection first
    let post = await Post.findById(req.params.id);
    let isShortCollection = false;

    // If not found in Post, try Short collection
    if (!post) {
      console.log('[DELETE POST] Not found in Post collection, checking Short collection...');
      const Short = require('../models/Short');
      post = await Short.findById(req.params.id);
      isShortCollection = true;
      
      if (!post) {
        console.log('[DELETE POST] Not found in any collection:', {
          postId: req.params.id,
          searchedIn: ['Post', 'Short']
        });
        return res.status(404).json({ 
          msg: "Post not found in any collection",
          postId: req.params.id,
          searchedCollections: ['Post', 'Short']
        });
      }
      
      console.log('[DELETE POST] Found in Short collection:', {
        shortId: post._id.toString(),
        userId: post.user.toString()
      });
    } else {
      console.log('[DELETE POST] Found in Post collection:', {
        postId: post._id.toString(),
        postUserId: post.user.toString(),
        requestUserId: req.user.id,
        isRepost: post.isRepost,
        isShort: post.isShort,
        hasText: !!post.text,
        hasMedia: post.media?.length > 0
      });
    }

    // Check user - Enhanced authorization check
    const postUserId = post.user.toString();
    const requestUserId = req.user.id.toString();
    
    if (postUserId !== requestUserId) {
      console.log('[DELETE POST] Authorization failed:', {
        postUserId: postUserId,
        requestUserId: requestUserId,
        match: postUserId === requestUserId,
        collection: isShortCollection ? 'Short' : 'Post'
      });
      return res.status(401).json({ 
        msg: "User not authorized",
        details: "You can only delete your own posts"
      });
    }

    console.log('[DELETE POST] Authorization successful, proceeding with deletion');

    // Delete the post/short
    await post.deleteOne();
    
    console.log('[DELETE POST] Deleted successfully:', {
      id: req.params.id,
      collection: isShortCollection ? 'Short' : 'Post',
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      msg: isShortCollection ? "Short removed" : "Post removed",
      postId: req.params.id,
      collection: isShortCollection ? 'Short' : 'Post'
    });
  } catch (err) {
    console.error('[DELETE POST] Error occurred:', {
      error: err.message,
      stack: err.stack,
      postId: req.params.id,
      userId: req.user?.id,
      errorKind: err.kind
    });
    
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found", error: "Invalid post ID format" });
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

    const { text, media, contactPhone, contactEmail, contactMethods, contactDisabled } = req.body;

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
    if (contactDisabled !== undefined) {
      post.contactDisabled = contactDisabled;
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

    // Find all published posts that contain videos AND are marked as shorts
    const allVideoPosts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' }, // Only posts with videos
        { isShort: true } // Only posts marked as shorts (from shorts creation page)
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

    // خوارزمية توصية بسيطة ومتنوعة:
    // 1. تجميع الفيديوهات حسب المستخدم
    const postsByUser = new Map();
    allVideoPosts.forEach(post => {
      const userId = post.user._id.toString();
      if (!postsByUser.has(userId)) {
        postsByUser.set(userId, []);
      }
      postsByUser.get(userId).push(post);
    });

    // 2. اختيار فيديو واحد من كل مستخدم بشكل عشوائي (للتنوع)
    const diversePosts = [];
    postsByUser.forEach(userPosts => {
      // اختيار فيديو عشوائي من فيديوهات المستخدم
      const randomIndex = Math.floor(Math.random() * userPosts.length);
      diversePosts.push(userPosts[randomIndex]);
    });

    // 3. ترتيب حسب engagement + randomness
    const scoredPosts = diversePosts.map(post => {
      const engagementScore = 
        (post.reactions?.length || 0) * 1 +
        (post.comments?.length || 0) * 2 +
        (post.shares?.length || 0) * 3;
      
      const randomFactor = Math.random() * 100;
      const recencyBonus = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24); // days ago
      const recencyScore = Math.max(0, 50 - recencyBonus); // newer = higher score
      
      return {
        ...post,
        score: engagementScore + randomFactor + recencyScore
      };
    });

    // 4. ترتيب وخلط
    let finalPosts = scoredPosts
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...post }) => post);
    
    // 5. خلط نهائي خفيف للتنوع (shuffle top 50%)
    const halfLength = Math.floor(finalPosts.length / 2);
    const topHalf = finalPosts.slice(0, halfLength).sort(() => Math.random() - 0.5);
    const bottomHalf = finalPosts.slice(halfLength);
    finalPosts = [...topHalf, ...bottomHalf];

    // Apply pagination
    const paginatedPosts = finalPosts.slice(skip, skip + parseInt(limit));

    console.log('✅ [SHORTS/FOR-YOU] Total unique users:', postsByUser.size);
    console.log('✅ [SHORTS/FOR-YOU] Diverse posts:', diversePosts.length);
    console.log('✅ [SHORTS/FOR-YOU] Returning:', paginatedPosts.length);

    res.json({
      posts: paginatedPosts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: allVideoPosts.length,
      hasMore: skip + paginatedPosts.length < allVideoPosts.length
    });
  } catch (err) {
    console.error('Error in shorts/for-you:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get shorts feed - "Friends" tab (only from followed users)
// @route   GET /api/v1/posts/shorts/friends
// @access  Private
router.get('/shorts/friends', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user.id).select('following');
    const following = currentUser?.following || [];

    console.log('🔍 [SHORTS/FRIENDS] User ID:', req.user.id);
    console.log('🔍 [SHORTS/FRIENDS] Following count:', following.length);
    console.log('🔍 [SHORTS/FRIENDS] Following IDs:', following.map(id => id.toString()));

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

    // Find all published video posts from followed users only AND marked as shorts
    const followingVideoPosts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' }, // Only posts with videos
        { isShort: true }, // Only posts marked as shorts
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

    console.log('✅ [SHORTS/FRIENDS] Found videos:', followingVideoPosts.length);
    if (followingVideoPosts.length > 0) {
      console.log('📹 [SHORTS/FRIENDS] First video:', {
        id: followingVideoPosts[0]._id,
        user: followingVideoPosts[0].user?.name,
        isShort: followingVideoPosts[0].isShort,
        category: followingVideoPosts[0].category,
        hasVideo: followingVideoPosts[0].media?.some(m => m.type === 'video')
      });
    }

    // Get total count for pagination
    const totalCount = await Post.countDocuments({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' },
        { isShort: true },
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
    console.error('Error in shorts/friends:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get shorts feed - "Haraj" tab (only haraj categories)
// @route   GET /api/v1/posts/shorts/haraj
// @access  Private
router.get('/shorts/haraj', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    console.log('🛍️ [SHORTS/HARAJ] Fetching haraj shorts');

    // Find all published video posts that are shorts AND have haraj category
    const harajVideoPosts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' }, // Only posts with videos
        { isShort: true }, // Only posts marked as shorts
        { category: { $in: HARAJ_CATEGORIES } } // Only haraj categories
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', ['name', 'avatar', 'isVerified', 'username'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar isVerified username'
        }
      })
      .lean();

    console.log('✅ [SHORTS/HARAJ] Found videos:', harajVideoPosts.length);
    if (harajVideoPosts.length > 0) {
      console.log('📹 [SHORTS/HARAJ] First video:', {
        id: harajVideoPosts[0]._id,
        user: harajVideoPosts[0].user?.name,
        category: harajVideoPosts[0].category,
        isShort: harajVideoPosts[0].isShort
      });
    }

    // Get total count for pagination
    const totalCount = await Post.countDocuments({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' },
        { isShort: true },
        { category: { $in: HARAJ_CATEGORIES } }
      ]
    });

    res.json({
      posts: harajVideoPosts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      hasMore: skip + harajVideoPosts.length < totalCount
    });
  } catch (err) {
    console.error('Error in shorts/haraj:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @desc    Get shorts feed - "Jobs" tab (only job categories)
// @route   GET /api/v1/posts/shorts/jobs
// @access  Private
router.get('/shorts/jobs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    console.log('💼 [SHORTS/JOBS] Fetching jobs shorts');

    // Find all published video posts that are shorts AND have job category
    const jobVideoPosts = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' }, // Only posts with videos
        { isShort: true }, // Only posts marked as shorts
        { category: { $in: JOB_CATEGORIES } } // Only job categories
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', ['name', 'avatar', 'isVerified', 'username'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar isVerified username'
        }
      })
      .lean();

    console.log('✅ [SHORTS/JOBS] Found videos:', jobVideoPosts.length);
    if (jobVideoPosts.length > 0) {
      console.log('📹 [SHORTS/JOBS] First video:', {
        id: jobVideoPosts[0]._id,
        user: jobVideoPosts[0].user?.name,
        category: jobVideoPosts[0].category,
        isShort: jobVideoPosts[0].isShort
      });
    }

    // Get total count for pagination
    const totalCount = await Post.countDocuments({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' },
        { isShort: true },
        { category: { $in: JOB_CATEGORIES } }
      ]
    });

    res.json({
      posts: jobVideoPosts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      hasMore: skip + jobVideoPosts.length < totalCount
    });
  } catch (err) {
    console.error('Error in shorts/jobs:', err.message);
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

