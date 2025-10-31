const User = require("../models/User");
const EmptyTruckAd = require("../models/EmptyTruckAd");
const Vehicle = require("../models/Vehicle");
const { callDeepSeek } = require("./aiService");
const { createFollowingNotifications } = require("./notificationHelper");

/**
 * نشر إعلان شاحنة فارغة تلقائي فوري
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

    console.log(`🚀 Auto posting empty truck ad for: ${vehicle.vehicleName} (${vehicle.licensePlate})`);

    // التحقق من وجود معلومات أساسية
    if (!vehicle.vehicleName || !vehicle.licensePlate) {
      console.log('⚠️ Missing basic vehicle information, skipping auto post');
      return { success: false, message: "Missing basic vehicle information" };
    }

    // توليد محتوى متنوع للملاحظات الإضافية
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
    
    const prompt = `أنت مساعد ذكي متخصص في كتابة إعلانات متنوعة. قم بإنشاء ملاحظات إضافية جديدة ومختلفة (لا تزيد عن 80 كلمة) للإعلان عن شاحنة فارغة متاحة للنقل.
    
معلومات الشاحنة:
- النوع: ${vehicle.vehicleType || "غير محدد"}
- رقم اللوحة: ${vehicle.licensePlate || "غير محدد"}
- الموقع الحالي: ${vehicle.currentLocation || user.city || "غير محدد"}
- اسم الشركة: ${user.companyName || user.name}
- اليوم: ${currentDay}

متطلبات الملاحظات:
- استخدم ${selectedApproach}
- يجب أن تكون مختلفة تماماً عن الإعلانات السابقة
- استخدم عبارات جديدة ومبتكرة
- لا تكرر نفس الأفكار
- ركز على مميزات الشاحنة والخدمة

يجب أن تكون الملاحظات باللغة العربية، مبتكرة، وجذابة.`;

    let additionalNotes;
    try {
      additionalNotes = await callDeepSeek([
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
      additionalNotes = `🚚 شاحنة فارغة متاحة للنقل الفوري\n\nنوفر خدمة نقل موثوقة وسريعة. الشاحنة جاهزة للانطلاق فوراً.\n\nللتواصل: ${user.companyName || user.name}`;
    }

    if (!additionalNotes || additionalNotes.trim() === '') {
      console.log('❌ Failed to generate content, using default');
      additionalNotes = `🚚 شاحنة فارغة متاحة للنقل الفوري\n\nنوفر خدمة نقل موثوقة وسريعة. الشاحنة جاهزة للانطلاق فوراً.\n\nللتواصل: ${user.companyName || user.name}`;
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
        console.log('✅ AI-generated image URL added to ad:', imageUrl);
      }
    } catch (imageError) {
      console.error('❌ Error in AI image generation:', imageError.message);
    }
    
    // تحديد الوجهة المفضلة (مفتوحة دائماً)
    const preferredDestination = 'مفتوح';
    
    // تحديد تاريخ التوفر (الآن)
    const availabilityDate = new Date();
    
    // إنشاء إعلان الشاحنة الفارغة
    const emptyTruckAd = await EmptyTruckAd.create({
      user: user._id,
      currentLocation: vehicle.currentLocation || user.city || 'غير محدد',
      preferredDestination: preferredDestination,
      availabilityDate: availabilityDate,
      truckType: vehicle.vehicleType || 'شاحنة نقل',
      additionalNotes: additionalNotes,
      media: mediaArray,
      isPublished: true,
      scheduledTime: null, // نشر فوري
    });

    // إنشاء إشعارات للمتابعين (نظام 15%)
    try {
      await createFollowingNotifications(
        user._id,
        'new_following_empty_truck_ad',
        null, // post
        null, // shipmentAd
        emptyTruckAd._id // emptyTruckAd
      );
      console.log('✅ Following notifications created for empty truck ad');
    } catch (notifError) {
      console.error('❌ Error creating following notifications:', notifError.message);
    }

    // تحديث معلومات النشر في المركبة
    vehicle.lastAutoPostedAt = new Date();
    vehicle.autoPostCount = (vehicle.autoPostCount || 0) + 1;
    await vehicle.save();

    console.log(`✅ Successfully posted empty truck ad for: ${vehicle.vehicleName}`);

    return {
      success: true,
      message: `تم نشر إعلان شاحنة فارغة للمركبة ${vehicle.vehicleName}`,
      emptyTruckAd,
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
