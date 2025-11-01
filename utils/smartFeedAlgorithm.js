/**
 * خوارزمية توزيع المنشورات الذكية (Smart Feed Distribution Algorithm)
 * مبنية على الذكاء الاصطناعي والتعلم من تفاعل المستخدمين
 * 
 * الأهداف:
 * - توزيع تدريجي للمنشورات بناءً على معدل التفاعل
 * - اختبار المنشورات على عينة صغيرة أولاً
 * - توسيع النشر تلقائياً للمنشورات الناجحة
 * - استخدام الذكاء الاصطناعي في 80% من التوصيات
 */

const OpenAI = require('openai');

// تهيئة عميل OpenAI (المفاتيح محملة من متغيرات البيئة)
const openai = new OpenAI();

/**
 * مراحل توزيع المنشور (Post Distribution Stages)
 */
const DISTRIBUTION_STAGES = {
  TESTING: 'testing',           // مرحلة الاختبار - 50 مستخدم
  EXPANDING: 'expanding',       // مرحلة التوسع - 200 مستخدم
  VIRAL: 'viral',              // مرحلة الانتشار - 1000+ مستخدم
  SATURATED: 'saturated'       // مرحلة التشبع - وصل للحد الأقصى
};

/**
 * عتبات التفاعل المطلوبة للانتقال بين المراحل
 */
const ENGAGEMENT_THRESHOLDS = {
  TESTING_TO_EXPANDING: 0.15,    // 15% معدل تفاعل للانتقال من الاختبار للتوسع
  EXPANDING_TO_VIRAL: 0.20,      // 20% معدل تفاعل للانتقال من التوسع للانتشار
  MINIMUM_VIABLE: 0.10           // 10% الحد الأدنى لاستمرار النشر
};

/**
 * حجم العينة لكل مرحلة
 */
const SAMPLE_SIZES = {
  TESTING: 50,
  EXPANDING: 200,
  VIRAL: 1000,
  MAX_REACH: 10000
};

/**
 * حساب معدل التفاعل للمنشور
 * @param {Object} post - المنشور
 * @returns {Number} - معدل التفاعل (0-1)
 */
function calculateEngagementRate(post) {
  const impressions = post.impressions || 0;
  if (impressions === 0) return 0;

  const likes = post.reactions?.length || 0;
  const comments = post.comments?.length || 0;
  const shares = post.shares || 0;
  const videoCompletions = post.videoCompletions || 0;

  // حساب إجمالي التفاعلات
  const totalEngagements = likes + (comments * 2) + (shares * 3) + (videoCompletions * 1.5);
  
  // معدل التفاعل = التفاعلات / المشاهدات
  return totalEngagements / impressions;
}

/**
 * تحديد المرحلة الحالية للمنشور
 * @param {Object} post - المنشور
 * @returns {String} - المرحلة الحالية
 */
function determinePostStage(post) {
  const impressions = post.impressions || 0;
  
  if (impressions < SAMPLE_SIZES.TESTING) {
    return DISTRIBUTION_STAGES.TESTING;
  } else if (impressions < SAMPLE_SIZES.EXPANDING) {
    return DISTRIBUTION_STAGES.EXPANDING;
  } else if (impressions < SAMPLE_SIZES.VIRAL) {
    return DISTRIBUTION_STAGES.VIRAL;
  } else {
    return DISTRIBUTION_STAGES.SATURATED;
  }
}

/**
 * تحديد ما إذا كان يجب توسيع نشر المنشور
 * @param {Object} post - المنشور
 * @returns {Boolean} - هل يجب التوسع؟
 */
