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
async function searchAvailableFleets(city, userId) {
  try {
    // البحث عن المركبات المتاحة في المدينة المحددة
    const vehicles = await Vehicle.find({
      status: 'متاح',
      city: { $regex: new RegExp(city, 'i') }
    })
    .populate('owner', 'name phone companyName')
    .limit(5);

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
async function processChatMessage(messageText, userId, conversationHistory = []) {
  try {
    // تحليل الرسالة لمعرفة نوع الاستفسار
    const lowerMessage = messageText.toLowerCase();
    
    let systemContext = `أنت مساعد ذكي لتطبيق شحن ونقليات في السعودية. اسمك "مساعد الشحن الذكي".

مهامك:
1. الرد على استفسارات العملاء عن الشحن والنقليات فقط
2. البحث عن الأساطيل المتاحة حسب المنطقة
3. تقديم معلومات عن الأسعار التقريبية
4. طلب صور الحمولة عند الحاجة
5. تحويل المحادثة لخدمة العملاء بعد جمع المعلومات الأساسية

قواعد مهمة:
- تحدث بالعربية فقط
- كن مهذباً ومحترفاً
- لا تتحدث عن مواضيع خارج نطاق الشحن والنقليات
- إذا سأل العميل عن موضوع آخر، أعده بلطف لموضوع الشحن
- اطلب صورة الحمولة إذا لم يرسلها العميل بعد
- بعد الحصول على الصورة أو المعلومات الكافية، قل: "شكراً لك! سيتواصل معك أحد ممثلي خدمة العملاء قريباً"`;

    // البحث عن أساطيل متاحة إذا ذكر العميل مدينة
    let fleetSearchResult = '';
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة', 'حائل', 'نجران', 'جازان', 'ينبع', 'القصيم'];
    
    for (const city of saudiCities) {
      if (lowerMessage.includes(city)) {
        const fleets = await searchAvailableFleets(city, userId);
        if (fleets && fleets.length > 0) {
          fleetSearchResult = `\n\nمعلومات الأساطيل المتاحة في ${city}:\n`;
          fleets.forEach((fleet, index) => {
            fleetSearchResult += `${index + 1}. نوع المركبة: ${fleet.type}, الحمولة: ${fleet.capacity}, المالك: ${fleet.owner}\n`;
          });
        } else {
          fleetSearchResult = `\n\nللأسف لا توجد أساطيل متاحة حالياً في ${city}، لكن سيتواصل معك فريق خدمة العملاء للمساعدة.`;
        }
        break;
      }
    }

    // إضافة معلومات الأسعار إذا ذكر مدينتين
    let pricingInfo = '';
    if (lowerMessage.includes('سعر') || lowerMessage.includes('كم') || lowerMessage.includes('تكلفة')) {
      pricingInfo = '\n\nالأسعار التقريبية تتراوح بين 1000-3000 ريال حسب المسافة ونوع الحمولة والمركبة.';
    }

    if (fleetSearchResult) {
      systemContext += fleetSearchResult;
    }
    if (pricingInfo) {
      systemContext += pricingInfo;
    }

    // بناء سياق المحادثة
    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-6), // آخر 6 رسائل فقط للسياق
      { role: 'user', content: messageText }
    ];

    // الحصول على الرد من DeepSeek
    const botResponse = await callDeepSeekChat(messages);

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
    const response = `شكراً لإرسال الصورة! 📸

تم استلام صورة الحمولة بنجاح. سيقوم أحد ممثلي خدمة العملاء بمراجعتها والتواصل معك قريباً لتقديم عرض سعر دقيق.

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
  getPricingInfo,
  processChatMessage,
  processImageMessage,
  isBotEnabledForCompany
};
