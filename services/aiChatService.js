const OpenAI = require('openai');
const { extractCitiesFromText, calculateDistanceBetweenCities } = require('./distanceService');
const { extractTruckSearchQuery, searchTrucks } = require('./truckSearchService');

// إنشاء عميل Groq (متوافق مع OpenAI SDK)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key-here',
  baseURL: 'https://api.groq.com/openai/v1'
});

// System Prompt - يحدد سلوك البوت بشكل صارم
const SYSTEM_PROMPT = `أنت مساعد ذكي لتطبيق شحن ونقل البضائع. اسمك "مساعد الشحن".

معلومات عنك:
- تم تطويرك بواسطة: صلاح مهدلي
- الشركة: تطبيق الشحن والنقل
- وظيفتك: مساعدة العملاء في البحث عن الشاحنات وحساب أسعار الشحن

قواعد صارمة يجب اتباعها:

1. الردود القصيرة:
   - رد بجمل قصيرة ومباشرة (1-3 جمل فقط)
   - لا تكتب فقرات طويلة
   - كن مختصراً ولطيفاً

2. التحيات والمحادثة:
   - رد على السلام بـ "وعليكم السلام ورحمة الله وبركاته" أو "وعليكم السلام"
   - رد على "مرحباً" بـ "مرحباً بك! كيف يمكنني مساعدتك؟"
   - رد على "كيف الحال" بـ "الحمد لله، وأنت كيف حالك؟"
   - كن ودوداً ومحترماً وطبيعياً

3. المعلومات المحظورة:
   - لا تعطي أسعار من عندك أبداً
   - لا تعطي معلومات عن مدن أو مسافات من عندك
   - لا تخترع معلومات
   - إذا لم تعرف شيئاً، اطلب من المستخدم توضيحه

4. البحث عن الشاحنات:
   - عند البحث عن شاحنات، استخدم البيانات الحقيقية فقط
   - اذكر الموقع الحالي للشاحنة والوجهات المتاحة
   - إذا لم توجد شاحنات، اعتذر بلطف

5. طلب المعلومات:
   - إذا سأل عن السعر: اطلب منه اسم المدينتين (من أين إلى أين)
   - إذا سأل عن الخصم: اطلب منه المسافة أولاً
   - كن واضحاً في طلباتك

6. أمثلة على الردود الصحيحة:
   - "وعليكم السلام! كيف يمكنني مساعدتك؟"
   - "الحمد لله، شكراً لسؤالك. كيف يمكنني خدمتك؟"
   - "لحساب السعر، أخبرني من أين إلى أين؟"
   - "تم تطويري بواسطة المطور صلاح مهدلي"

7. أمثلة على الردود الخاطئة (لا تفعلها):
   - ❌ "السعر من الرياض إلى جدة هو 5000 ريال" (لا تخترع أسعار)
   - ❌ "المسافة بين الرياض وجدة 950 كم" (لا تخترع مسافات)
   - ❌ "يمكنك الحصول على خصم 20%" (لا تعطي خصومات من عندك)

8. عند استلام بيانات من الأدوات:
   - استخدم البيانات الحقيقية فقط
   - لا تضيف معلومات من عندك
   - رد بشكل طبيعي وبسيط

تذكر: كن قصيراً، ودوداً، ولا تخترع معلومات!`;

/**
 * معالجة رسالة المستخدم مع الذكاء الاصطناعي
 * @param {string} userMessage - رسالة المستخدم
 * @param {Array} conversationHistory - تاريخ المحادثة
 * @returns {Promise<Object>} - رد البوت مع الإجراءات المطلوبة
 */
