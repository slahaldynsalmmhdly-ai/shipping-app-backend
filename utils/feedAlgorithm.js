/**
 * خوارزمية Feed المشتركة - تستخدم في جميع الـ endpoints
 * لضمان تطبيق نفس الخوارزمية في كل مكان
 */

/**
 * حساب نقاط التفاعل للمنشور/الإعلان
 */
function calculateEngagementScore(item) {
  const reactionsCount = item.reactions?.length || 0;
  const commentsCount = item.comments?.length || 0;
  
  // التفاعلات لها وزن أكبر من التعليقات
  return (reactionsCount * 2) + (commentsCount * 3);
}

/**
 * حساب نقاط الوقت (المنشورات الأحدث تحصل على نقاط أعلى)
 */
function calculateTimeScore(createdAt) {
  const now = new Date();
  const postDate = new Date(createdAt);
  const hoursDiff = (now - postDate) / (1000 * 60 * 60);
  
  // المنشورات الأحدث من 24 ساعة تحصل على نقاط عالية
  if (hoursDiff < 24) {
    return 100 - (hoursDiff * 2); // من 100 إلى 52
  } else if (hoursDiff < 72) {
    return 50 - ((hoursDiff - 24) / 2); // من 50 إلى 26
  } else if (hoursDiff < 168) { // أسبوع
    return 25 - ((hoursDiff - 72) / 10); // من 25 إلى 15
  } else {
    return Math.max(1, 15 - ((hoursDiff - 168) / 100)); // من 15 إلى 1
  }
}

/**
 * حساب النقاط الإجمالية للمنشور/الإعلان
 */
function calculateFeedScore(item, isFollowing) {
  const engagementScore = calculateEngagementScore(item);
  const timeScore = calculateTimeScore(item.createdAt);
  
  // نقاط العلاقة: إذا كان من المتابَعين، يحصل على boost
  let relationshipScore = 0;
  if (isFollowing) {
    relationshipScore = 30; // boost للمتابَعين
  }
  
  // حساب النقاط النهائية
  // 30% للوقت، 40% للتفاعل، 30% للعلاقة
  const finalScore = (
    (timeScore * 0.3) +
    (engagementScore * 0.4) +
    (relationshipScore * 0.3)
  );
  
  return finalScore;
}

/**
 * خلط المصفوفة بطريقة ثابتة (seeded random)
 * يستخدم userId كـ seed لضمان نفس الترتيب للمستخدم نفسه
 */
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  
  // استخدام seed بسيط
  let random = seed;
  
  while (currentIndex !== 0) {
    // توليد رقم عشوائي بناءً على seed
    random = (random * 9301 + 49297) % 233280;
    const randomIndex = Math.floor((random / 233280) * currentIndex);
    currentIndex--;
    
    // تبديل العناصر
    [shuffled[currentIndex], shuffled[randomIndex]] = 
    [shuffled[randomIndex], shuffled[currentIndex]];
  }
  
  return shuffled;
}

/**
 * تطبيق خوارزمية Feed على مجموعة من العناصر
 * @param {Array} items - جميع العناصر (منشورات، إعلانات، إلخ)
 * @param {Array} following - قائمة معرفات المتابَعين
 * @param {String} userId - معرف المستخدم الحالي
 * @param {Number} followingPercentage - نسبة المتابَعين (افتراضي 0.15)
 * @returns {Array} العناصر المرتبة حسب الخوارزمية
 */
function applyFeedAlgorithm(items, following, userId, followingPercentage = 0.15) {
  // فصل العناصر إلى متابَعين وغير متابَعين مع حساب النقاط
  const followingItems = [];
  const nonFollowingItems = [];
  
  items.forEach(item => {
    const isFollowing = following.some(id => id.toString() === item.user._id.toString());
    const score = calculateFeedScore(item, isFollowing);
    
    const itemWithScore = { ...item, feedScore: score };
    
    if (isFollowing) {
      followingItems.push(itemWithScore);
    } else {
      nonFollowingItems.push(itemWithScore);
    }
  });
  
  // ترتيب كل مجموعة حسب النقاط
  followingItems.sort((a, b) => b.feedScore - a.feedScore);
  nonFollowingItems.sort((a, b) => b.feedScore - a.feedScore);
  
  // تطبيق نسبة المتابَعين
  const totalItemsToShow = Math.min(items.length, 100);
  const followingCount = Math.floor(totalItemsToShow * followingPercentage);
  const nonFollowingCount = totalItemsToShow - followingCount;
  
  // اختيار العناصر
  const selectedFollowingItems = followingItems.slice(0, followingCount);
  const selectedNonFollowingItems = nonFollowingItems.slice(0, nonFollowingCount);
  
  // دمج العناصر
  let finalItems = [...selectedFollowingItems, ...selectedNonFollowingItems];
  
  // ترتيب نهائي حسب النقاط مع خلط خفيف
  finalItems.sort((a, b) => {
    // إذا كان الفرق في النقاط كبير (أكثر من 20)، نرتب حسب النقاط
    if (Math.abs(b.feedScore - a.feedScore) > 20) {
      return b.feedScore - a.feedScore;
    }
    // إذا كان الفرق صغير، نستخدم التاريخ
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // خلط خفيف للعناصر المتقاربة في النقاط (في مجموعات من 5)
  const shuffledItems = [];
  const seed = userId.toString().charCodeAt(0);
  for (let i = 0; i < finalItems.length; i += 5) {
    const chunk = finalItems.slice(i, i + 5);
    const shuffledChunk = seededShuffle(chunk, seed + i);
    shuffledItems.push(...shuffledChunk);
  }
  
  // إزالة feedScore من النتيجة النهائية
  return shuffledItems.map(item => {
    const { feedScore, ...cleanItem } = item;
    return cleanItem;
  });
}

module.exports = {
  calculateEngagementScore,
  calculateTimeScore,
  calculateFeedScore,
  seededShuffle,
  applyFeedAlgorithm
};
