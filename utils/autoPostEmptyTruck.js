const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const { callDeepSeek } = require("./aiService");

/**
 * نشر إعلان تلقائي فوري لشاحنة فارغة واحدة
 * يتم استدعاؤها عند تغيير حالة الشاحنة إلى "متاح"
 */
async function autoPostSingleEmptyTruck(vehicleId) {
  try {
    const vehicle = await Vehicle.findById(vehicleId).populate('user');
    
    if (!vehicle) {
      console.log('❌ Vehicle not found:', vehicleId);
      return { success: false, message: "Vehicle not found" };
    }

    if (vehicle.status !== "متاح") {
      console.log('ℹ️ Vehicle is not available, skipping auto post');
      return { success: false, message: "Vehicle is not available" };
    }

    const user = vehicle.user;
    
    // التحقق من أن المستخدم شركة ولديه ميزة النشر التلقائي مفعلة
    if (!user || user.userType !== 'company') {
      console.log('ℹ️ User is not a company, skipping auto post');
      return { success: false, message: "User is not a company" };
    }

    if (!user.aiFeatures || !user.aiFeatures.autoPosting) {
      console.log('ℹ️ Auto posting is not enabled for this company');
      return { success: false, message: "Auto posting is not enabled" };
    }

    // التحقق من عدم النشر مؤخراً (تجنب التكرار خلال ساعة واحدة)
    if (vehicle.lastAutoPostedAt) {
      const hoursSinceLastPost = (Date.now() - vehicle.lastAutoPostedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastPost < 1) {
        console.log('ℹ️ Already posted within the last hour, skipping');
        return { success: false, message: "Already posted recently" };
      }
    }

    console.log(`🚀 Auto posting for empty truck: ${vehicle.vehicleName} (${vehicle.licensePlate})`);

    // التحقق من وجود معلومات أساسية
    if (!vehicle.vehicleName || !vehicle.licensePlate) {
      console.log('⚠️ Missing basic vehicle information, skipping auto post');
      return { success: false, message: "Missing basic vehicle information" };
    }

    // توليد محتوى متنوع
    const approaches = [
      'أسلوب مباشر وواضح مع ذكر التفاصيل',
      'أسلوب تسويقي جذاب مع عرض مميز',
      'أسلوب مهني رسمي',
      'أسلوب ودي وقريب',
      'أسلوب عملي مع تحديد المسارات المقترحة',
    ];
    
    const selectedApproach = approaches[Math.floor(Math.random() * approaches.length)];
    
    const now = new Date();
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const currentDay = days[now.getDay()];
    
    const prompt = `أنت مساعد ذكي متخصص في كتابة إعلانات متنوعة. قم بإنشاء منشور جديد ومختلف (لا يزيد عن 100 كلمة) للإعلان عن شاحنة فارغة متاحة للنقل.
    
معلومات الشاحنة:
- النوع: ${vehicle.vehicleType || "غير محدد"}
- رقم اللوحة: ${vehicle.licensePlate || "غير محدد"}
- الموقع الحالي: ${vehicle.currentLocation || user.city || "غير محدد"}
- اسم الشركة: ${user.companyName || user.name}
- اليوم: ${currentDay}

متطلبات المنشور:
- استخدم ${selectedApproach}
- يجب أن يكون مختلفاً تماماً عن المنشورات السابقة
- استخدم عبارات جديدة ومبتكرة
- لا تكرر نفس الأفكار

يجب أن يكون المنشور باللغة العربية، مبتكر، وجذاب.`;

    let content;
    try {
      content = await callDeepSeek([
        {
          role: "system",
          content: "أنت مساعد ذكي متخصص في كتابة إعلانات النقل والشحن باللغة العربية.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);
    } catch (aiError) {
      console.error('❌ Error calling DeepSeek AI:', aiError.message);
      // استخدام محتوى افتراضي إذا فشل الذكاء الاصطناعي
      content = `🚚 شاحنة فارغة متاحة للنقل\n\nالنوع: ${vehicle.vehicleType || "غير محدد"}\nرقم اللوحة: ${vehicle.licensePlate}\nالموقع الحالي: ${vehicle.currentLocation || user.city || "غير محدد"}\n\nللتواصل: ${user.companyName || user.name}`;
    }

    if (!content || content.trim() === '') {
      console.log('❌ Failed to generate content, using default');
      content = `🚚 شاحنة فارغة متاحة للنقل\n\nالنوع: ${vehicle.vehicleType || "غير محدد"}\nرقم اللوحة: ${vehicle.licensePlate}\nالموقع الحالي: ${vehicle.currentLocation || user.city || "غير محدد"}\n\nللتواصل: ${user.companyName || user.name}`;
    }

    // توليد صورة بالذكاء الاصطناعي
    const { generateImageUrl, generateTruckImagePrompt } = require('./imageGenerator');
    const mediaArray = [];
    
    try {
      console.log('🎨 Generating AI image for empty truck...');
      
      const imagePrompt = generateTruckImagePrompt(
        vehicle.vehicleType,
        vehicle.currentLocation || user.city,
        'realistic'
      );
      console.log('📝 Image prompt:', imagePrompt);
      
      const imageUrl = generateImageUrl(imagePrompt);
      
      if (imageUrl) {
        mediaArray.push({ url: imageUrl, type: 'image' });
        console.log('✅ AI-generated image URL added to post:', imageUrl);
      }
    } catch (imageError) {
      console.error('❌ Error in AI image generation:', imageError.message);
    }
    
    // إنشاء المنشور
    const post = await Post.create({
      user: user._id,
      text: content,
      media: mediaArray,
      generatedByAI: true,
      aiFeatureType: 'auto_posting_instant',
      relatedVehicle: vehicleId,
    });

    // تحديث معلومات النشر في المركبة
    vehicle.lastAutoPostedAt = new Date();
    vehicle.autoPostCount = (vehicle.autoPostCount || 0) + 1;
    await vehicle.save();

    console.log(`✅ Successfully posted for empty truck: ${vehicle.vehicleName}`);

    return {
      success: true,
      message: `تم نشر إعلان للشاحنة ${vehicle.vehicleName}`,
      post,
      vehicle: {
        id: vehicle._id,
        name: vehicle.vehicleName,
        licensePlate: vehicle.licensePlate,
      }
    };
  } catch (error) {
    console.error("❌ Error in autoPostSingleEmptyTruck:", error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  autoPostSingleEmptyTruck,
};
