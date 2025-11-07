const OpenAI = require('openai');
const { extractCitiesFromText, calculateDistanceBetweenCities } = require('./distanceService');
const { extractTruckSearchQuery, searchTrucks } = require('./truckSearchService');
const { extractPriceQuery, searchPrice } = require('./priceService');

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
- وظيفتك: مساعدة العملاء في البحث عن الشاحنات وحساب المسافات والأسعار

قواعد صارمة يجب اتباعها:

1. الردود القصيرة والطبيعية:
   - رد بجمل قصيرة ومباشرة (1-3 جمل فقط)
   - لا تكتب فقرات طويلة
   - كن مختصراً ولطيفاً وطبيعياً

2. التحيات والمحادثة الطبيعية (الرسالة الأولى):
   - رد على "السلام عليكم" بـ "وعليكم السلام ورحمة الله وبركاته! كيف أقدر أساعدك؟"
   - رد على "مرحباً" أو "مرحبا" بـ "مرحباً بك! كيف يمكنني مساعدتك؟"
   - رد على "كيف الحال" أو "كيف حالك" بـ "الحمد لله، وأنت كيف حالك؟"
   - رد على "صباح الخير" بـ "صباح النور! كيف أقدر أساعدك؟"
   - رد على "مساء الخير" بـ "مساء النور! كيف يمكنني مساعدتك؟"
   - كن ودوداً ومحترماً وطبيعياً
   - لا تقل "مرحباً بك في شركة X" إلا إذا سأل عن الشركة

3. البحث عن الشاحنات الفارغة:
   - عند البحث عن شاحنات، استخدم البيانات الحقيقية فقط من قاعدة البيانات
   - اذكر الموقع الحالي للشاحنة والوجهات المتاحة بوضوح
   - إذا كانت الشاحنة تذهب لعدة وجهات، اذكرها كلها
   - إذا اختار المستخدم وجهة محددة من الوجهات المتاحة، أكد له التوفر
   - إذا لم توجد شاحنات، اعتذر بلطف واقترح البحث في مدن أخرى

4. حساب المسافات:
   - عندما تستلم بيانات المسافة من النظام، اعرضها مباشرة
   - مثال: "المسافة من جدة إلى مكة: 85 كم، الوقت المتوقع: ساعة واحدة"
   - استخدم البيانات المرسلة من النظام فقط

5. حساب الأسعار:
   - إذا سأل عن السعر، ابحث أولاً في قاعدة البيانات
   - إذا وجدت السعر في destinationPrices، اعرضه مباشرة
   - إذا لم تجد السعر، احسبه: السعر = المسافة × 4.5 ريال
   - مثال: "السعر من جدة إلى مكة (85 كم): 382 ريال"

6. الخصومات حسب الحمولة:
   - إذا سأل عن الخصم، اسأله: "ما نوع الحمولة أو البضاعة؟"
   - بعد معرفة نوع الحمولة، حدد إذا كانت ثقيلة أو خفيفة:
     * حمولة ثقيلة (مواد بناء، حديد، إسمنت، رمل، طوب): خصم 15%
     * حمولة خفيفة (أثاث، إلكترونيات، ملابس، مواد غذائية): خصم 5-10%
     * أثاث: 10%
     * مواد غذائية: 5%
     * إلكترونيات: 7%
     * مواد بناء وثقيلة: 15%
     * أخرى: 5%
   - مثال: "بما أن الحمولة ثقيلة (مواد بناء)، لك خصم 15%!"

7. الأسئلة خارج نطاق المعرفة:
   - إذا سأل عن شيء لا علاقة له بالشحن أو النقل أو الشاحنات
   - قل له: "عذراً، ليس لدي معلومات عن هذا الموضوع. هل تريدني أن أوجهك لأحد موظفي الشركة؟"
   - كن مهذباً ومحترماً

8. أمثلة على الردود الصحيحة:
   - "وعليكم السلام! كيف أقدر أساعدك؟"
   - "المسافة من جدة إلى مكة: 85 كم"
   - "السعر: 382 ريال"
   - "ما نوع الحمولة عشان أحسب لك الخصم؟"
   - "بما أن الحمولة ثقيلة، لك خصم 15%!"
   - "عذراً، ليس لدي معلومات عن هذا. هل تريدني أن أوجهك لأحد الموظفين؟"

