const axios = require("axios");
const User = require("../models/User");
const Post = require("../models/Post");
const EmptyTruckAd = require("../models/EmptyTruckAd");
const ShipmentAd = require("../models/ShipmentAd");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const WeeklyReport = require("../models/WeeklyReport");
const Vehicle = require("../models/Vehicle");

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * Call DeepSeek API
 */
async function callDeepSeek(messages, temperature = 0.7) {
  try {
    if (!DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API_KEY is not set in environment variables");
      return null;
    }

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages,
        temperature,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling DeepSeek API:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Auto Posting: Create posts for empty trucks
 */
async function autoPostEmptyTrucks(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.aiFeatures?.autoPosting) {
      return { success: false, message: "Auto posting is not enabled" };
    }

    // Find user's empty trucks
    const emptyTrucks = await Vehicle.find({
      user: userId,
      status: "متاح", // Available status in Arabic
    });

    if (emptyTrucks.length === 0) {
      return { success: false, message: "No empty trucks found" };
    }

    const postsCreated = [];

    for (const truck of emptyTrucks) {
      // Generate post content using AI
      const prompt = `أنت مساعد ذكي لشركة نقل. قم بإنشاء منشور جذاب وقصير (لا يزيد عن 100 كلمة) للإعلان عن شاحنة فارغة متاحة للنقل.
      
معلومات الشاحنة:
- النوع: ${truck.vehicleType || "غير محدد"}
- رقم اللوحة: ${truck.licensePlate || "غير محدد"}
- الموقع الحالي: ${truck.currentLocation || user.city || "غير محدد"}

يجب أن يكون المنشور باللغة العربية ومهني وجذاب.`;

      const content = await callDeepSeek([
        {
          role: "system",
          content: "أنت مساعد ذكي متخصص في كتابة إعلانات النقل والشحن باللغة العربية.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      if (content) {
        // Create a post
        const post = await Post.create({
          user: userId,
          text: content,
          generatedByAI: true,
          aiFeatureType: 'auto_posting',
        });

        postsCreated.push(post);
      }
    }

    return {
      success: true,
      message: `تم إنشاء ${postsCreated.length} منشور بنجاح`,
      posts: postsCreated,
    };
  } catch (error) {
    console.error("Error in autoPostEmptyTrucks:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Auto Messaging: Send messages to cargo ad owners
 */
async function autoMessageCargoAds(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.aiFeatures?.autoMessaging) {
      return { success: false, message: "Auto messaging is not enabled" };
    }

    // Find recent cargo ads (shipment ads looking for trucks)
    const cargoAds = await ShipmentAd.find({
      userId: { $ne: userId }, // Not the user's own ads
      status: "active",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name");

    if (cargoAds.length === 0) {
      return { success: false, message: "No cargo ads found" };
    }

    // Get user's available trucks
    const availableTrucks = await Vehicle.find({
      user: userId,
      status: "متاح",
    });

    if (availableTrucks.length === 0) {
      return { success: false, message: "No available trucks" };
    }

    const messagesSent = [];

    for (const ad of cargoAds) {
      // Check if conversation already exists
      const existingConversation = await Conversation.findOne({
        participants: { $all: [userId, ad.userId._id] },
      });

      if (existingConversation) {
        continue; // Skip if already contacted
      }

      // Generate personalized message using AI
      const prompt = `أنت مساعد ذكي لشركة نقل. قم بإنشاء رسالة قصيرة ومهنية (لا تزيد عن 80 كلمة) لعرض خدمات النقل على صاحب إعلان شحنة.

معلومات الشحنة:
- من: ${ad.from || "غير محدد"}
- إلى: ${ad.to || "غير محدد"}
- نوع البضاعة: ${ad.cargoType || "غير محدد"}

معلومات شركتنا:
- اسم الشركة: ${user.companyName || user.name}
- عدد الشاحنات المتاحة: ${availableTrucks.length}

يجب أن تكون الرسالة باللغة العربية ومهنية ومختصرة.`;

      const messageContent = await callDeepSeek([
        {
          role: "system",
          content: "أنت مساعد ذكي متخصص في كتابة رسائل تجارية احترافية باللغة العربية.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      if (messageContent) {
        // Create conversation
        const conversation = await Conversation.create({
          participants: [userId, ad.userId._id],
        });

        // Send message
        const message = await Message.create({
          conversation: conversation._id,
          sender: userId,
          messageType: "text",
          content: messageContent,
          generatedByAI: true,
        });

        messagesSent.push(message);
      }
    }

    return {
      success: true,
      message: `تم إرسال ${messagesSent.length} رسالة بنجاح`,
      messages: messagesSent,
    };
  } catch (error) {
    console.error("Error in autoMessageCargoAds:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Fleet Promotion: Create promotional posts for fleet
 */
async function promoteFleet(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.aiFeatures?.fleetPromotion) {
      return { success: false, message: "Fleet promotion is not enabled" };
    }

    // Get user's fleet
    const fleet = await Vehicle.find({ user: userId });

    if (fleet.length === 0) {
      return { success: false, message: "No fleet found" };
    }

    // Generate promotional content using AI
    const prompt = `أنت مساعد ذكي لشركة نقل. قم بإنشاء منشور ترويجي جذاب (لا يزيد عن 150 كلمة) للترويج لأسطول الشركة.

معلومات الشركة:
- اسم الشركة: ${user.companyName || user.name}
- عدد الشاحنات: ${fleet.length}
- أنواع الشاحنات: ${user.truckTypes || "متنوعة"}
- المدينة: ${user.city || "غير محدد"}
- الوصف: ${user.description || ""}

يجب أن يكون المنشور باللغة العربية، جذاب، مهني، ويبرز مميزات الشركة.`;

    const content = await callDeepSeek([
      {
        role: "system",
        content: "أنت مساعد ذكي متخصص في كتابة محتوى تسويقي احترافي باللغة العربية.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    if (content) {
      // Create promotional post
      const mediaArray = (user.fleetImages || []).map(url => ({
        url,
        type: 'image'
      }));
      
      const post = await Post.create({
        user: userId,
        text: content,
        media: mediaArray,
        generatedByAI: true,
        aiFeatureType: 'fleet_promotion',
      });

      return {
        success: true,
        message: "تم إنشاء منشور ترويجي بنجاح",
        post,
      };
    }

    return { success: false, message: "Failed to generate content" };
  } catch (error) {
    console.error("Error in promoteFleet:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Weekly Reports: Generate weekly demand reports
 */
async function generateWeeklyReport(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.aiFeatures?.weeklyReports) {
      return { success: false, message: "Weekly reports are not enabled" };
    }

    // Calculate date range (last 7 days)
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Get shipment ads from the last week
    const shipmentAds = await ShipmentAd.find({
      createdAt: { $gte: weekStart, $lte: weekEnd },
    });

    // Analyze demand by city
    const cityDemandMap = {};

    shipmentAds.forEach((ad) => {
      const city = ad.from || "غير محدد";
      if (!cityDemandMap[city]) {
        cityDemandMap[city] = {
          city,
          shipmentCount: 0,
          totalPrice: 0,
        };
      }
      cityDemandMap[city].shipmentCount++;
      if (ad.price) {
        cityDemandMap[city].totalPrice += ad.price;
      }
    });

    // Convert to array and calculate demand levels
    const cityDemand = Object.values(cityDemandMap).map((data) => {
      let demandLevel = "low";
      if (data.shipmentCount >= 20) demandLevel = "very_high";
      else if (data.shipmentCount >= 10) demandLevel = "high";
      else if (data.shipmentCount >= 5) demandLevel = "medium";

      return {
        city: data.city,
        demandLevel,
        shipmentCount: data.shipmentCount,
        averagePrice: data.shipmentCount > 0 ? data.totalPrice / data.shipmentCount : 0,
      };
    });

    // Sort by demand
    cityDemand.sort((a, b) => b.shipmentCount - a.shipmentCount);

    // Generate insights using AI
    const topCities = cityDemand.slice(0, 5);
    const prompt = `أنت محلل بيانات متخصص في قطاع النقل والشحن. قم بتحليل البيانات التالية وإعطاء رؤى وتوصيات مفيدة (لا تزيد عن 200 كلمة).

بيانات الطلب الأسبوعي على الشحن:
${topCities.map((c) => `- ${c.city}: ${c.shipmentCount} شحنة، متوسط السعر: ${c.averagePrice.toFixed(2)} ريال`).join("\n")}

قدم:
1. تحليل للاتجاهات
2. توصيات للشركة لزيادة الأرباح
3. المدن التي يجب التركيز عليها

يجب أن يكون التحليل باللغة العربية، مهني، ومفيد.`;

    const insights = await callDeepSeek([
      {
        role: "system",
        content: "أنت محلل بيانات متخصص في قطاع النقل والشحن.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Generate recommendations
    const recommendations = [
      `ركز على المدن ذات الطلب العالي: ${topCities.slice(0, 3).map((c) => c.city).join("، ")}`,
      `متوسط عدد الشحنات الأسبوعية: ${Math.round(shipmentAds.length / 7)} شحنة يومياً`,
    ];

    // Create weekly report
    const report = await WeeklyReport.create({
      userId,
      weekStart,
      weekEnd,
      cityDemand,
      insights: insights || "لم يتم إنشاء تحليل",
      recommendations,
    });

    return {
      success: true,
      message: "تم إنشاء التقرير الأسبوعي بنجاح",
      report,
    };
  } catch (error) {
    console.error("Error in generateWeeklyReport:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Run all enabled AI features for a user
 */
async function runAIFeaturesForUser(userId) {
  const results = {
    autoPosting: null,
    autoMessaging: null,
    fleetPromotion: null,
    weeklyReports: null,
  };

  try {
    const user = await User.findById(userId);
    if (!user || !user.aiFeatures) {
      return results;
    }

    if (user.aiFeatures.autoPosting) {
      results.autoPosting = await autoPostEmptyTrucks(userId);
    }

    if (user.aiFeatures.autoMessaging) {
      results.autoMessaging = await autoMessageCargoAds(userId);
    }

    if (user.aiFeatures.fleetPromotion) {
      results.fleetPromotion = await promoteFleet(userId);
    }

    if (user.aiFeatures.weeklyReports) {
      results.weeklyReports = await generateWeeklyReport(userId);
    }

    return results;
  } catch (error) {
    console.error("Error in runAIFeaturesForUser:", error);
    return results;
  }
}

module.exports = {
  callDeepSeek,
  autoPostEmptyTrucks,
  autoMessageCargoAds,
  promoteFleet,
  generateWeeklyReport,
  runAIFeaturesForUser,
};

