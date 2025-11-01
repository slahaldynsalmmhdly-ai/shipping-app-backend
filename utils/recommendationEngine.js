/**
 * مكتبة التوصية (Recommendation Engine)
 * مستوحاة من نظام التوصيات في Facebook
 * 
 * تعمل بالتكامل مع الخوارزمية الذكية لتحسين التوصيات
 */

const User = require('../models/User');
const Post = require('../models/Post');

/**
 * بناء ملف تعريف المستخدم (User Profile)
 * @param {String} userId - معرف المستخدم
 * @returns {Object} - ملف تعريف المستخدم
 */
async function buildUserProfile(userId) {
  try {
    const user = await User.findById(userId)
      .select('preferences following')
      .lean();
    
    if (!user) {
      return { interests: [], preferredContentTypes: [], following: [] };
    }
    
    return {
      interests: user.preferences?.interests || [],
      preferredContentTypes: user.preferences?.preferredContentTypes || [],
      following: user.following || [],
      userId: userId
    };
  } catch (error) {
    console.error('خطأ في بناء ملف تعريف المستخدم:', error);
    return { interests: [], preferredContentTypes: [], following: [] };
  }
}

/**
 * حساب التشابه بين مستخدمين (Collaborative Filtering)
 * @param {Object} user1Profile - ملف تعريف المستخدم الأول
 * @param {Object} user2Profile - ملف تعريف المستخدم الثاني
 * @returns {Number} - درجة التشابه (0-1)
 */
function calculateUserSimilarity(user1Profile, user2Profile) {
  // حساب التشابه في الاهتمامات
  const commonInterests = user1Profile.interests.filter(
    interest => user2Profile.interests.includes(interest)
  );
  
  const interestSimilarity = commonInterests.length / 
    Math.max(user1Profile.interests.length, user2Profile.interests.length, 1);
  
  // حساب التشابه في المتابعين
  const commonFollowing = user1Profile.following.filter(
    f => user2Profile.following.includes(f)
  );
  
  const followingSimilarity = commonFollowing.length / 
    Math.max(user1Profile.following.length, user2Profile.following.length, 1);
  
  // المتوسط المرجح
  return (interestSimilarity * 0.6) + (followingSimilarity * 0.4);
}

/**
 * العثور على مستخدمين مشابهين (Similar Users)
 * @param {String} userId - معرف المستخدم
 * @param {Number} limit - عدد المستخدمين المشابهين
 * @returns {Array} - قائمة المستخدمين المشابهين
 */
async function findSimilarUsers(userId, limit = 10) {
  try {
    const currentUserProfile = await buildUserProfile(userId);
    
    // جلب جميع المستخدمين الآخرين
    const allUsers = await User.find({ _id: { $ne: userId } })
      .select('_id preferences following')
      .limit(100) // حد أقصى للأداء
      .lean();
    
    // حساب التشابه لكل مستخدم
    const similarities = [];
    
    for (const user of allUsers) {
      const userProfile = {
        interests: user.preferences?.interests || [],
        preferredContentTypes: user.preferences?.preferredContentTypes || [],
        following: user.following || [],
        userId: user._id
      };
      
      const similarity = calculateUserSimilarity(currentUserProfile, userProfile);
      
      if (similarity > 0) {
        similarities.push({
          userId: user._id,
          similarity: similarity
        });
      }
    }
    
    // ترتيب حسب التشابه
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, limit);
  } catch (error) {
    console.error('خطأ في العثور على مستخدمين مشابهين:', error);
    return [];
  }
}

/**
 * الحصول على توصيات بناءً على المستخدمين المشابهين
 * @param {String} userId - معرف المستخدم
 * @param {Number} limit - عدد التوصيات
 * @returns {Array} - قائمة التوصيات
 */
async function getCollaborativeRecommendations(userId, limit = 20) {
  try {
    // العثور على مستخدمين مشابهين
    const similarUsers = await findSimilarUsers(userId, 10);
    
    if (similarUsers.length === 0) {
      return [];
    }
    
    // جلب المنشورات التي أعجبت المستخدمين المشابهين
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const recommendedPosts = await Post.find({
      'reactions.user': { $in: similarUserIds },
      user: { $ne: userId }, // استبعاد منشورات المستخدم نفسه
      viewedBy: { $ne: userId } // استبعاد المنشورات التي شاهدها
    })
      .populate('user', 'name avatar userType companyName')
      .limit(limit)
      .lean();
    
    return recommendedPosts;
  } catch (error) {
    console.error('خطأ في الحصول على التوصيات التعاونية:', error);
    return [];
  }
}

