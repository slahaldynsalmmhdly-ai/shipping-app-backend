/**
 * خوارزمية الفيديوهات المشابهة (Similar Shorts Algorithm)
 * 
 * تجلب فيديوهات مشابهة بناءً على:
 * 1. الهاشتاقات المشتركة
 * 2. الفئات المشتركة
 * 3. الوسوم المشتركة
 * 4. نفس المستخدم (فيديوهات أخرى من نفس المنشئ)
 * 5. معدل التفاعل (engagement rate)
 */

const Short = require('../models/Short');
const ShortInteraction = require('../models/ShortInteraction');

/**
 * حساب درجة التشابه بين فيديوين
 * @param {Object} short1 - الفيديو الأول
 * @param {Object} short2 - الفيديو الثاني
 * @returns {Number} - درجة التشابه (0-100)
 */
function calculateSimilarityScore(short1, short2) {
  let score = 0;

  // 1. التشابه في الهاشتاقات (40 نقطة)
  const hashtags1 = short1.hashtags || [];
  const hashtags2 = short2.hashtags || [];
  const commonHashtags = hashtags1.filter(tag => hashtags2.includes(tag));
  if (hashtags1.length > 0 && hashtags2.length > 0) {
    const hashtagSimilarity = (commonHashtags.length / Math.max(hashtags1.length, hashtags2.length)) * 40;
    score += hashtagSimilarity;
  }

  // 2. التشابه في الفئات (30 نقطة)
  const categories1 = short1.categories || [];
  const categories2 = short2.categories || [];
  const commonCategories = categories1.filter(cat => categories2.includes(cat));
  if (categories1.length > 0 && categories2.length > 0) {
    const categorySimilarity = (commonCategories.length / Math.max(categories1.length, categories2.length)) * 30;
    score += categorySimilarity;
  }

  // 3. التشابه في الوسوم (20 نقطة)
  const tags1 = short1.tags || [];
  const tags2 = short2.tags || [];
  const commonTags = tags1.filter(tag => tags2.includes(tag));
  if (tags1.length > 0 && tags2.length > 0) {
    const tagSimilarity = (commonTags.length / Math.max(tags1.length, tags2.length)) * 20;
    score += tagSimilarity;
  }

  // 4. نفس المستخدم (10 نقاط)
  if (short1.user._id.toString() === short2.user._id.toString()) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * جلب فيديوهات مشابهة بناءً على فيديو معين
 * @param {String} shortId - معرف الفيديو
 * @param {String} userId - معرف المستخدم الحالي
 * @param {Number} limit - عدد الفيديوهات المطلوبة
 * @returns {Array} - قائمة الفيديوهات المشابهة
 */
async function getSimilarShorts(shortId, userId, limit = 10) {
  try {
    // 1. جلب الفيديو الأصلي
    const originalShort = await Short.findById(shortId).populate('user', 'companyName avatar');
    
    if (!originalShort) {
      console.log('الفيديو الأصلي غير موجود');
      return [];
    }

    console.log(`جلب فيديوهات مشابهة لـ: ${originalShort.title || 'بدون عنوان'}`);
    console.log(`الهاشتاقات: ${originalShort.hashtags?.join(', ') || 'لا يوجد'}`);

    // 2. جلب جميع الفيديوهات النشطة (ماعدا الفيديو الأصلي)
    const allShorts = await Short.find({
      _id: { $ne: shortId },
      isActive: true,
      isPublic: true
    }).populate('user', 'companyName avatar').lean();

    console.log(`عدد الفيديوهات المتاحة: ${allShorts.length}`);

    // 3. جلب سجل المشاهدة للمستخدم (لتجنب الفيديوهات المشاهدة مؤخراً)
    const recentInteractions = await ShortInteraction.find({
      user: userId
    }).sort({ lastViewedAt: -1 }).limit(50).select('short').lean();

    const recentlyViewedIds = recentInteractions.map(i => i.short.toString());

    // 4. حساب درجة التشابه لكل فيديو
    const scoredShorts = allShorts
      .filter(short => !recentlyViewedIds.includes(short._id.toString())) // تجنب المشاهدة مؤخراً
      .map(short => {
        const similarityScore = calculateSimilarityScore(originalShort, short);
        
        // حساب معدل التفاعل
        const totalEngagement = (short.likes || 0) + (short.comments || 0) * 2 + (short.shares || 0) * 3;
        const views = short.views || 1;
        const engagementRate = (totalEngagement / views) * 100;

        // النقاط النهائية = (التشابه × 0.7) + (معدل التفاعل × 0.3)
        const finalScore = (similarityScore * 0.7) + (Math.min(engagementRate, 100) * 0.3);

        return {
          ...short,
          similarityScore,
          engagementRate,
          finalScore
        };
      });

    // 5. ترتيب حسب النقاط النهائية
    scoredShorts.sort((a, b) => b.finalScore - a.finalScore);

    // 6. تطبيق التنوع (3 فيديوهات كحد أقصى من نفس المستخدم)
    const diversifiedShorts = [];
    const userVideoCount = {};

    for (const short of scoredShorts) {
      const shortUserId = short.user._id.toString();
      
      if (!userVideoCount[shortUserId]) {
        userVideoCount[shortUserId] = 0;
      }
      
      if (userVideoCount[shortUserId] >= 3) {
        continue; // تخطي
      }
      
      userVideoCount[shortUserId]++;
      diversifiedShorts.push(short);
      
      if (diversifiedShorts.length >= limit) {
        break;
      }
    }

    console.log(`عدد الفيديوهات المشابهة: ${diversifiedShorts.length}`);

    return diversifiedShorts;
  } catch (error) {
    console.error('خطأ في جلب الفيديوهات المشابهة:', error);
    return [];
  }
}

/**
 * جلب فيديوهات مشابهة بناءً على هاشتاقات
 * @param {Array} hashtags - قائمة الهاشتاقات
 * @param {String} userId - معرف المستخدم الحالي
 * @param {Number} limit - عدد الفيديوهات المطلوبة
 * @returns {Array} - قائمة الفيديوهات المشابهة
 */
async function getShortsbyHashtags(hashtags, userId, limit = 10) {
  try {
    if (!hashtags || hashtags.length === 0) {
      return [];
    }

    console.log(`جلب فيديوهات بالهاشتاقات: ${hashtags.join(', ')}`);

    // 1. جلب الفيديوهات التي تحتوي على أي من الهاشتاقات
    const shorts = await Short.find({
      hashtags: { $in: hashtags },
      isActive: true,
      isPublic: true
    }).populate('user', 'companyName avatar').lean();

    console.log(`عدد الفيديوهات المتاحة: ${shorts.length}`);

    // 2. جلب سجل المشاهدة للمستخدم
    const recentInteractions = await ShortInteraction.find({
      user: userId
    }).sort({ lastViewedAt: -1 }).limit(50).select('short').lean();

    const recentlyViewedIds = recentInteractions.map(i => i.short.toString());

    // 3. حساب النقاط لكل فيديو
    const scoredShorts = shorts
      .filter(short => !recentlyViewedIds.includes(short._id.toString()))
      .map(short => {
        // عدد الهاشتاقات المشتركة
        const commonHashtags = (short.hashtags || []).filter(tag => hashtags.includes(tag));
        const hashtagScore = (commonHashtags.length / hashtags.length) * 100;

        // معدل التفاعل
        const totalEngagement = (short.likes || 0) + (short.comments || 0) * 2 + (short.shares || 0) * 3;
        const views = short.views || 1;
        const engagementRate = (totalEngagement / views) * 100;

        // النقاط النهائية
        const finalScore = (hashtagScore * 0.6) + (Math.min(engagementRate, 100) * 0.4);

        return {
          ...short,
          commonHashtagsCount: commonHashtags.length,
          hashtagScore,
          engagementRate,
          finalScore
        };
      });

    // 4. ترتيب حسب النقاط
    scoredShorts.sort((a, b) => b.finalScore - a.finalScore);

    // 5. تطبيق التنوع
    const diversifiedShorts = [];
    const userVideoCount = {};

    for (const short of scoredShorts) {
      const shortUserId = short.user._id.toString();
      
      if (!userVideoCount[shortUserId]) {
        userVideoCount[shortUserId] = 0;
      }
      
      if (userVideoCount[shortUserId] >= 3) {
        continue;
      }
      
      userVideoCount[shortUserId]++;
      diversifiedShorts.push(short);
      
      if (diversifiedShorts.length >= limit) {
        break;
      }
    }

    console.log(`عدد الفيديوهات المشابهة: ${diversifiedShorts.length}`);

    return diversifiedShorts;
  } catch (error) {
    console.error('خطأ في جلب الفيديوهات بالهاشتاقات:', error);
    return [];
  }
}

/**
 * جلب فيديوهات مشابهة بناءً على اهتمامات المستخدم
 * @param {String} userId - معرف المستخدم
 * @param {Number} limit - عدد الفيديوهات المطلوبة
 * @returns {Array} - قائمة الفيديوهات المشابهة
 */
async function getRecommendedShorts(userId, limit = 10) {
  try {
    console.log(`جلب فيديوهات موصى بها للمستخدم: ${userId}`);

    // 1. جلب سجل التفاعل للمستخدم
    const interactions = await ShortInteraction.find({
      user: userId,
      interestScore: { $gte: 100 } // الفيديوهات التي أعجبته (نقاط > 100)
    }).sort({ interestScore: -1 }).limit(20).populate('short').lean();

    if (interactions.length === 0) {
      console.log('لا يوجد سجل تفاعل كافٍ');
      return [];
    }

    // 2. استخراج الهاشتاقات الأكثر تكراراً
    const hashtagFrequency = {};
    interactions.forEach(interaction => {
      const hashtags = interaction.hashtags || [];
      hashtags.forEach(tag => {
        hashtagFrequency[tag] = (hashtagFrequency[tag] || 0) + 1;
      });
    });

    // ترتيب الهاشتاقات حسب التكرار
    const topHashtags = Object.entries(hashtagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    console.log(`الهاشتاقات الأكثر اهتماماً: ${topHashtags.join(', ')}`);

    // 3. جلب فيديوهات بناءً على هذه الهاشتاقات
    const recommendedShorts = await getShortsbyHashtags(topHashtags, userId, limit);

    return recommendedShorts;
  } catch (error) {
    console.error('خطأ في جلب الفيديوهات الموصى بها:', error);
    return [];
  }
}

module.exports = {
  calculateSimilarityScore,
  getSimilarShorts,
  getShortsbyHashtags,
  getRecommendedShorts
};
