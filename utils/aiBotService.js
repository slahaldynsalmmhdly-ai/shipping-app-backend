const axios = require('axios');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

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
        max_tokens: 500,
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
 * البحث عن الأساطيل الفارغة حسب المنطقة
 */
async function searchAvailableFleets(city, companyId) {
  try {
    console.log(`🔍 البحث عن أساطيل في: ${city} للشركة: ${companyId}`);
    
    // البحث عن المركبات المتاحة في المدينة المحددة للشركة
    const vehicles = await Vehicle.find({
      owner: companyId,
      status: 'متاح',
      city: { $regex: new RegExp(city, 'i') }
    })
    .populate('owner', 'name phone companyName')
    .limit(10);

    console.log(`✅ تم العثور على ${vehicles.length} مركبة متاحة في ${city}`);

    if (vehicles.length === 0) {
      return null;
    }

    // تنسيق النتائج
    const fleetInfo = vehicles.map(v => ({
      type: v.type,
      capacity: v.capacity,
      city: v.city,
      owner: v.owner.companyName || v.owner.name,
      phone: v.owner.phone,
      registrationNumber: v.registrationNumber
    }));

    return fleetInfo;
  } catch (error) {
    console.error('❌ Error searching fleets:', error);
    return null;
  }
}

/**
 * البحث عن جميع الأساطيل المتاحة للشركة
 */
async function getAllAvailableFleets(companyId) {
  try {
    console.log(`🔍 البحث عن جميع الأساطيل المتاحة للشركة: ${companyId}`);
    
    const vehicles = await Vehicle.find({
      owner: companyId,
      status: 'متاح'
    })
    .populate('owner', 'name phone companyName')
    .select('type capacity city registrationNumber');

    console.log(`✅ تم العثور على ${vehicles.length} مركبة متاحة للشركة`);

    if (vehicles.length === 0) {
      return null;
    }

    // تجميع المركبات حسب المدينة
    const fleetsByCity = {};
    vehicles.forEach(v => {
      const city = v.city || 'غير محدد';
      if (!fleetsByCity[city]) {
        fleetsByCity[city] = [];
      }
      fleetsByCity[city].push({
        type: v.type,
        capacity: v.capacity,
        registrationNumber: v.registrationNumber
      });
    });

    return fleetsByCity;
  } catch (error) {
    console.error('❌ Error getting all fleets:', error);
    return null;
  }
}

/**
 * الحصول على معلومات الأسعار التقريبية
 */
function getPricingInfo(fromCity, toCity) {
  // أسعار تقريبية للمناطق السعودية (يمكن تخصيصها حسب الحاجة)
  const pricingGuide = {
    'الرياض-جدة': '2000-3000 ريال',
    'الرياض-الدمام': '1500-2500 ريال',
    'جدة-الدمام': '2500-3500 ريال',
    'الرياض-أبها': '1800-2800 ريال',
    'جدة-المدينة': '800-1500 ريال',
    'default': '1000-3000 ريال حسب المسافة ونوع الحمولة'
  };

  const route = `${fromCity}-${toCity}`;
  return pricingGuide[route] || pricingGuide['default'];
}

/**
 * معالجة رسالة العميل والرد عليها
 */
