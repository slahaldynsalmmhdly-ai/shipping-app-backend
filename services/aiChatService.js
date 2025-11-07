const OpenAI = require('openai');
const { extractCitiesFromText, calculateDistanceBetweenCities } = require('./distanceService');

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
- وظيفتك: مساعدة العملاء في حساب أسعار الشحن

قواعد صارمة يجب اتباعها:

1. الردود القصيرة:
   - رد بجمل قصيرة ومباشرة (1-3 جمل فقط)
   - لا تكتب فقرات طويلة
   - كن مختصراً ولطيفاً

2. التحيات والمحادثة:
   - رد على التحيات بشكل طبيعي (السلام عليكم، مرحباً، كيف الحال)
   - كن ودوداً ومحترماً
   - تصرف كإنسان طبيعي

3. المعلومات المحظورة:
   - لا تعطي أسعار من عندك أبداً
   - لا تعطي معلومات عن مدن أو مسافات من عندك
   - لا تخترع معلومات
   - إذا لم تعرف شيئاً، اطلب من المستخدم توضيحه

4. طلب المعلومات:
   - إذا سأل عن السعر: اطلب منه صورة الحمولة أو اسم المدينتين
   - إذا سأل عن الخصم: اطلب منه المسافة أولاً
   - كن واضحاً في طلباتك

5. أمثلة على الردود الصحيحة:
   - "وعليكم السلام! كيف يمكنني مساعدتك؟"
   - "الحمد لله، شكراً لسؤالك. كيف يمكنني خدمتك؟"
   - "لحساب السعر، أرسل لي صورة الحمولة أو أخبرني من أين إلى أين؟"
   - "تم تطويري بواسطة المطور صلاح مهدلي"

6. أمثلة على الردود الخاطئة (لا تفعلها):
   - ❌ "السعر من الرياض إلى جدة هو 5000 ريال" (لا تخترع أسعار)
   - ❌ "المسافة بين الرياض وجدة 950 كم" (لا تخترع مسافات)
   - ❌ "يمكنك الحصول على خصم 20%" (لا تعطي خصومات من عندك)

7. عند استلام بيانات من الأدوات:
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
    // التحقق من وجود مدن في الرسالة
    const cities = extractCitiesFromText(userMessage);
    let toolResults = null;
    
    // إذا وجدنا مدن، احسب المسافة تلقائياً
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
      max_tokens: 200, // حد أقصى للردود القصيرة
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
 * معالجة نتيجة تحليل الصورة
 * @param {Object} analysisResult - نتيجة تحليل الصورة
 * @param {Array} conversationHistory - تاريخ المحادثة
 * @returns {Promise<Object>} - رد البوت
 */
async function processImageAnalysis(analysisResult, conversationHistory = []) {
  try {
    // تنسيق نتيجة التحليل
    const toolMessage = `تم تحليل الصورة بنجاح:
- نوع الحمولة: ${analysisResult.cargo_type}
- الوصف: ${analysisResult.description}
- نسبة الثقة: ${Math.round(analysisResult.confidence * 100)}%

الآن أخبر المستخدم بالنتيجة بشكل قصير وودود، واطلب منه المسافة (من أين إلى أين) لحساب السعر.`;
    
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
      analysisResult: analysisResult,
      conversationHistory: [
        ...conversationHistory,
        { role: 'system', content: `تم تحليل صورة: ${analysisResult.cargo_type}` },
        { role: 'assistant', content: aiResponse }
      ]
    };
    
  } catch (error) {
    console.error('خطأ في معالجة تحليل الصورة:', error);
    return {
      success: false,
      response: 'تم تحليل الصورة، لكن حدث خطأ في المعالجة. يرجى المحاولة مرة أخرى.',
      error: error.message
    };
  }
}

/**
 * تنسيق نتائج الأدوات للذكاء الاصطناعي
 */
function formatToolResultForAI(toolResults) {
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

module.exports = {
  processUserMessage,
  processImageAnalysis,
  calculatePriceWithAI
};
