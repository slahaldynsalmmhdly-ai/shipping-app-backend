/**
 * خوارزمية الشورتس الذكية (Smart Shorts Algorithm)
 * 
 * خوارزمية مشابهة لـ TikTok تعتمد على:
 * 1. تحليل محتوى الفيديو بالذكاء الاصطناعي (DeepSeek)
 * 2. تتبع تفاعل المستخدم (مدة المشاهدة، إعجاب، تعليق، مشاركة)
 * 3. حساب درجة التوافق بين الفيديو والمستخدم
 * 4. تنوع المحتوى (عدم تكرار من نفس المستخدم)
 * 5. إعادة العرض الذكية (بعد فترة)
 */

const OpenAI = require('openai');

// تهيئة عميل DeepSeek
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1'
});

/**
 * تحليل محتوى الفيديو باستخدام DeepSeek AI
 * @param {Object} short - كائن الفيديو
 * @returns {Object} - الوسوم والفئات والموضوعات
 */
async function analyzeVideoContent(short) {
  try {
    const prompt = `قم بتحليل هذا الفيديو القصير (Short) واستخراج المعلومات التالية:

العنوان: ${short.title || 'بدون عنوان'}
الوصف: ${short.description || 'بدون وصف'}

أعطني النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "tags": ["وسم1", "وسم2", "وسم3"],
  "categories": ["فئة1", "فئة2"],
  "topics": ["موضوع1", "موضوع2"],
  "mood": "مزاج الفيديو (تعليمي، ترفيهي، إعلاني، إلخ)",
  "targetAudience": "الجمهور المستهدف"
}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'أنت محلل محتوى فيديو خبير. قم بتحليل الفيديوهات القصيرة واستخراج المعلومات بدقة.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    
    // تنظيف النص قبل التحليل
    let cleanedContent = content.trim();
    
    // إزالة النص الإضافي قبل وبعد JSON
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }
    
    // محاولة تحليل JSON
    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('خطأ في تحليل JSON من DeepSeek:', parseError.message);
      console.error('النص المستلم:', content);
      // إرجاع قيم افتراضية
      return {
        tags: [],
        categories: [],
        topics: [],
        mood: 'عام',
        targetAudience: 'الجميع'
      };
    }

    return {
      tags: parsed.tags || [],
      categories: parsed.categories || [],
      topics: parsed.topics || [],
      mood: parsed.mood || 'عام',
      targetAudience: parsed.targetAudience || 'الجميع'
    };
  } catch (error) {
    console.error('خطأ في تحليل محتوى الفيديو:', error);
    return {
      tags: [],
      categories: [],
      topics: [],
      mood: 'عام',
      targetAudience: 'الجميع'
    };
  }
}

/**
 * تحليل تفضيلات المستخدم من سجل التفاعل
 * @param {Object} user - كائن المستخدم
 * @param {Array} viewHistory - سجل المشاهدة
 * @returns {Object} - تفضيلات المستخدم
 */
async function analyzeUserVideoPreferences(user, viewHistory) {
  try {
    // جمع بيانات التفاعل
    const watchedVideos = viewHistory.filter(v => v.watchDuration >= 3); // شاهد 3 ثواني على الأقل
    const likedVideos = viewHistory.filter(v => v.liked);
    const commentedVideos = viewHistory.filter(v => v.commented);
    const sharedVideos = viewHistory.filter(v => v.shared);
    const completedVideos = viewHistory.filter(v => v.completed); // شاهد الفيديو كامل

    if (watchedVideos.length === 0) {
      return {
        interests: [],
        preferredMoods: [],
        avgWatchDuration: 0,
        completionRate: 0
      };
    }

    const prompt = `قم بتحليل تفضيلات هذا المستخدم من سجل مشاهدة الفيديوهات القصيرة:

عدد الفيديوهات المشاهدة: ${watchedVideos.length}
عدد الفيديوهات المعجب بها: ${likedVideos.length}
عدد الفيديوهات المعلق عليها: ${commentedVideos.length}
عدد الفيديوهات المشاركة: ${sharedVideos.length}
عدد الفيديوهات المكتملة: ${completedVideos.length}

الوسوم الأكثر مشاهدة: ${watchedVideos.flatMap(v => v.tags || []).slice(0, 10).join(', ')}
الفئات الأكثر مشاهدة: ${watchedVideos.flatMap(v => v.categories || []).slice(0, 5).join(', ')}

أعطني النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "interests": ["اهتمام1", "اهتمام2", "اهتمام3"],
  "preferredMoods": ["مزاج1", "مزاج2"],
  "engagementLevel": "مستوى التفاعل (منخفض، متوسط، عالي)"
}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'أنت محلل سلوك مستخدمين خبير. قم بتحليل تفضيلات المستخدمين من سجل مشاهدتهم.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    
    // تنظيف النص قبل التحليل
    let cleanedContent = content.trim();
    
    // إزالة النص الإضافي قبل وبعد JSON
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }
    
    // محاولة تحليل JSON
    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('خطأ في تحليل JSON من DeepSeek:', parseError.message);
      console.error('النص المستلم:', content);
      // إرجاع قيم افتراضية
      return {
        interests: [],
        preferredMoods: [],
        engagementLevel: 'منخفض'
      };
    }

    // حساب معدل المشاهدة ومعدل الإكمال
    const avgWatchDuration = watchedVideos.reduce((sum, v) => sum + (v.watchDuration || 0), 0) / watchedVideos.length;
    const completionRate = completedVideos.length / watchedVideos.length;

    return {
      interests: parsed.interests || [],
      preferredMoods: parsed.preferredMoods || [],
      engagementLevel: parsed.engagementLevel || 'منخفض',
      avgWatchDuration,
      completionRate
    };
  } catch (error) {
    console.error('خطأ في تحليل تفضيلات المستخدم:', error);
    return {
      interests: [],
      preferredMoods: [],
      engagementLevel: 'منخفض',
      avgWatchDuration: 0,
      completionRate: 0
    };
  }
}

