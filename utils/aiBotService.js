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
 * البحث عن الأساطيل الفارغة مع التفاصيل الكاملة
 */
async function searchAvailableFleets(city, companyId) {
  try {
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح',
      currentLocation: { $regex: new RegExp(city, 'i') }
    })
    .populate('user', 'name phone companyName')
    .select('vehicleName vehicleType vehicleColor vehicleModel driverName currentLocation')
    .limit(5);

    if (vehicles.length === 0) return null;

    return vehicles.map(v => ({
      name: v.vehicleName,
      type: v.vehicleType || 'غير محدد',
      color: v.vehicleColor || 'غير محدد',
      model: v.vehicleModel || 'غير محدد',
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
    }).select('vehicleName vehicleType vehicleColor vehicleModel currentLocation');

    if (vehicles.length === 0) return null;

    const fleetsByCity = {};
    vehicles.forEach(v => {
      const city = v.currentLocation || 'غير محدد';
      if (!fleetsByCity[city]) fleetsByCity[city] = [];
      fleetsByCity[city].push({
        name: v.vehicleName,
        type: v.vehicleType || 'غير محدد',
        color: v.vehicleColor || 'غير محدد',
        model: v.vehicleModel || 'غير محدد'
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
 * معالجة رسالة العميل
 */
async function processChatMessage(messageText, userId, conversationHistory = [], companyId) {
  try {
    console.log(`📨 رسالة: "${messageText}"`);
    
    const lowerMessage = messageText.toLowerCase();
    
    // جمع البيانات الحقيقية من قاعدة البيانات
    let realData = '';
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة'];
    
    // البحث عن مدينة في الرسالة
    let foundCity = null;
    for (const city of saudiCities) {
      if (lowerMessage.includes(city)) {
        foundCity = city;
        break;
      }
    }

    // إذا ذكر مدينة، ابحث عن الأساطيل المتاحة
    if (foundCity) {
      const fleets = await searchAvailableFleets(foundCity, companyId);
      if (fleets && fleets.length > 0) {
        realData += `\n\n✅ لدينا ${fleets.length} شاحنة متاحة في ${foundCity}:\n`;
        fleets.forEach((f, i) => {
          realData += `${i + 1}. ${f.name} - النوع: ${f.type} - اللون: ${f.color} - الموديل: ${f.model} - السائق: ${f.driver}\n`;
        });
      } else {
        realData += `\n\n❌ للأسف لا توجد شاحنات متاحة في ${foundCity} حالياً`;
      }
    }

    // إذا سأل عن الأساطيل بشكل عام
    if (lowerMessage.includes('اسطول') || lowerMessage.includes('شاحن') || lowerMessage.includes('متاح')) {
      const allFleets = await getAllAvailableFleets(companyId);
      if (allFleets) {
        realData += '\n\n✅ الشاحنات المتاحة لدينا:\n';
        for (const [city, vehicles] of Object.entries(allFleets)) {
          realData += `\n📍 ${city}: ${vehicles.length} شاحنة\n`;
          vehicles.forEach((v, i) => {
            realData += `   ${i + 1}. ${v.name} - ${v.type} - ${v.color} - ${v.model}\n`;
          });
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

    // System context محسّن
    let systemContext = `أنت مساعد ذكاء اصطناعي لشركة شحن سعودية.

🎯 قواعد صارمة:
1. أنت ذكاء اصطناعي، لست موظف بشري - كن صادقاً
2. ردودك قصيرة (2-3 جمل فقط)
3. استخدم فقط البيانات الحقيقية المرفقة
4. إذا لم تجد بيانات، قل "دعني أحولك لموظف بشري"

📋 معلومات مهمة:
- أنت تعرف فقط عن الشاحنات الموجودة في البيانات المرفقة
- إذا سأل عن المسافة: قل "المسافة تقريباً حوالي X كم (تقدير تقريبي)"
- إذا سأل عن السعر: قل "السعر المتوقع تقريباً X-Y ريال (غير نهائي)"
- إذا سأل عن تفاصيل الشاحنة: أعطه التفاصيل من البيانات المرفقة

⚠️ ممنوع منعاً باتاً:
- قول "السعر الحقيقي" أو "السعر الفعلي"
- قول "المسافة الحقيقية" أو "المسافة الفعلية"
- اختراع أرقام للمسافات أو الأسعار
- تكرار نفس الكلام في كل رسالة
- ادعاء أنك موظف بشري

✅ الأسلوب الصحيح:
- "السعر المتوقع تقريباً..."
- "المسافة تقريباً حوالي... (تقدير)"
- "هذا تقدير أولي، للسعر الدقيق تواصل مع موظفنا"`;

    if (realData) {
      systemContext += `\n\n[البيانات الحقيقية من قاعدة البيانات]${realData}\n\n⚠️ استخدم هذه البيانات فقط! لا تخترع معلومات!`;
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
