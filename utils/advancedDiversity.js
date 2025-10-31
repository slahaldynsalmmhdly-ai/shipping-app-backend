/**
 * خوارزمية التنوع المتقدمة (Advanced Content Diversity Algorithm)
 * مستوحاة من خوارزمية فيسبوك للإدمان
 * 
 * المبادئ الأساسية:
 * 1. حد أقصى للمنشورات من نفس المصدر (Max Posts Per Source)
 * 2. توزيع متوازن بين الشركات والأفراد (Balanced Distribution)
 * 3. منع التكرار المتتالي (No Consecutive Repeats)
 * 4. تنوع إجباري (Forced Diversity)
 */

/**
 * تطبيق الحد الأقصى للمنشورات من نفس المستخدم
 * @param {Array} items - جميع المنشورات/الإعلانات
 * @param {Number} maxPerUser - الحد الأقصى للمنشورات من نفس المستخدم (افتراضي: 3)
 * @returns {Array} - المنشورات بعد تطبيق الحد الأقصى
 */
function applyMaxPostsPerUser(items, maxPerUser = 3) {
  if (!items || items.length === 0) return [];

  // تجميع المنشورات حسب المستخدم
  const userPosts = new Map();
  
  items.forEach(item => {
    const userId = item.user?._id?.toString() || item.user?.toString();
    if (!userId) return;
    
    if (!userPosts.has(userId)) {
      userPosts.set(userId, []);
    }
    userPosts.get(userId).push(item);
  });

  // اختيار أفضل N منشورات لكل مستخدم
  const limitedItems = [];
  
  userPosts.forEach((posts, userId) => {
    // ترتيب منشورات المستخدم حسب التاريخ والتفاعل
    const sortedPosts = posts.sort((a, b) => {
      // حساب نقاط التفاعل
      const scoreA = (a.reactions?.length || 0) * 2 + (a.comments?.length || 0) * 3;
      const scoreB = (b.reactions?.length || 0) * 2 + (b.comments?.length || 0) * 3;
      
      // إذا كان الفرق في التفاعل كبير، نرتب حسب التفاعل
      if (Math.abs(scoreB - scoreA) > 10) {
        return scoreB - scoreA;
      }
      
      // وإلا نرتب حسب التاريخ (الأحدث أولاً)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // اختيار أفضل maxPerUser منشورات
    const selectedPosts = sortedPosts.slice(0, maxPerUser);
    limitedItems.push(...selectedPosts);
  });

  console.log(`📊 Max posts per user applied: ${items.length} → ${limitedItems.length} items (max ${maxPerUser} per user)`);
  
  return limitedItems;
}

/**
 * توزيع متوازن بين الشركات والأفراد
 * @param {Array} items - المنشورات بعد تطبيق الحد الأقصى
 * @param {Number} companyRatio - نسبة منشورات الشركات (افتراضي: 0.4 = 40%)
 * @returns {Array} - المنشورات بعد التوزيع المتوازن
 */
function balancedDistribution(items, companyRatio = 0.4) {
  if (!items || items.length === 0) return [];

  // فصل الشركات عن الأفراد
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

  console.log(`🏢 Companies: ${companyPosts.length}, 👤 Individuals: ${individualPosts.length}`);

  // إذا لم يكن هناك شركات أو أفراد، نرجع كل شيء
  if (companyPosts.length === 0) return individualPosts;
  if (individualPosts.length === 0) return companyPosts;

  // دمج بنسبة متوازنة
  const result = [];
  let companyIndex = 0;
  let individualIndex = 0;
  
  // حساب عدد منشورات الشركات والأفراد المطلوبة
  const totalItems = Math.min(items.length, 100); // حد أقصى 100 منشور في الجلسة
  const targetCompanyCount = Math.floor(totalItems * companyRatio);
  const targetIndividualCount = totalItems - targetCompanyCount;
  
  // توزيع بنمط: شركة، فرد، فرد، شركة، فرد، فرد، ...
  const pattern = companyRatio >= 0.5 
    ? [true, false] // 50% شركات: شركة، فرد، شركة، فرد
    : [false, false, true]; // 33% شركات: فرد، فرد، شركة
  
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
      // إذا انتهت منشورات الشركات، نضيف من الأفراد والعكس
      if (companyIndex < companyPosts.length && companyCount < targetCompanyCount) {
        result.push(companyPosts[companyIndex++]);
        companyCount++;
      } else if (individualIndex < individualPosts.length && individualCount < targetIndividualCount) {
        result.push(individualPosts[individualIndex++]);
        individualCount++;
      } else {
        break; // انتهينا
      }
    }
    
    patternIndex++;
  }

  console.log(`⚖️ Balanced distribution: ${companyCount} companies + ${individualCount} individuals = ${result.length} total`);
  
  return result;
}

/**
 * منع التكرار المتتالي - نسخة محسنة
 * @param {Array} items - المنشورات بعد التوزيع المتوازن
 * @param {Number} minGap - الحد الأدنى للفجوة بين منشورات نفس المستخدم (افتراضي: 5)
 * @returns {Array} - المنشورات بعد منع التكرار
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

  console.log(`🚫 Consecutive repeats prevented: ${items.length} items with min gap of ${minGap}`);

  return result;
}

/**
 * الخوارزمية المتقدمة الكاملة
 * @param {Array} items - جميع المنشورات/الإعلانات
 * @param {Object} options - خيارات الخوارزمية
 * @returns {Array} - المنشورات بعد تطبيق جميع المراحل
 */
function advancedDiversityAlgorithm(items, options = {}) {
  const {
    maxPerUser = 3,        // حد أقصى 3 منشورات لكل مستخدم
    companyRatio = 0.4,    // 40% شركات، 60% أفراد
    minGap = 5,            // فجوة 5 منشورات بين منشورات نفس المستخدم
  } = options;

  console.log('\n🎯 Starting Advanced Diversity Algorithm...');
  console.log(`📥 Input: ${items.length} items`);

  // المرحلة 1: تطبيق الحد الأقصى للمنشورات من نفس المستخدم
  const limitedItems = applyMaxPostsPerUser(items, maxPerUser);

  // المرحلة 2: توزيع متوازن بين الشركات والأفراد
  const balancedItems = balancedDistribution(limitedItems, companyRatio);

  // المرحلة 3: منع التكرار المتتالي
  const finalItems = preventConsecutiveRepeats(balancedItems, minGap);

  console.log(`📤 Output: ${finalItems.length} items`);
  console.log('✅ Advanced Diversity Algorithm completed!\n');

  return finalItems;
}

module.exports = {
  advancedDiversityAlgorithm,
  applyMaxPostsPerUser,
  balancedDistribution,
  preventConsecutiveRepeats,
};