/**
 * حساب درجة التوافق بين الفيديو والمستخدم
 * @param {Object} short - كائن الفيديو
 * @param {Object} userPreferences - تفضيلات المستخدم
 * @param {Array} viewHistory - سجل المشاهدة
 * @returns {Number} - درجة التوافق (0-100)
 */
function calculateVideoMatchScore(short, userPreferences, viewHistory) {
  let score = 0;

  // 1. التوافق مع الاهتمامات (40 نقطة)
  const interestMatch = userPreferences.interests.filter(interest =>
    short.tags?.includes(interest) ||
    short.categories?.includes(interest) ||
    short.topics?.includes(interest)
  ).length;
  score += Math.min(interestMatch * 10, 40);

  // 2. التوافق مع المزاج المفضل (20 نقطة)
  if (userPreferences.preferredMoods.includes(short.mood)) {
    score += 20;
  }

  // 3. معدل التفاعل مع نفس الفئة (20 نقطة)
  const sameCategoryVideos = viewHistory.filter(v =>
    v.categories?.some(cat => short.categories?.includes(cat))
  );
  if (sameCategoryVideos.length > 0) {
    const avgEngagement = sameCategoryVideos.reduce((sum, v) => {
      let engagement = 0;
      if (v.liked) engagement += 3;
      if (v.commented) engagement += 2;
      if (v.shared) engagement += 2;
      if (v.completed) engagement += 3;
      return sum + engagement;
    }, 0) / sameCategoryVideos.length;
    score += Math.min(avgEngagement * 2, 20);
  }

  // 4. شعبية الفيديو (10 نقاط)
  const totalEngagement = (short.likes || 0) + (short.comments || 0) * 2 + (short.shares || 0) * 3;
  const views = short.views || 1;
  const engagementRate = totalEngagement / views;
  score += Math.min(engagementRate * 100, 10);

  // 5. حداثة الفيديو (10 نقاط)
  const hoursSinceCreated = (Date.now() - new Date(short.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreated < 24) {
    score += 10;
  } else if (hoursSinceCreated < 72) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * تطبيق خوارزمية الشورتس الذكية
 * @param {Array} shorts - قائمة الفيديوهات
 * @param {Object} user - المستخدم الحالي
 * @param {Array} viewHistory - سجل المشاهدة
 * @returns {Array} - قائمة الفيديوهات المرتبة
 */
async function applySmartShortsAlgorithm(shorts, user, viewHistory) {
  try {
    console.log(`بدء خوارزمية الشورتس الذكية للمستخدم ${user._id}`);

    // 1. تصفية الفيديوهات
    let filteredShorts = shorts.filter(short => {
      // إزالة فيديوهات المستخدم نفسه
      if (short.user._id.toString() === user._id.toString()) {
        return false;
      }

      // إزالة الفيديوهات المشاهدة مؤخراً (آخر 50 فيديو)
      const recentlyViewed = viewHistory.slice(0, 50).map(v => v.shortId.toString());
      if (recentlyViewed.includes(short._id.toString())) {
        return false;
      }

      return true;
    });

    console.log(`عدد الفيديوهات بعد التصفية: ${filteredShorts.length}`);

    if (filteredShorts.length === 0) {
      return [];
    }

    // 2. تحليل تفضيلات المستخدم
    const userPreferences = await analyzeUserVideoPreferences(user, viewHistory);
    console.log('تفضيلات المستخدم:', userPreferences);

    // 3. حساب درجة التوافق لكل فيديو
    const scoredShorts = filteredShorts.map(short => {
      const matchScore = calculateVideoMatchScore(short, userPreferences, viewHistory);
      return {
        ...short.toObject(),
        matchScore
      };
    });

    // 4. ترتيب الفيديوهات حسب درجة التوافق
    scoredShorts.sort((a, b) => b.matchScore - a.matchScore);

    // 5. تطبيق التنوع (عدم تكرار من نفس المستخدم)
    const diversifiedShorts = [];
    const userVideoCount = {};
    const maxVideosPerUser = 1; // حد أقصى فيديو واحد من نفس المستخدم

    for (const short of scoredShorts) {
      const userId = short.user._id.toString();
      
      // تطبيق التنوع على جميع الفيديوهات (ليس فقط أول 10)
      if (!userVideoCount[userId]) {
        userVideoCount[userId] = 0;
      }
      
      if (userVideoCount[userId] >= maxVideosPerUser) {
        continue; // تخطي هذا الفيديو
      }
      
      userVideoCount[userId]++;
      diversifiedShorts.push(short);
      
      // حد أقصى 20 فيديو
      if (diversifiedShorts.length >= 20) {
        break;
      }
    }

    // 6. إضافة فيديوهات من المتابعين (20% من النتائج)
    const followingIds = user.following || [];
    if (followingIds.length > 0) {
      const followingShorts = shorts.filter(short =>
        followingIds.some(fId => fId.toString() === short.user._id.toString()) &&
        !diversifiedShorts.some(ds => ds._id.toString() === short._id.toString())
      );

      // إضافة 20% من الفيديوهات من المتابعين
      const followingShortsCount = Math.ceil(diversifiedShorts.length * 0.2);
      const selectedFollowingShorts = followingShorts.slice(0, followingShortsCount);

      // دمج الفيديوهات بشكل عشوائي
      selectedFollowingShorts.forEach((short, index) => {
        const insertIndex = Math.floor(Math.random() * diversifiedShorts.length);
        diversifiedShorts.splice(insertIndex, 0, short.toObject ? short.toObject() : short);
      });
    }

    console.log(`عدد الفيديوهات قبل إزالة التكرار: ${diversifiedShorts.length}`);

    // فحص نهائي: إزالة أي تكرار بناءً على _id الفريد
    const uniqueShorts = [];
    const seenIds = new Set();
    const duplicatesFound = [];

    diversifiedShorts.forEach(short => {
      const shortId = short._id.toString();
      if (!seenIds.has(shortId)) {
        seenIds.add(shortId);
        uniqueShorts.push(short);
      } else {
        duplicatesFound.push(shortId);
        console.log(`🛑 تم إيقاف تكرار فيديو: ${shortId}`);
      }
    });

    if (duplicatesFound.length > 0) {
      console.log(`⚠️ تم إيقاف ${duplicatesFound.length} فيديو مكرر`);
    } else {
      console.log(`✅ لا يوجد تكرار في الفيديوهات`);
    }

    console.log(`عدد الفيديوهات النهائي: ${uniqueShorts.length}`);

    return uniqueShorts;
  } catch (error) {
    console.error('خطأ في خوارزمية الشورتس الذكية:', error);
    // في حالة الفشل، نرجع الفيديوهات بترتيب عشوائي
    return shorts.sort(() => Math.random() - 0.5).slice(0, 20);
  }
}

module.exports = {
  analyzeVideoContent,
  analyzeUserVideoPreferences,
  calculateVideoMatchScore,
  applySmartShortsAlgorithm
};
