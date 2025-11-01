/**
 * خوارزمية Feed المؤقتة - ملف بديل للتوافق
 * هذا الملف موجود فقط للتوافق مع الملفات القديمة
 * يُنصح بتحديث جميع الملفات لاستخدام smartFeedAlgorithm
 */

/**
 * حساب نقاط التفاعل للمنشور/الإعلان
 */
function calculateEngagementScore(item) {
  const reactionsCount = item.reactions?.length || 0;
  const commentsCount = item.comments?.length || 0;
  
  return (reactionsCount * 2) + (commentsCount * 3);
}

/**
 * حساب نقاط الوقت
 */
function calculateTimeScore(createdAt) {
  const now = new Date();
  const postDate = new Date(createdAt);
  const hoursDiff = (now - postDate) / (1000 * 60 * 60);
  
  if (hoursDiff < 24) {
    return 100 - (hoursDiff * 2);
  } else if (hoursDiff < 72) {
    return 50 - ((hoursDiff - 24) / 2);
  } else if (hoursDiff < 168) {
    return 25 - ((hoursDiff - 72) / 10);
  } else {
    return Math.max(1, 15 - ((hoursDiff - 168) / 100));
  }
}

/**
 * حساب النقاط الإجمالية
 */
function calculateFeedScore(item, isFollowing) {
  const engagementScore = calculateEngagementScore(item);
  const timeScore = calculateTimeScore(item.createdAt);
  
  let relationshipScore = 0;
  if (isFollowing) {
    relationshipScore = 30;
  }
  
  const finalScore = (
    (timeScore * 0.3) +
    (engagementScore * 0.4) +
    (relationshipScore * 0.3)
  );
  
  return finalScore;
}

/**
 * تطبيق خوارزمية Feed
 */
function applyFeedAlgorithm(items, following, userId, followingPercentage = 0.15) {
  if (!items || items.length === 0) return [];
  
  const followingItems = [];
  const nonFollowingItems = [];
  
  items.forEach(item => {
    const isFollowing = following.some(id => id.toString() === item.user?._id?.toString());
    const score = calculateFeedScore(item, isFollowing);
    
    const itemWithScore = { ...item, feedScore: score };
    
    if (isFollowing) {
      followingItems.push(itemWithScore);
    } else {
      nonFollowingItems.push(itemWithScore);
    }
  });
  
  followingItems.sort((a, b) => b.feedScore - a.feedScore);
  nonFollowingItems.sort((a, b) => b.feedScore - a.feedScore);
  
  const totalItemsToShow = Math.min(items.length, 100);
  const requiredFollowingCount = Math.floor(totalItemsToShow * followingPercentage);
  const requiredNonFollowingCount = totalItemsToShow - requiredFollowingCount;
  
  const selectedFollowingItems = followingItems.slice(0, Math.min(requiredFollowingCount, followingItems.length));
  const selectedNonFollowingItems = nonFollowingItems.slice(0, Math.min(requiredNonFollowingCount, nonFollowingItems.length));
  
  let finalItems = [...selectedFollowingItems, ...selectedNonFollowingItems];
  
  finalItems.sort((a, b) => {
    if (Math.abs(b.feedScore - a.feedScore) > 20) {
      return b.feedScore - a.feedScore;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return finalItems.map(item => {
    const { feedScore, ...cleanItem } = item;
    return cleanItem;
  });
}

module.exports = {
  calculateEngagementScore,
  calculateTimeScore,
  calculateFeedScore,
  applyFeedAlgorithm
};