function shouldExpandPost(post) {
  const engagementRate = calculateEngagementRate(post);
  const currentStage = determinePostStage(post);

  switch (currentStage) {
    case DISTRIBUTION_STAGES.TESTING:
      return engagementRate >= ENGAGEMENT_THRESHOLDS.TESTING_TO_EXPANDING;
    
    case DISTRIBUTION_STAGES.EXPANDING:
      return engagementRate >= ENGAGEMENT_THRESHOLDS.EXPANDING_TO_VIRAL;
    
    case DISTRIBUTION_STAGES.VIRAL:
      return engagementRate >= ENGAGEMENT_THRESHOLDS.MINIMUM_VIABLE;
    
    default:
      return false;
  }
}

/**
 * استخراج الوسوم والفئات باستخدام الذكاء الاصطناعي
 * @param {String} text - نص المنشور
 * @returns {Object} - الوسوم والفئات المستخرجة
 */
async function extractTagsAndCategories(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'أنت مساعد ذكي متخصص في تحليل المحتوى واستخراج الوسوم والفئات. قم بتحليل النص المعطى واستخرج الوسوم الرئيسية والفئات ذات الصلة. أرجع النتيجة بصيغة JSON فقط.'
        },
        {
          role: 'user',
          content: `حلل هذا النص واستخرج الوسوم والفئات:\n\n${text}\n\nأرجع النتيجة بهذا الشكل:\n{\n  "tags": ["وسم1", "وسم2"],\n  "categories": ["فئة1", "فئة2"],\n  "topics": ["موضوع1", "موضوع2"]\n}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    return {
      tags: parsed.tags || [],
      categories: parsed.categories || [],
      topics: parsed.topics || []
    };
  } catch (error) {
    console.error('خطأ في استخراج الوسوم:', error);
    return { tags: [], categories: [], topics: [] };
  }
}

/**
 * تحليل تفضيلات المستخدم باستخدام الذكاء الاصطناعي
 * @param {Object} user - المستخدم
 * @param {Array} userHistory - سجل تفاعلات المستخدم
 * @returns {Object} - تفضيلات المستخدم
 */
async function analyzeUserPreferences(user, userHistory) {
  try {
    // جمع بيانات التفاعلات
    const interactions = userHistory.map(item => ({
      type: item.type,
      content: item.content?.substring(0, 100),
      engagement: item.engagement
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'أنت محلل ذكي لتفضيلات المستخدمين. قم بتحليل سجل التفاعلات وحدد اهتمامات المستخدم وتفضيلاته.'
        },
        {
          role: 'user',
          content: `حلل هذه التفاعلات وحدد تفضيلات المستخدم:\n\n${JSON.stringify(interactions, null, 2)}\n\nأرجع النتيجة بصيغة JSON:\n{\n  "interests": ["اهتمام1", "اهتمام2"],\n  "preferredContentTypes": ["نوع1", "نوع2"],\n  "engagementPatterns": "وصف نمط التفاعل"\n}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('خطأ في تحليل التفضيلات:', error);
    return { interests: [], preferredContentTypes: [], engagementPatterns: '' };
  }
}

/**
 * حساب درجة التوافق بين المنشور والمستخدم باستخدام الذكاء الاصطناعي
 * @param {Object} post - المنشور
 * @param {Object} userPreferences - تفضيلات المستخدم
 * @returns {Number} - درجة التوافق (0-100)
 */
async function calculateAIMatchScore(post, userPreferences) {
  try {
    const postData = {
      text: post.text?.substring(0, 200),
      tags: post.tags || [],
      categories: post.categories || []
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'أنت نظام توصية ذكي. قم بحساب درجة التوافق بين المنشور وتفضيلات المستخدم من 0 إلى 100.'
        },
        {
          role: 'user',
          content: `احسب درجة التوافق:\n\nالمنشور: ${JSON.stringify(postData)}\n\nتفضيلات المستخدم: ${JSON.stringify(userPreferences)}\n\nأرجع رقم فقط من 0 إلى 100.`
        }
      ],
      temperature: 0.2,
      max_tokens: 10
    });

    const score = parseInt(response.choices[0].message.content.trim());
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('خطأ في حساب التوافق:', error);
    return 50; // درجة افتراضية
  }
}

