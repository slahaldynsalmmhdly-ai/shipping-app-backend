const express = require('express');
const router = express.Router();
const Short = require('../models/Short');
const Post = require('../models/Post');
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
    
    // Privacy filter: exclude private videos and friends-only videos from non-friends
    // Private videos (visibility: 'private') should only appear in user's own profile
    // Friends-only videos (visibility: 'friends') should only appear to friends
    // Everyone videos (visibility: 'everyone') appear to all users
    
    // احصل على المستخدم والمتابعين
    const user = await User.findById(req.user._id).select('following followers');
    const followingIds = user.following || [];
    const followerIds = user.followers || [];
    
    // Apply privacy filter
    // Show only 'everyone' and 'friends' videos (friends = mutual following)
    const mutualFriends = followingIds.filter(id => followerIds.includes(id));
    query.$or = [
      { visibility: 'everyone' },
      { visibility: 'friends', user: { $in: mutualFriends } }
    ];
    
    if (tab === 'following') {
      // جلب فيديوهات من المتابعين فقط
      query.user = { $in: followingIds };
    } else if (tab === 'for-you') {
      // جلب فيديوهات من غير المتابعين فقط (استبعد المتابعين)
      query.user = { $nin: followingIds };
    }
    
    // جلب الشورتس من نموذج Short
    const shorts = await Short.find(query)
      .select('_id title description videoUrl thumbnailUrl duration user likes comments views shares viewedBy repostedBy createdAt visibility allowComments allowDownload allowDuet contactPhone contactEmail contactMethods hashtags')
      .populate('user', 'companyName avatar')
      .populate('repostedBy.user', 'companyName avatar firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 2); // جلب ضعف العدد للدمج مع Posts
    
    // جلب المنشورات اللي فيها فيديو من نموذج Post
    let postQuery = { 
      isPublished: true,
      'media.0.type': 'video' // المنشور الأول فيه فيديو
    };
    
    if (tab === 'following') {
      postQuery.user = { $in: followingIds };
    } else if (tab === 'for-you') {
      postQuery.user = { $nin: followingIds };
    }
    
    const videoPosts = await Post.find(postQuery)
      .select('_id text media user reactions comments createdAt allowComments allowDownload allowDuet contactPhone contactEmail contactMethods hashtags impressions shares viewedBy')
      .populate('user', 'companyName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 2);
    
    // تحويل Posts إلى صيغة Shorts
    const formattedPosts = videoPosts.map(post => {
      const postObj = post.toObject();
      const firstVideo = postObj.media?.find(m => m.type === 'video');
      
      return {
        _id: postObj._id,
        title: postObj.text?.split('\n')[0]?.substring(0, 100) || '',
        description: postObj.text || '',
        videoUrl: firstVideo?.url || '',
        thumbnailUrl: firstVideo?.thumbnail || '',
        duration: firstVideo?.duration || 0,
        user: postObj.user,
        likes: postObj.reactions?.length || 0,
        comments: postObj.comments?.length || 0,
        views: postObj.impressions || 0,
        shares: postObj.shares || 0,
        viewedBy: postObj.viewedBy || [],
        repostedBy: [],
        createdAt: postObj.createdAt,
        visibility: 'everyone',
        allowComments: postObj.allowComments ?? true,
        allowDownload: postObj.allowDownload ?? true,
        allowDuet: postObj.allowDuet ?? true,
        contactPhone: postObj.contactPhone || '',
        contactEmail: postObj.contactEmail || '',
        contactMethods: postObj.contactMethods || [],
        hashtags: postObj.hashtags || [],
        isLiked: postObj.reactions?.some(r => r.user.toString() === req.user._id.toString()) || false,
        shortCommentCount: postObj.comments?.length || 0,
        commentCount: postObj.comments?.length || 0,
        isReposted: false,
        repostCount: postObj.shares || 0,
        reposters: [],
        contactNumbers: [],
        sourceType: 'post' // علامة للتمييز
      };
    });
    
    // دمج Shorts و Posts وترتيبها حسب التاريخ
    const allVideos = [...shorts, ...formattedPosts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit));
    
    // إضافة isLiked، shortCommentCount، isReposted، reposters لكل شورت
    const formattedShorts = allVideos.map(short => {
      // إذا كان من Posts، هو مُعالج بالفعل
      if (short.sourceType === 'post') {
        return short;
      }
      
      // إذا كان من Shorts، نعالجه
      const shortObj = short;
      const userView = short.viewedBy.find(v => v.user.toString() === req.user._id.toString());
      const isReposted = short.repostedBy.some(r => r.user._id.toString() === req.user._id.toString());
      
      const reposters = short.repostedBy.map(r => ({
        _id: r.user._id,
        name: r.user.companyName || `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
        avatar: r.user.avatar,
        repostedAt: r.repostedAt
      }));
      
      return {
        ...shortObj,
        isLiked: userView?.liked || false,
        shortCommentCount: shortObj.comments || 0,
        commentCount: shortObj.comments || 0,
        isReposted: isReposted,
        repostCount: shortObj.shares || 0,
        reposters: reposters,
        visibility: shortObj.visibility || 'everyone',
        allowComments: shortObj.allowComments ?? true,
        allowDownload: shortObj.allowDownload ?? true,
        allowDuet: shortObj.allowDuet ?? true,
        contactNumbers: shortObj.contactNumbers || [],
        hashtags: shortObj.hashtags || [],
        viewedBy: undefined,
        repostedBy: undefined
      };
    });
    
    const totalShorts = await Short.countDocuments(query);
    const totalPosts = await Post.countDocuments(postQuery);
    const total = totalShorts + totalPosts;
    
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
    const currentUser = await User.findById(req.user._id).select('following');
    const followingIds = currentUser.following || [];

    // جلب جميع الشورتس من غير المتابعين
    const excludeIds = [...followingIds, currentUser._id];
    const allShorts = await Short.find({ 
      isActive: true, 
      isPublic: true,
      user: { $nin: excludeIds }
    })
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
        const { title, description, videoUrl, thumbnailUrl, duration, hashtags, category, privacy, visibility, allowComments, allowDownload, allowDuet, location, contactPhone, contactEmail, contactMethods } = req.body;

    if (!duration || duration <= 0) {
      return res.status(400).json({ message: 'مدة الفيديو غير صالحة' });
    }

    // إنشاء الشورت
    const short = await Short.create({
      user: req.user._id,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      hashtags: hashtags || [],
      category: category,
      privacy: privacy || 'public',
      visibility: visibility || 'everyone', // Privacy setting: 'everyone', 'friends', 'private'
      allowComments: allowComments !== false,
      allowDownload: allowDownload !== false,
      allowDuet: allowDuet !== false,
      location: location || '',
      contactPhone: contactPhone,
      contactEmail: contactEmail,
      contactMethods: contactMethods || []
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

    // ✅ الإصلاح: إرجاع كائن Short كامل بدلاً من {success, liked, likes}
    // إعادة جلب الشورت مع populate للبيانات المطلوبة
    const updatedShort = await Short.findById(short._id)
      .populate('user', 'companyName avatar firstName lastName')
      .populate('repostedBy.user', 'companyName avatar firstName lastName');

    // تنسيق البيانات بنفس طريقة GET endpoint
    const userView = updatedShort.viewedBy.find(v => v.user.toString() === req.user._id.toString());
    const isReposted = updatedShort.repostedBy.some(r => r.user._id.toString() === req.user._id.toString());

    const reposters = updatedShort.repostedBy.map(r => ({
      _id: r.user._id,
      name: r.user.companyName || `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
      avatar: r.user.avatar,
      repostedAt: r.repostedAt
    }));

    const formattedShort = {
      ...updatedShort.toObject(),
      id: updatedShort._id.toString(), // ✅ إضافة id بجانب _id للتوافق مع الواجهة الأمامية
      isLiked: userView?.liked || false,
      shortCommentCount: updatedShort.comments || 0,
      commentCount: updatedShort.comments || 0,
      isReposted: isReposted,
      repostCount: updatedShort.shares || 0,
      reposters: reposters,
      visibility: updatedShort.visibility || 'everyone',
      allowComments: updatedShort.allowComments ?? true,
      allowDownload: updatedShort.allowDownload ?? true,
      allowDuet: updatedShort.allowDuet ?? true,
      viewedBy: undefined, // إخفاء البيانات الحساسة
      repostedBy: undefined // إخفاء البيانات الحساسة
    };

    res.json(formattedShort);
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
 * POST /api/v1/shorts/:id/repost
 * إعادة نشر شورت (toggle)
 */
router.post('/:id/repost', protect, async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'الشورت غير موجود'
      });
    }

    // التحقق من وجود إعادة نشر سابقة
    const existingRepostIndex = short.repostedBy.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    let isReposted = false;

    if (existingRepostIndex !== -1) {
      // إلغاء إعادة النشر
      short.repostedBy.splice(existingRepostIndex, 1);
      short.shares = Math.max(0, short.shares - 1);
      isReposted = false;
    } else {
      // إضافة إعادة نشر
      short.repostedBy.push({
        user: req.user._id,
        repostedAt: new Date()
      });
      short.shares += 1;
      isReposted = true;
    }

    await short.save();

    // جلب بيانات المستخدمين الذين أعادوا النشر
    const populatedShort = await Short.findById(short._id)
      .populate('repostedBy.user', 'companyName avatar firstName lastName');

    const reposters = populatedShort.repostedBy.map(r => ({
      _id: r.user._id,
      name: r.user.companyName || `${r.user.firstName} ${r.user.lastName}`,
      avatar: r.user.avatar,
      repostedAt: r.repostedAt
    }));

    res.json({
      success: true,
      isReposted: isReposted,
      repostCount: short.shares,
      reposters: reposters
    });
  } catch (error) {
    console.error('خطأ في إعادة النشر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إعادة النشر'
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

/**
 * GET /api/v1/shorts/search/:query
 * البحث عن الشورتس بالهاشتاقات والوصف والعناوين
 */
router.get('/search/:query', protect, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'يجب إدخال كلمة بحث' });
    }

    // البحث في العناوين والأوصاف والهاشتاقات
    const searchQuery = {
      isActive: true,
      isPublic: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { hashtags: { $regex: query, $options: 'i' } }
      ]
    };

    const shorts = await Short.find(searchQuery)
      .select('_id title description videoUrl thumbnailUrl duration user likes comments views shares viewedBy repostedBy createdAt visibility allowComments allowDownload allowDuet contactPhone contactEmail contactMethods hashtags')
      .populate('user', 'companyName avatar')
      .populate('repostedBy.user', 'companyName avatar firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formattedShorts = shorts.map(short => {
      const shortObj = short.toObject();
      return {
        ...shortObj,
        allowComments: shortObj.allowComments ?? true,
        allowDownload: shortObj.allowDownload ?? true,
        allowDuet: shortObj.allowDuet ?? true,
        hashtags: shortObj.hashtags || [],
        viewedBy: undefined,
        repostedBy: undefined
      };
    });

    const total = await Short.countDocuments(searchQuery);

    res.json({
      success: true,
      posts: formattedShorts,
      page: parseInt(page),
      hasMore: skip + formattedShorts.length < total
    });
  } catch (error) {
    console.error('خطأ في البحث عن الشورتس:', error);
    res.status(500).json({ message: 'فشل البحث عن الشورتس' });
  }
});