async function processChatMessage(messageText, userId, conversationHistory = [], companyId) {
  try {
    console.log(`📨 معالجة رسالة من العميل: ${userId} للشركة: ${companyId}`);
    
    // تحليل الرسالة لمعرفة نوع الاستفسار
    const lowerMessage = messageText.toLowerCase();
    
    let systemContext = `أنت مساعد ذكي لشركة شحن ونقليات في السعودية. اسمك "مساعد الشحن الذكي".

⚠️ قواعد مهمة جداً:
1. أنت تعمل لدى شركة شحن، لديها شاحنات (قاطرات) لنقل الحمولات
2. عندما يسأل العميل عن "حمولة" أو "بضاعة"، فهو يريد شحن بضاعته بشاحناتك
3. الشاحنة = القاطرة = المركبة (هي ملك الشركة)
4. الحمولة = البضاعة = الشحنة (هي ملك العميل)
5. لا تطلب صورة القاطرة أبداً، اطلب فقط صورة الحمولة/البضاعة
6. استخدم فقط المعلومات الحقيقية من قاعدة البيانات، لا تخترع معلومات

مهامك:
1. الرد على استفسارات العملاء عن شحن بضائعهم
2. إخبارهم بالشاحنات المتاحة لدى الشركة
3. تقديم معلومات عن الأسعار التقريبية
4. طلب صور الحمولة/البضاعة (ليس القاطرة!)
5. تحويل المحادثة لخدمة العملاء بعد جمع المعلومات

أسلوب الرد:
- تحدث بالعربية فقط
- كن مهذباً ومحترفاً
- لا تتحدث عن مواضيع خارج نطاق الشحن
- إذا سأل عن موضوع آخر، أعده بلطف لموضوع الشحن`;

    // البحث عن أساطيل متاحة إذا ذكر العميل مدينة
    let fleetSearchResult = '';
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة', 'حائل', 'نجران', 'جازان', 'ينبع', 'القصيم', 'الظهران'];
    
    // البحث عن مدينة محددة في الرسالة
    let foundCity = null;
    for (const city of saudiCities) {
      if (lowerMessage.includes(city)) {
        foundCity = city;
        const fleets = await searchAvailableFleets(city, companyId);
        if (fleets && fleets.length > 0) {
          fleetSearchResult = `\n\n✅ معلومات حقيقية من قاعدة البيانات - لدينا ${fleets.length} شاحنة متاحة في ${city}:\n`;
          fleets.forEach((fleet, index) => {
            fleetSearchResult += `${index + 1}. نوع الشاحنة: ${fleet.type}, الحمولة: ${fleet.capacity}, المدينة: ${fleet.city}\n`;
          });
          fleetSearchResult += '\nهذه معلومات حقيقية من النظام.';
        } else {
          fleetSearchResult = `\n\n❌ للأسف لا توجد شاحنات متاحة حالياً في ${city} حسب قاعدة البيانات.`;
        }
        break;
      }
    }

    // إذا سأل عن الأساطيل المتاحة بشكل عام
    if ((lowerMessage.includes('اسطول') || lowerMessage.includes('شاحن') || lowerMessage.includes('متاح') || lowerMessage.includes('متوفر')) && !foundCity) {
      const allFleets = await getAllAvailableFleets(companyId);
      if (allFleets && Object.keys(allFleets).length > 0) {
        fleetSearchResult = '\n\n✅ معلومات حقيقية من قاعدة البيانات - الشاحنات المتاحة لدينا حسب المدن:\n\n';
        for (const [city, vehicles] of Object.entries(allFleets)) {
          fleetSearchResult += `📍 ${city}: ${vehicles.length} شاحنة متاحة\n`;
          vehicles.forEach((v, i) => {
            fleetSearchResult += `   ${i + 1}. ${v.type} - ${v.capacity}\n`;
          });
          fleetSearchResult += '\n';
        }
        fleetSearchResult += 'هذه معلومات حقيقية من النظام، لا توجد شاحنات في مدن أخرى حالياً.';
      } else {
        fleetSearchResult = '\n\n❌ للأسف لا توجد شاحنات متاحة حالياً حسب قاعدة البيانات.';
      }
    }

    // إضافة معلومات الأسعار إذا ذكر مدينتين
    let pricingInfo = '';
    if (lowerMessage.includes('سعر') || lowerMessage.includes('كم') || lowerMessage.includes('تكلفة')) {
      pricingInfo = '\n\n💰 الأسعار التقريبية تتراوح بين 1000-3000 ريال حسب المسافة ونوع الحمولة والشاحنة.';
    }

    if (fleetSearchResult) {
      systemContext += fleetSearchResult;
    }
    if (pricingInfo) {
      systemContext += pricingInfo;
    }

    // إضافة تعليمات خاصة إذا ذكر "حمولة" أو "قاطرة"
    if (lowerMessage.includes('حمول') || lowerMessage.includes('بضاع') || lowerMessage.includes('شحن')) {
      systemContext += '\n\n⚠️ تذكر: العميل يريد شحن حمولته/بضاعته، اطلب منه صورة الحمولة (ليس القاطرة!)';
    }

    // بناء سياق المحادثة
    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-6), // آخر 6 رسائل فقط للسياق
      { role: 'user', content: messageText }
    ];

    // الحصول على الرد من DeepSeek
    const botResponse = await callDeepSeekChat(messages);

    console.log(`✅ رد البوت: ${botResponse.substring(0, 100)}...`);

    return {
      success: true,
      response: botResponse,
      shouldTransferToHuman: botResponse.includes('سيتواصل معك') || botResponse.includes('خدمة العملاء')
    };

  } catch (error) {
    console.error('❌ Error processing chat message:', error);
    return {
      success: false,
      response: 'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى أو الانتظار لخدمة العملاء.',
      shouldTransferToHuman: true
    };
  }
}

/**
 * معالجة الصور المرسلة من العميل
 */
async function processImageMessage(imageUrl, userId) {
  try {
    const response = `شكراً لإرسال صورة الحمولة! 📸

تم استلام الصورة بنجاح. سيقوم أحد ممثلي خدمة العملاء بمراجعة صورة حمولتك والتواصل معك قريباً لتقديم عرض سعر دقيق.

هل لديك أي معلومات إضافية عن الحمولة؟ (الوزن، الأبعاد، المدينة المطلوبة، إلخ)`;

    return {
      success: true,
      response: response,
      shouldTransferToHuman: true
    };
  } catch (error) {
    console.error('❌ Error processing image:', error);
    return {
      success: false,
      response: 'تم استلام الصورة، سيتواصل معك فريق خدمة العملاء قريباً.',
      shouldTransferToHuman: true
    };
  }
}

/**
 * التحقق من تفعيل البوت للشركة
 */
async function isBotEnabledForCompany(companyId) {
  try {
    const company = await User.findById(companyId);
    return company?.botEnabled === true;
  } catch (error) {
    console.error('❌ Error checking bot status:', error);
    return false;
  }
}

module.exports = {
  callDeepSeekChat,
  searchAvailableFleets,
  getAllAvailableFleets,
  getPricingInfo,
  processChatMessage,
  processImageMessage,
  isBotEnabledForCompany
};