/**
 * حساب نقاط المنشور بناءً على عوامل متعددة
 * @param {Object} post - المنشور
 * @param {Object} user - المستخدم الحالي
 * @param {Object} userPreferences - تفضيلات المستخدم
 * @returns {Number} - النقاط الإجمالية
 */
async function calculatePostScore(post, user, userPreferences) {
  // 1. نقاط التفاعل (20%)
  const engagementRate = calculateEngagementRate(post);
  const engagementScore = engagementRate * 100 * 0.2;

  // 2. نقاط الوقت (10%)
  const now = new Date();
  const postDate = new Date(post.createdAt);
  const hoursDiff = (now - postDate) / (1000 * 60 * 60);
  let timeScore = 0;
  if (hoursDiff < 24) {
    timeScore = (24 - hoursDiff) / 24 * 100 * 0.1;
  } else if (hoursDiff < 72) {
    timeScore = (72 - hoursDiff) / 72 * 50 * 0.1;
  }

  // 3. نقاط التوافق مع تفضيلات المستخدم (50% - الذكاء الاصطناعي)
  const aiMatchScore = await calculateAIMatchScore(post, userPreferences) * 0.5;

  // 4. نقاط العلاقة (20%)
  let relationshipScore = 0;
  if (user.following && user.following.includes(post.user._id.toString())) {
    relationshipScore = 100 * 0.2;
  }

  // النقاط الإجمالية
  const totalScore = engagementScore + timeScore + aiMatchScore + relationshipScore;
  
  return totalScore;
}

/**
 * اختيار المستخدمين المستهدفين للمنشور
 * @param {Object} post - المنشور
 * @param {Array} allUsers - جميع المستخدمين
 * @param {Number} targetCount - عدد المستخدمين المستهدفين
 * @returns {Array} - قائمة معرفات المستخدمين المستهدفين
 */
async function selectTargetUsers(post, allUsers, targetCount) {
  const currentStage = determinePostStage(post);
  
  // في مرحلة الاختبار، نختار مستخدمين نشطين عشوائياً
  if (currentStage === DISTRIBUTION_STAGES.TESTING) {
    const activeUsers = allUsers
      .filter(u => u.lastActive && (Date.now() - new Date(u.lastActive).getTime()) < 24 * 60 * 60 * 1000)
      .sort(() => Math.random() - 0.5)
      .slice(0, targetCount);
    
    return activeUsers.map(u => u._id);
  }

  // في المراحل الأخرى، نستخدم الذكاء الاصطناعي لاختيار المستخدمين الأنسب
  const scoredUsers = [];
  
  for (const targetUser of allUsers) {
    // تحليل تفضيلات المستخدم (يمكن تخزينها مسبقاً لتحسين الأداء)
    const preferences = targetUser.preferences || { interests: [], preferredContentTypes: [] };
    
    // حساب درجة التوافق
    const score = await calculateAIMatchScore(post, preferences);
    
    scoredUsers.push({
      userId: targetUser._id,
      score: score
    });
  }

  // ترتيب المستخدمين حسب درجة التوافق
  scoredUsers.sort((a, b) => b.score - a.score);
  
  // اختيار أفضل المستخدمين
  return scoredUsers.slice(0, targetCount).map(u => u.userId);
}

/**
 * تطبيق خوارزمية التوزيع الذكية
 * @param {Array} posts - جميع المنشورات
 * @param {Object} currentUser - المستخدم الحالي
 * @param {Array} userHistory - سجل تفاعلات المستخدم
 * @returns {Array} - المنشورات المرتبة
 */
