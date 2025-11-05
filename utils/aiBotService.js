const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Post = require('../models/Post');
const EmptyTruckAd = require('../models/EmptyTruckAd');
const ShipmentAd = require('../models/ShipmentAd');

/**
 * استدعاء DeepSeek API الرسمي للحصول على رد ذكي
 */
async function callAIChat(messages) {
  try {
    console.log('🤖 Calling DeepSeek API...');
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('❌ DEEPSEEK_API_KEY is not configured');
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    // تحويل الرسائل إلى صيغة OpenAI (DeepSeek متوافق مع OpenAI)
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('📝 Sending', formattedMessages.length, 'messages to DeepSeek');
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // النموذج الأساسي
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API Error:', response.status, errorText);
      throw new Error(`DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    
    console.log('✅ DeepSeek response received:', text.substring(0, 100));
    return text;
  } catch (error) {
    console.error('❌ Error calling DeepSeek API:', error.message);
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
    console.log(`\n========== NEW MESSAGE ==========`);
    console.log(`📨 رسالة: "${messageText}"`);
    console.log(`🏭 Company ID: ${companyId}`);
    console.log(`📊 Conversation history length: ${conversationHistory.length}`);
    
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
    if (lowerMessage.includes('اسطول') || lowerMessage.includes('شاحن') || lowerMessage.includes('متاح') || lowerMessage.includes('فارغ')) {
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
    let systemContext = `أنت مساعد ذكاء اصطناعي احترافي لشركة شحن سعودية.

🎯 قواعد صارمة جداً - اتبعها بدقة:

1. **الهوية:**
   - أنت ذكاء اصطناعي، لست موظف بشري
   - قل دائماً "أنا مساعد ذكاء اصطناعي"
   - إذا طلب موظف بشري: قل "سأحولك لموظف بشري الآن"

2. **أسلوب الرد:**
   - ردودك قصيرة جداً (2-3 جمل فقط)
   - رد فقط على السؤال المطروح
   - لا تعطي معلومات إضافية إلا إذا طُلبت منك

3. **البيانات:**
   - استخدم فقط البيانات المرفقة أدناه
   - إذا لم تجد بيانات: قل "دعني أحولك لموظف بشري"
   - لا تخترع أي معلومات أبداً

4. **المسافات:**
   - لا تحسب المسافات بنفسك
   - إذا سأل عن المسافة: قل "للمسافة الدقيقة، تواصل مع موظفنا"
   - لا تعطي أرقام للمسافات إلا إذا كانت في البيانات المرفقة

5. **الأسعار:**
   - لا تعطي أسعار إلا إذا سأل العميل مباشرة
   - قل دائماً "السعر المتوقع تقريباً X-Y ريال (غير نهائي)"
   - لا تقل "السعر الحقيقي" أو "السعر الفعلي" أبداً

6. **تفاصيل الشاحنات:**
   - لا تعطي تفاصيل الشاحنات إلا إذا سأل العميل
   - إذا سأل: أعطه التفاصيل من البيانات المرفقة فقط

⚠️ ممنوع منعاً باتاً:
- اختراع أرقام للمسافات
- قول "السعر الحقيقي"
- إعطاء معلومات لم يطلبها العميل
- تكرار نفس الكلام
- ادعاء أنك موظف بشري

✅ أمثلة على الردود الصحيحة:

السؤال: "السلام عليكم"
الرد: "وعليكم السلام! كيف يمكنني مساعدتك؟"

السؤال: "عندي حمولة من الرياض لجدة"
الرد: "ممتاز! ما نوع الحمولة؟"

السؤال: "كم السعر؟"
الرد: "السعر المتوقع تقريباً 1500-2000 ريال (غير نهائي). للسعر الدقيق، تواصل مع موظفنا"

السؤال: "هل عندكم شاحنات فارغة؟"
الرد: (إذا موجودة في البيانات) "نعم! لدينا شاحنات متاحة"
الرد: (إذا غير موجودة) "للأسف لا توجد حالياً"`;

    if (realData) {
      systemContext += `\n\n[البيانات الحقيقية من قاعدة البيانات]${realData}\n\n⚠️ استخدم هذه البيانات فقط! لا تخترع معلومات!`;
    }

    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-4),
      { role: 'user', content: messageText }
    ];

    const botResponse = await callAIChat(messages);
    
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

كيف يمكنني مساعدتك اليوم؟`
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
  callAIChat,
  searchAvailableFleets,
  getAllAvailableFleets,
  processChatMessage,
  sendWelcomeMessage,
  processImageMessage,
  isBotEnabledForCompany
};
