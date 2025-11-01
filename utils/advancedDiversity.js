/**
 * خوارزمية التنويع المتقدمة المؤقتة - ملف بديل للتوافق
 * هذا الملف موجود فقط للتوافق مع الملفات القديمة
 */

/**
 * تطبيق الحد الأقصى للمنشورات من نفس المستخدم
 */
function applyMaxPostsPerUser(items, maxPerUser = 3) {
  if (!items || items.length === 0) return [];

  const userPosts = new Map();
  
  items.forEach(item => {
    const userId = item.user?._id?.toString() || item.user?.toString();
    if (!userId) return;
    
    if (!userPosts.has(userId)) {
      userPosts.set(userId, []);
    }
    userPosts.get(userId).push(item);
  });

  const limitedItems = [];
  
  userPosts.forEach((posts, userId) => {
    const sortedPosts = posts.sort((a, b) => {
      const scoreA = (a.reactions?.length || 0) * 2 + (a.comments?.length || 0) * 3;
      const scoreB = (b.reactions?.length || 0) * 2 + (b.comments?.length || 0) * 3;
      
      if (Math.abs(scoreB - scoreA) > 10) {
        return scoreB - scoreA;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    const selectedPosts = sortedPosts.slice(0, maxPerUser);
    limitedItems.push(...selectedPosts);
  });

  return limitedItems;
}

/**
 * توزيع متوازن بين الشركات والأفراد
 */
function balancedDistribution(items, companyRatio = 0.4) {
  if (!items || items.length === 0) return [];

  const companyPosts = [];
  const individualPosts = [];
  
  items.forEach(item => {
    const userType = item.user?.userType;
    if (userType === 'company') {
      companyPosts.push(item);
    } else {
      individualPosts.push(item);
    }
  });

  if (companyPosts.length === 0) return individualPosts;
  if (individualPosts.length === 0) return companyPosts;

  const result = [];
  let companyIndex = 0;
  let individualIndex = 0;
  
  const totalItems = Math.min(items.length, 100);
  const targetCompanyCount = Math.floor(totalItems * companyRatio);
  const targetIndividualCount = totalItems - targetCompanyCount;
  
  const pattern = companyRatio >= 0.5 
    ? [true, false]
    : [false, false, true];
  
  let patternIndex = 0;
  let companyCount = 0;
  let individualCount = 0;
  
  while (result.length < totalItems) {
    const isCompanyTurn = pattern[patternIndex % pattern.length];
    
    if (isCompanyTurn && companyIndex < companyPosts.length && companyCount < targetCompanyCount) {
      result.push(companyPosts[companyIndex++]);
      companyCount++;
    } else if (!isCompanyTurn && individualIndex < individualPosts.length && individualCount < targetIndividualCount) {
      result.push(individualPosts[individualIndex++]);
      individualCount++;
    } else {
      if (companyIndex < companyPosts.length && companyCount < targetCompanyCount) {
        result.push(companyPosts[companyIndex++]);
        companyCount++;
      } else if (individualIndex < individualPosts.length && individualCount < targetIndividualCount) {
        result.push(individualPosts[individualIndex++]);
        individualCount++;
      } else {
        break;
      }
    }
    
    patternIndex++;
  }

  return result;
}

/**
 * منع التكرار المتتالي
 */
function preventConsecutiveRepeats(items, minGap = 5) {
  if (!items || items.length <= minGap) {
    return items;
  }

  const result = [];
  const pending = [...items];
  const lastSeenPosition = new Map();

  let attempts = 0;
  const maxAttempts = items.length * 3;

  while (pending.length > 0 && attempts < maxAttempts) {
    attempts++;
    let added = false;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const userId = item.user?._id?.toString() || item.user?.toString();

      if (!userId) {
        result.push(item);
        pending.splice(i, 1);
        added = true;
        break;
      }

      const lastPosition = lastSeenPosition.get(userId);
      const currentPosition = result.length;

      if (lastPosition === undefined || (currentPosition - lastPosition) >= minGap) {
        result.push(item);
        lastSeenPosition.set(userId, currentPosition);
        pending.splice(i, 1);
        added = true;
        break;
      }
    }

    if (!added && pending.length > 0) {
      const item = pending.shift();
      const userId = item.user?._id?.toString() || item.user?.toString();
      result.push(item);
      if (userId) {
        lastSeenPosition.set(userId, result.length - 1);
      }
    }
  }

  if (pending.length > 0) {
    result.push(...pending);
  }

  return result;
}

/**
 * الخوارزمية المتقدمة الكاملة
 */
function advancedDiversityAlgorithm(items, options = {}) {
  const {
    maxPerUser = 3,
    companyRatio = 0.4,
    minGap = 5,
  } = options;

  const limitedItems = applyMaxPostsPerUser(items, maxPerUser);
  const balancedItems = balancedDistribution(limitedItems, companyRatio);
  const finalItems = preventConsecutiveRepeats(balancedItems, minGap);

  return finalItems;
}

module.exports = {
  advancedDiversityAlgorithm,
  applyMaxPostsPerUser,
  balancedDistribution,
  preventConsecutiveRepeats,
};