async function applySmartFeedAlgorithm(posts, currentUser, userHistory = []) {
  console.log('\n🤖 بدء خوارزمية التوزيع الذكية...');
  console.log(`📥 المدخلات: ${posts.length} منشور`);

  // تحليل تفضيلات المستخدم
  const userPreferences = await analyzeUserPreferences(currentUser, userHistory);
  console.log('✅ تم تحليل تفضيلات المستخدم');

  // حساب نقاط كل منشور
  const scoredPosts = [];
  for (const post of posts) {
    const score = await calculatePostScore(post, currentUser, userPreferences);
    scoredPosts.push({
      ...post,
      smartScore: score
    });
  }

  // ترتيب المنشورات حسب النقاط
  scoredPosts.sort((a, b) => b.smartScore - a.smartScore);

  // تطبيق قواعد التنويع الأساسية (20% قواعد تقليدية)
  const diversifiedPosts = applyBasicDiversityRules(scoredPosts, {
    maxPerUser: 1,           // منشور واحد فقط لكل مستخدم في التحميل الأول
    maxPosts: 10             // 10 منشورات كحد أقصى
  });

  console.log(`📤 المخرجات: ${diversifiedPosts.length} منشور`);
  console.log('✅ اكتملت خوارزمية التوزيع الذكية!\n');

  // إزالة smartScore من النتيجة النهائية
  return diversifiedPosts.map(post => {
    const { smartScore, ...cleanPost } = post;
    return cleanPost;
  });
}

/**
 * تطبيق قواعد التنويع الأساسية (20% من الخوارزمية)
 * @param {Array} posts - المنشورات المرتبة
 * @param {Object} options - خيارات التنويع
 * @returns {Array} - المنشورات بعد التنويع
 */
function applyBasicDiversityRules(posts, options = {}) {
  const { maxPerUser = 1, maxPosts = 10 } = options;
  
  const seenUsers = new Set();
  const result = [];

  for (const post of posts) {
    if (result.length >= maxPosts) break;
    
    const userId = post.user?._id?.toString() || post.user?.toString();
    
    // التحقق من عدم تجاوز الحد الأقصى لكل مستخدم
    if (!seenUsers.has(userId)) {
      result.push(post);
      seenUsers.add(userId);
    }
  }

  return result;
}

/**
 * تسجيل عرض المنشور (Impression)
 * @param {String} postId - معرف المنشور
 * @param {String} userId - معرف المستخدم
 */
async function recordImpression(postId, userId) {
  try {
    const Post = require('../models/Post');
    await Post.findByIdAndUpdate(postId, {
      $inc: { impressions: 1 },
      $addToSet: { viewedBy: userId }
    });
  } catch (error) {
    console.error('خطأ في تسجيل العرض:', error);
  }
}

/**
 * تسجيل تفاعل المستخدم
 * @param {String} postId - معرف المنشور
 * @param {String} userId - معرف المستخدم
 * @param {String} interactionType - نوع التفاعل (like, comment, share, watch_complete)
 */
async function recordInteraction(postId, userId, interactionType) {
  try {
    const Post = require('../models/Post');
    const post = await Post.findById(postId);
    
    if (!post) return;

    // تحديث إحصاءات المنشور
    if (interactionType === 'watch_complete') {
      await Post.findByIdAndUpdate(postId, {
        $inc: { videoCompletions: 1 }
      });
    }

    // التحقق من إمكانية توسيع النشر
    if (shouldExpandPost(post)) {
      console.log(`🚀 توسيع نشر المنشور ${postId}`);
      // يمكن إضافة منطق إضافي هنا لتوسيع النشر
    }
  } catch (error) {
    console.error('خطأ في تسجيل التفاعل:', error);
  }
}

module.exports = {
  applySmartFeedAlgorithm,
  calculateEngagementRate,
  determinePostStage,
  shouldExpandPost,
  extractTagsAndCategories,
  analyzeUserPreferences,
  calculateAIMatchScore,
  selectTargetUsers,
  recordImpression,
  recordInteraction,
  DISTRIBUTION_STAGES,
  ENGAGEMENT_THRESHOLDS,
  SAMPLE_SIZES
};