/**
 * GET /api/v1/shorts/suggestions/:query
 * الحصول على اقتراحات البحث من الهاشتاقات والأوصاف والعناوين
 */
router.get('/suggestions/:query', protect, async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'يجب إدخال كلمة بحث' });
    }

    // البحث عن الشورتس التي تطابق الكلمة المدخلة
    const shorts = await Short.find({
      isActive: true,
      isPublic: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { hashtags: { $regex: query, $options: 'i' } }
      ]
    }).select('title description hashtags').limit(20);

    // استخراج الاقتراحات الفريدة
    const suggestions = new Set();

    shorts.forEach(short => {
      // إضافة الهاشتاقات
      if (short.hashtags && Array.isArray(short.hashtags)) {
        short.hashtags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(`#${tag}`);
          }
        });
      }

      // إضافة كلمات من العنوان
      if (short.title) {
        const titleWords = short.title.split(' ');
        titleWords.forEach(word => {
          if (word.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(word);
          }
        });
      }

      // إضافة كلمات من الوصف
      if (short.description) {
        const descWords = short.description.split(' ');
        descWords.forEach(word => {
          if (word.toLowerCase().includes(query.toLowerCase()) && word.length > 2) {
            suggestions.add(word);
          }
        });
      }
    });

    // تحويل الـ Set إلى Array وترتيبها
    const suggestionsList = Array.from(suggestions).sort().slice(0, 10);

    res.json({
      success: true,
      suggestions: suggestionsList
    });
  } catch (error) {
    console.error('خطأ في جلب الاقتراحات:', error);
    res.status(500).json({ message: 'فشل جلب الاقتراحات' });
  }
});

module.exports = router;