async function processUserMessage(userMessage, conversationHistory = []) {
  try {
    let toolResults = null;
    
    // 1. التحقق من البحث عن شاحنات
    const truckQuery = extractTruckSearchQuery(userMessage);
    if (truckQuery) {
      try {
        console.log('تم اكتشاف طلب بحث عن شاحنات:', truckQuery);
        const searchResult = await searchTrucks(truckQuery);
        
        if (searchResult.success) {
          toolResults = {
            type: 'truck_search',
            data: searchResult
          };
        }
      } catch (error) {
        console.error('خطأ في البحث عن الشاحنات:', error.message);
      }
    }
    
    // 2. التحقق من وجود مدن في الرسالة (لحساب المسافة)
    if (!toolResults) {
      const cities = extractCitiesFromText(userMessage);
      if (cities) {
        try {
          console.log(`تم اكتشاف مدن: ${cities.from} → ${cities.to}`);
          const distanceResult = await calculateDistanceBetweenCities(cities.from, cities.to);
          
          if (distanceResult.success) {
            toolResults = {
              type: 'distance_calculated',
              data: distanceResult
            };
          }
        } catch (error) {
          console.error('خطأ في حساب المسافة:', error.message);
        }
      }
    }
    
    // بناء رسائل المحادثة
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];
    
    // إذا كان لدينا نتائج من الأدوات، أضفها
    if (toolResults) {
      const toolMessage = formatToolResultForAI(toolResults);
      messages.push({ role: 'system', content: toolMessage });
    }
    
    // استدعاء Groq API (مجاني!)
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // نموذج ذكي ومجاني
      messages: messages,
      temperature: 0.7,
      max_tokens: 300, // زيادة الحد لعرض نتائج الشاحنات
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    return {
      success: true,
      response: aiResponse,
      toolResults: toolResults,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      ]
    };
    
  } catch (error) {
    console.error('خطأ في معالجة الرسالة:', error);
    
    // رد احتياطي في حالة فشل API
    return {
      success: false,
      response: 'عذراً، حدث خطأ مؤقت. يرجى المحاولة مرة أخرى.',
      error: error.message
    };
  }
}

/**
 * تنسيق نتائج الأدوات للذكاء الاصطناعي
 */
function formatToolResultForAI(toolResults) {
  if (toolResults.type === 'truck_search') {
    const data = toolResults.data;
    
    if (data.count === 0) {
      return `لم يتم العثور على شاحنات ${data.searchDescription || ''}.

أخبر المستخدم بلطف أنه لا توجد شاحنات متاحة حالياً، واقترح عليه المحاولة لاحقاً أو البحث في مدن أخرى.`;
    }
    
    let trucksInfo = `تم العثور على ${data.count} شاحنة ${data.searchDescription || ''}:\n\n`;
    
    data.trucks.slice(0, 3).forEach((truck, index) => {
      trucksInfo += `${index + 1}. شاحنة ${truck.truckType}\n`;
      trucksInfo += `   - الموقع الحالي: ${truck.currentLocation}\n`;
      trucksInfo += `   - الوجهات: ${truck.preferredDestination}\n`;
      trucksInfo += `   - متاحة من: ${new Date(truck.availabilityDate).toLocaleDateString('ar-SA')}\n`;
      if (truck.companyName) {
        trucksInfo += `   - الشركة: ${truck.companyName}\n`;
      }
      trucksInfo += `\n`;
    });
    
    if (data.count > 3) {
      trucksInfo += `وهناك ${data.count - 3} شاحنة أخرى متاحة.\n`;
    }
    
    trucksInfo += `\nأخبر المستخدم بالنتائج بشكل مختصر وواضح. اذكر الموقع الحالي والوجهات المتاحة.`;
    
    return trucksInfo;
  }
  
  if (toolResults.type === 'distance_calculated') {
    const data = toolResults.data;
    return `تم حساب المسافة بنجاح:
- من: ${data.from.city}, ${data.from.country}
- إلى: ${data.to.city}, ${data.to.country}
- المسافة: ${data.distance.kilometers} كيلومتر
- الوقت المتوقع: ${data.duration.hours} ساعة

الآن أخبر المستخدم بالنتيجة بشكل قصير، واسأله عن نوع الحمولة لحساب السعر النهائي.`;
  }
  
  return '';
}

/**
 * حساب السعر النهائي مع رد ذكي
 * @param {string} cargoType - نوع الحمولة
 * @param {number} distance - المسافة بالكيلومتر
 * @param {Array} conversationHistory - تاريخ المحادثة
 * @returns {Promise<Object>} - رد البوت مع السعر
 */
async function calculatePriceWithAI(cargoType, distance, conversationHistory = []) {
  try {
    const { calculatePrice } = require('./pricingService');
    
    // حساب السعر
    const pricing = calculatePrice({
      cargoType: cargoType,
      distance: distance,
      weightCategory: 'medium'
    });
    
    // تنسيق النتيجة للذكاء الاصطناعي
    const toolMessage = `تم حساب السعر:
- نوع الحمولة: ${pricing.cargo_type}
- المسافة: ${pricing.distance} كم
- السعر الأساسي: ${pricing.subtotal.toFixed(2)} ${pricing.currency}
${pricing.discount_percentage > 0 ? `- الخصم (${pricing.discount_percentage}%): -${pricing.discount_amount.toFixed(2)} ${pricing.currency}` : ''}
- السعر النهائي: ${pricing.final_price.toFixed(2)} ${pricing.currency}

أخبر المستخدم بالسعر بشكل قصير وواضح. ${pricing.discount_percentage > 0 ? 'اذكر الخصم بطريقة إيجابية!' : ''}`;
    
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'system', content: toolMessage }
    ];
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.7,
      max_tokens: 150
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    return {
      success: true,
      response: aiResponse,
      pricing: pricing,
      conversationHistory: [
        ...conversationHistory,
        { role: 'system', content: `تم حساب السعر: ${pricing.final_price} ${pricing.currency}` },
        { role: 'assistant', content: aiResponse }
      ]
    };
    
  } catch (error) {
    console.error('خطأ في حساب السعر:', error);
    return {
      success: false,
      response: 'عذراً، حدث خطأ في حساب السعر. يرجى المحاولة مرة أخرى.',
      error: error.message
    };
  }
}