9. عند استلام بيانات من الأدوات:
   - استخدم البيانات الحقيقية فقط
   - لا تضيف معلومات من عندك
   - رد بشكل طبيعي وبسيط
   - اعرض المعلومات مباشرة بدون تعقيد

تذكر: كن قصيراً، ودوداً، طبيعياً، واستخدم البيانات الحقيقية فقط!`;

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
    
    // 2. التحقق من السؤال عن السعر
    if (!toolResults) {
      const priceQuery = extractPriceQuery(userMessage);
      if (priceQuery) {
        try {
          console.log('تم اكتشاف طلب سعر:', priceQuery);
          const priceResult = await searchPrice(priceQuery);
          
          if (priceResult.success) {
            toolResults = {
              type: 'price_found',
              data: priceResult
            };
          }
        } catch (error) {
          console.error('خطأ في البحث عن السعر:', error.message);
        }
      }
    }
    
    // 3. التحقق من وجود مدن في الرسالة (لحساب المسافة)
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
      max_tokens: 300,
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
      trucksInfo += `   - الوجهات المتاحة: ${truck.preferredDestination}\n`;
      trucksInfo += `   - متاحة من: ${new Date(truck.availabilityDate).toLocaleDateString('ar-SA')}\n`;
      if (truck.companyName) {
        trucksInfo += `   - الشركة: ${truck.companyName}\n`;
      }
      trucksInfo += `\n`;
    });
    
    if (data.count > 3) {
      trucksInfo += `وهناك ${data.count - 3} شاحنة أخرى متاحة.\n`;
    }
    
    trucksInfo += `\nأخبر المستخدم بالنتائج بشكل مختصر وواضح. اذكر الموقع الحالي والوجهات المتاحة. إذا كانت الشاحنة تذهب لعدة وجهات، اذكرها.`;
    
    return trucksInfo;
  }
  
  if (toolResults.type === 'price_found') {
    const data = toolResults.data;
    return `تم العثور على السعر في قاعدة البيانات:
- من: ${data.from}
- إلى: ${data.to}
- السعر: ${data.price} ريال
- نوع الشاحنة: ${data.truckType}

الآن أخبر المستخدم بالسعر بشكل قصير ومباشر. إذا سأل عن الخصم، اسأله عن نوع الحمولة.`;
  }
  
  if (toolResults.type === 'distance_calculated') {
    const data = toolResults.data;
    return `تم حساب المسافة بنجاح:
- من: ${data.from.city}
- إلى: ${data.to.city}
- المسافة: ${data.distance.kilometers} كم
- الوقت المتوقع: ${data.duration.hours.toFixed(1)} ساعة

الآن أخبر المستخدم بالنتيجة بشكل قصير ومباشر.`;
  }
  
  return '';
}

/**
 * حساب السعر النهائي مع رد ذكي (مع دعم الخصومات حسب الحمولة)
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
 * معالجة طلب الحجز من خلال الذكاء الاصطناعي
 * @param {Object} bookingInfo - معلومات الحجز
 * @param {Array} conversationHistory - تاريخ المحادثة
 * @returns {Promise<Object>} - رد البوت مع نتيجة الحجز
 */
async function processBookingRequest(bookingInfo, conversationHistory = []) {
  try {
    // هنا يمكن إضافة منطق إنشاء الحجز الفعلي
    // حالياً نرجع رد بسيط
    
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'system', content: `المستخدم يريد إنشاء حجز بالمعلومات التالية: ${JSON.stringify(bookingInfo)}. أخبره أن طلبه قيد المعالجة وسيتم التواصل معه قريباً.` }
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
      bookingInfo: bookingInfo
    };
    
  } catch (error) {
    console.error('خطأ في معالجة طلب الحجز:', error);
    return {
      success: false,
      response: 'عذراً، حدث خطأ في معالجة طلب الحجز. يرجى المحاولة مرة أخرى.',
      error: error.message
    };
  }
}

module.exports = {
  processUserMessage,
  calculatePriceWithAI,
  isBotEnabledForCompany,
  processBookingRequest
};