/**
 * الحصول على توصيات بناءً على المحتوى (Content-Based Filtering)
 * @param {String} userId - معرف المستخدم
 * @param {Number} limit - عدد التوصيات
 * @returns {Array} - قائمة التوصيات
 */
async function getContentBasedRecommendations(userId, limit = 20) {
  try {
    const userProfile = await buildUserProfile(userId);
    
    if (userProfile.interests.length === 0) {
      return [];
    }
    
    // البحث عن منشورات تحتوي على اهتمامات المستخدم
    const recommendedPosts = await Post.find({
      $or: [
        { tags: { $in: userProfile.interests } },
        { categories: { $in: userProfile.interests } }
      ],
      user: { $ne: userId },
      viewedBy: { $ne: userId }
    })
      .populate('user', 'name avatar userType companyName')
      .limit(limit)
      .lean();
    
    return recommendedPosts;
  } catch (error) {
    console.error('خطأ في الحصول على التوصيات المبنية على المحتوى:', error);
    return [];
  }
}

/**
 * الحصول على توصيات هجينة (Hybrid Recommendations)
 * تجمع بين التوصيات التعاونية والمبنية على المحتوى
 * @param {String} userId - معرف المستخدم
 * @param {Number} limit - عدد التوصيات
 * @returns {Array} - قائمة التوصيات المدمجة
 */
async function getHybridRecommendations(userId, limit = 20) {
  try {
    // الحصول على كلا النوعين من التوصيات
    const [collaborativeRecs, contentBasedRecs] = await Promise.all([
      getCollaborativeRecommendations(userId, Math.ceil(limit / 2)),
      getContentBasedRecommendations(userId, Math.ceil(limit / 2))
    ]);
    
    // دمج التوصيات وإزالة التكرارات
    const allRecs = [...collaborativeRecs, ...contentBasedRecs];
    const uniqueRecs = [];
    const seenIds = new Set();
    
    for (const rec of allRecs) {
      const id = rec._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueRecs.push(rec);
      }
    }
    
    // ترتيب حسب التفاعل
    uniqueRecs.sort((a, b) => {
      const scoreA = (a.reactions?.length || 0) * 2 + (a.comments?.length || 0) * 3;
      const scoreB = (b.reactions?.length || 0) * 2 + (b.comments?.length || 0) * 3;
      return scoreB - scoreA;
    });
    
    return uniqueRecs.slice(0, limit);
  } catch (error) {
    console.error('خطأ في الحصول على التوصيات الهجينة:', error);
    return [];
  }
}

/**
 * تحديث تفضيلات المستخدم بناءً على التفاعلات
 * @param {String} userId - معرف المستخدم
 * @param {String} postId - معرف المنشور
 * @param {String} interactionType - نوع التفاعل (like, comment, share)
 */
async function updateUserPreferencesFromInteraction(userId, postId, interactionType) {
  try {
    const post = await Post.findById(postId).select('tags categories').lean();
    
    if (!post) return;
    
    const user = await User.findById(userId);
    
    if (!user) return;
    
    // تهيئة التفضيلات إذا لم تكن موجودة
    if (!user.preferences) {
      user.preferences = {
        interests: [],
        preferredContentTypes: [],
        engagementPatterns: ''
      };
    }
    
    // إضافة الوسوم والفئات إلى الاهتمامات
    const newInterests = [...(post.tags || []), ...(post.categories || [])];
    
    for (const interest of newInterests) {
      if (!user.preferences.interests.includes(interest)) {
        user.preferences.interests.push(interest);
      }
    }
    
    // الاحتفاظ بأحدث 50 اهتمام فقط
    if (user.preferences.interests.length > 50) {
      user.preferences.interests = user.preferences.interests.slice(-50);
    }
    
    await user.save();
  } catch (error) {
    console.error('خطأ في تحديث تفضيلات المستخدم:', error);
  }
}

module.exports = {
  buildUserProfile,
  calculateUserSimilarity,
  findSimilarUsers,
  getCollaborativeRecommendations,
  getContentBasedRecommendations,
  getHybridRecommendations,
  updateUserPreferencesFromInteraction
};