/**
 * التحقق من تفعيل البوت للشركة
 * @param {string} companyId - معرف الشركة
 * @returns {Promise<boolean>} - true إذا كان البوت مفعّل
 */
async function isBotEnabledForCompany(companyId) {
  try {
    const User = require('../models/User');
    const company = await User.findById(companyId);
    return company?.botEnabled === true;
  } catch (error) {
    console.error('خطأ في التحقق من تفعيل البوت:', error);
    return false;
  }
}

/**
 * إرسال رسالة ترحيب للمستخدم الجديد
 * @param {string} companyId - معرف الشركة
 * @returns {Promise<Object>} - {success, response}
 */
async function sendWelcomeMessage(companyId) {
  try {
    const User = require('../models/User');
    const company = await User.findById(companyId).select('companyName name');
    const companyName = company?.companyName || company?.name || 'شركتنا';

    return {
      success: true,
      response: `مرحباً بك في ${companyName}! 👋

كيف أقدر أساعدك اليوم؟ 😊`
    };
  } catch (error) {
    console.error('خطأ في إرسال رسالة الترحيب:', error);
    return {
      success: true,
      response: `مرحباً بك! 👋

كيف أقدر أساعدك اليوم؟ 😊`
    };
  }
}

module.exports = {
  processUserMessage,
  calculatePriceWithAI,
  isBotEnabledForCompany,
  sendWelcomeMessage
};

/**
 * معالجة طلب حجز شاحنة من المستخدم
 * @param {Object} bookingInfo - معلومات الحجز
 * @param {Array} conversationHistory - تاريخ المحادثة
 * @returns {Promise<Object>} - رد البوت مع تأكيد الحجز
 */
async function processBookingRequest(bookingInfo, conversationHistory = []) {
  try {
    const { createBooking } = require('./bookingService');
    
    // إنشاء الحجز
    const result = await createBooking(bookingInfo);
    
    if (!result.success) {
      return {
        success: false,
        response: `عذراً، حدث خطأ في إنشاء الحجز: ${result.message}`,
        error: result.message
      };
    }
    
    // تنسيق النتيجة للذكاء الاصطناعي
    const toolMessage = `تم إنشاء طلب الحجز بنجاح! 🎉

معلومات الحجز:
- رقم الطلب: ${result.booking._id}
- العميل: ${result.booking.customerName}
- الهاتف: ${result.booking.customerPhone}
- من: ${result.booking.fromCity}
- إلى: ${result.booking.toCity}
- المسافة: ${result.booking.distance} كم
- السعر المتفق عليه: ${result.booking.agreedPrice} ${result.booking.currency}
- موعد الاستلام: ${new Date(result.booking.requestedPickupDate).toLocaleDateString('ar-SA')}

معلومات السائق:
- الاسم: ${result.driver.name}
${result.driver.companyName ? `- الشركة: ${result.driver.companyName}` : ''}
- الهاتف: ${result.driver.phone}

تم إرسال الطلب للسائق وسيتواصل معك قريباً!

أخبر المستخدم بالنتيجة بشكل مختصر وودود، واذكر أن السائق سيتواصل معه قريباً.`;
    
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'system', content: toolMessage }
    ];
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.7,
      max_tokens: 200
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    return {
      success: true,
      response: aiResponse,
      booking: result.booking,
      driver: result.driver,
      conversationHistory: [
        ...conversationHistory,
        { role: 'system', content: `تم إنشاء حجز: ${result.booking._id}` },
        { role: 'assistant', content: aiResponse }
      ]
    };
    
  } catch (error) {
    console.error('خطأ في معالجة طلب الحجز:', error);
    return {
      success: false,
      response: 'عذراً، حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مرة أخرى.',
      error: error.message
    };
  }
}

module.exports = {
  processUserMessage,
  calculatePriceWithAI,
  processBookingRequest,
  isBotEnabledForCompany,
  sendWelcomeMessage
};
