const axios = require('axios');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Post = require('../models/Post');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const ShipmentAd = require('../models/ShipmentAd');

/**
 * استدعاء DeepSeek API للحصول على رد ذكي
 */
async function callDeepSeekChat(messages) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
      throw new Error('DEEPSEEK_API_KEY is not configured properly');
    }

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error calling DeepSeek API:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * البحث عن الأساطيل الفارغة
 */
async function searchAvailableFleets(city, companyId) {
  try {
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح',
      currentLocation: { $regex: new RegExp(city, 'i') }
    })
    .populate('user', 'name phone companyName')
    .select('vehicleName vehicleType driverName currentLocation')
    .limit(5);

    if (vehicles.length === 0) return null;

    return vehicles.map(v => ({
      name: v.vehicleName,
      type: v.vehicleType || 'غير محدد',
      driver: v.driverName,
      location: v.currentLocation
    }));
  } catch (error) {
    console.error('❌ خطأ في البحث:', error);
    return null;
  }
}

/**
 * البحث عن جميع الأساطيل المتاحة
 */
async function getAllAvailableFleets(companyId) {
  try {
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح'
    }).select('vehicleName vehicleType currentLocation');

    if (vehicles.length === 0) return null;

    const fleetsByCity = {};
    vehicles.forEach(v => {
      const city = v.currentLocation || 'غير محدد';
      if (!fleetsByCity[city]) fleetsByCity[city] = [];
      fleetsByCity[city].push({
        name: v.vehicleName,
        type: v.vehicleType || 'غير محدد'
      });
    });

    return fleetsByCity;
  } catch (error) {
    return null;
  }
}

/**
 * البحث عن إعلانات الشاحنات الفارغة
 */
async function searchEmptyTruckAds(companyId) {
  try {
    const ads = await EmptyTruckAd.find({
      user: companyId,
      isPublished: true
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('currentLocation preferredDestination truckType availabilityDate');

    if (ads.length === 0) return null;

    return ads.map(ad => ({
      from: ad.currentLocation,
      to: ad.preferredDestination,
      type: ad.truckType,
      date: ad.availabilityDate
    }));
  } catch (error) {
    return null;
  }
}

/**
 * البحث عن منشورات الشركة
 */
async function searchCompanyPosts(companyId) {
  try {
    const posts = await Post.find({
      user: companyId,
      isPublished: true
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('text createdAt');

    if (posts.length === 0) return null;

    return posts.map(p => ({
      text: p.text || 'منشور بدون نص',
      date: p.createdAt
    }));
  } catch (error) {
    return null;
  }
}

/**
 * حساب المسافة والوقت بين المدن السعودية
 */
function getDistanceAndTime(fromCity, toCity) {
  const distances = {
    'الرياض-جدة': { km: 950, hours: 9 },
    'الرياض-الدمام': { km: 400, hours: 4 },
    'الرياض-أبها': { km: 850, hours: 8 },
    'جدة-الدمام': { km: 1350, hours: 13 },
    'جدة-المدينة': { km: 420, hours: 4 },
    'الدمام-جدة': { km: 1350, hours: 13 },
    'الدمام-الرياض': { km: 400, hours: 4 },
    'أبها-جدة': { km: 550, hours: 5 },
  };

  const key = `${fromCity}-${toCity}`;
  return distances[key] || { km: 800, hours: 8 }; // قيمة افتراضية
}

/**
 * حساب السعر التقريبي
 */
function calculatePrice(fromCity, toCity) {
  const { km } = getDistanceAndTime(fromCity, toCity);
  const pricePerKm = 2; // ريالين للكيلو
  const basePrice = km * pricePerKm;
  const min = Math.floor(basePrice * 0.8);
  const max = Math.floor(basePrice * 1.2);
  return { min, max };
}

/**
 * معالجة رسالة العميل
 */
async function processChatMessage(messageText, userId, conversationHistory = [], companyId) {
  try {
    console.log(`📨 رسالة: "${messageText}"`);
    
    const lowerMessage = messageText.toLowerCase();
    
    // جمع البيانات الحقيقية
    let realData = '';
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة'];
    
    // البحث عن مدينتين (من - إلى)
    let fromCity = null;
    let toCity = null;
    for (const city of saudiCities) {
      if (lowerMessage.includes(city)) {
        if (!fromCity) fromCity = city;
        else if (!toCity && city !== fromCity) toCity = city;
      }
    }

    // إذا ذكر مدينتين، أعطه المسافة والسعر
    if (fromCity && toCity) {
      const { km, hours } = getDistanceAndTime(fromCity, toCity);
      const { min, max } = calculatePrice(fromCity, toCity);
      realData += `\n\n📍 المسافة من ${fromCity} إلى ${toCity}: ${km} كم (حوالي ${hours} ساعات)\n💰 السعر التقريبي: ${min}-${max} ريال`;
    }

    // إذا ذكر مدينة واحدة، ابحث عن الأساطيل
    if (fromCity && !toCity) {
      const fleets = await searchAvailableFleets(fromCity, companyId);
      if (fleets && fleets.length > 0) {
        realData += `\n\n✅ لدينا ${fleets.length} شاحنة متاحة في ${fromCity}`;
      }
    }

    // إذا سأل عن الأساطيل بشكل عام
    if (lowerMessage.includes('اسطول') || lowerMessage.includes('شاحن') || lowerMessage.includes('متاح')) {
      const allFleets = await getAllAvailableFleets(companyId);
      if (allFleets) {
        realData += '\n\n✅ الشاحنات المتاحة:\n';
        for (const [city, vehicles] of Object.entries(allFleets)) {
          realData += `📍 ${city}: ${vehicles.length} شاحنة\n`;
        }
      }
    }

    // إذا سأل عن منشور أو إعلان
    if (lowerMessage.includes('منشور') || lowerMessage.includes('اعلان') || lowerMessage.includes('شفت')) {
      const ads = await searchEmptyTruckAds(companyId);
      if (ads && ads.length > 0) {
        realData += '\n\n✅ نعم! لدينا إعلانات شاحنات فارغة:\n';
        ads.forEach((ad, i) => {
          realData += `${i + 1}. من ${ad.from} إلى ${ad.to} - ${ad.type}\n`;
        });
      }
    }

    // System context
    let systemContext = `أنت مساعد ذكاء اصطناعي لشركة شحن سعودية.

🎯 قواعد صارمة:
1. كن صادقاً: أنت ذكاء اصطناعي، لست موظف بشري
2. ردودك قصيرة (2-3 جمل فقط)
3. استخدم فقط البيانات الحقيقية المرفقة
4. إذا لم تجد بيانات، قل "دعني أحولك لموظف بشري"
5. أسلوبك متحمس ومقنع
6. لا تكرر نفس الكلام في كل رسالة

📋 ما يجب فعله:
- إذا سأل عن سعر: أعطه السعر من البيانات
- إذا سأل عن مسافة: أعطه المسافة من البيانات
- إذا سأل عن شاحنات: أعطه القائمة من البيانات
- إذا طلب موظف: قل "سأحولك لموظف بشري الآن"
- إذا سأل عن منشور: أخبره إذا كان موجود أم لا

⚠️ ممنوع منعاً باتاً:
- تكرار "عندنا دينا" في كل رسالة
- طلب صورة في كل رسالة
- الكذب وادعاء أنك موظف
- اختراع معلومات غير موجودة`;

    if (realData) {
      systemContext += `\n\n[البيانات الحقيقية]${realData}\n\nاستخدم هذه البيانات فقط!`;
    }

    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-4),
      { role: 'user', content: messageText }
    ];

    const botResponse = await callDeepSeekChat(messages);
    
    console.log(`✅ رد البوت: ${botResponse}`);

    return {
      success: true,
      response: botResponse,
      shouldTransferToHuman: botResponse.includes('موظف بشري') || botResponse.includes('خدمة العملاء')
    };

  } catch (error) {
    console.error('❌ خطأ:', error);
    return {
      success: false,
      response: 'عذراً، دعني أحولك لموظف بشري الآن',
      shouldTransferToHuman: true
    };
  }
}

/**
 * رسالة الترحيب الأولى
 */
async function sendWelcomeMessage(companyId) {
  return {
    success: true,
    response: `مرحباً بك! 👋

أنا مساعد ذكاء اصطناعي لشركة الشحن.

كيف يمكنني مساعدتك اليوم؟
- استفسار عن الأسعار 💰
- البحث عن شاحنات متاحة 🚛
- معلومات عن المسافات 📍
- التواصل مع موظف بشري 👤`
  };
}

/**
 * معالجة الصور
 */
async function processImageMessage(imageUrl, userId) {
  return {
    success: true,
    response: `تم استلام الصورة! 📸

سأحولك لموظف بشري الآن لمراجعة الصورة وتقديم عرض سعر دقيق.`,
    shouldTransferToHuman: true
  };
}

/**
 * التحقق من تفعيل البوت
 */
async function isBotEnabledForCompany(companyId) {
  try {
    const company = await User.findById(companyId);
    return company?.botEnabled === true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  callDeepSeekChat,
  searchAvailableFleets,
  getAllAvailableFleets,
  processChatMessage,
  sendWelcomeMessage,
  processImageMessage,
  isBotEnabledForCompany
};
