const axios = require('axios');
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
        temperature: 0.8,
        max_tokens: 200, // ردود قصيرة
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
 * البحث عن الأساطيل الفارغة حسب المنطقة - الإصدار الصحيح 100%
 */
async function searchAvailableFleets(city, companyId) {
  try {
    console.log(`🔍 البحث الحقيقي: المدينة="${city}" | الشركة="${companyId}"`);
    
    // البحث الصحيح باستخدام الحقول الحقيقية من النموذج
    const vehicles = await Vehicle.find({
      user: companyId,                    // الحقل الصحيح: user (ليس owner)
      status: 'متاح',                     // الحالة: متاح
      currentLocation: { $regex: new RegExp(city, 'i') }  // الحقل الصحيح: currentLocation (ليس city)
    })
    .populate('user', 'name phone companyName')
    .select('vehicleName vehicleType driverName currentLocation licensePlate')
    .limit(10);

    console.log(`✅ النتيجة الحقيقية: ${vehicles.length} شاحنة متاحة في ${city}`);
    
    if (vehicles.length === 0) {
      console.log(`❌ لا توجد شاحنات في ${city}`);
      return null;
    }

    // تنسيق النتائج الحقيقية
    const fleetInfo = vehicles.map(v => ({
      name: v.vehicleName,
      type: v.vehicleType || 'غير محدد',
      driver: v.driverName,
      location: v.currentLocation,
      plate: v.licensePlate,
      ownerName: v.user.companyName || v.user.name,
      ownerPhone: v.user.phone
    }));

    return fleetInfo;
  } catch (error) {
    console.error('❌ خطأ في البحث:', error);
    return null;
  }
}

/**
 * البحث عن جميع الأساطيل المتاحة للشركة - الإصدار الصحيح 100%
 */
async function getAllAvailableFleets(companyId) {
  try {
    console.log(`🔍 البحث عن جميع الأساطيل للشركة: ${companyId}`);
    
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح'
    })
    .select('vehicleName vehicleType driverName currentLocation licensePlate');

    console.log(`✅ إجمالي الشاحنات المتاحة: ${vehicles.length}`);

    if (vehicles.length === 0) {
      console.log(`❌ لا توجد شاحنات متاحة للشركة`);
      return null;
    }

    // تجميع حسب المدينة
    const fleetsByCity = {};
    vehicles.forEach(v => {
      const city = v.currentLocation || 'غير محدد';
      if (!fleetsByCity[city]) {
        fleetsByCity[city] = [];
      }
      fleetsByCity[city].push({
        name: v.vehicleName,
        type: v.vehicleType || 'غير محدد',
        driver: v.driverName
      });
    });

    console.log(`📊 المدن المتاحة:`, Object.keys(fleetsByCity));
    return fleetsByCity;
  } catch (error) {
    console.error('❌ خطأ في جلب الأساطيل:', error);
    return null;
  }
}

/**
 * معالجة رسالة العميل والرد عليها
 */
async function processChatMessage(messageText, userId, conversationHistory = [], companyId) {
  try {
    console.log(`📨 رسالة جديدة من ${userId} للشركة ${companyId}: "${messageText}"`);
    
    const lowerMessage = messageText.toLowerCase();
    
    // البحث في قاعدة البيانات أولاً
    let realData = '';
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة', 'حائل', 'نجران', 'جازان', 'ينبع', 'القصيم', 'الظهران'];
    
    // إذا ذكر مدينة محددة
    let foundCity = null;
    for (const city of saudiCities) {
      if (lowerMessage.includes(city)) {
        foundCity = city;
        const fleets = await searchAvailableFleets(city, companyId);
        
        if (fleets && fleets.length > 0) {
          realData = `\n\n[بيانات حقيقية من النظام]\nلدينا ${fleets.length} شاحنة متاحة في ${city}:\n`;
          fleets.forEach((f, i) => {
            realData += `${i + 1}. ${f.name} - ${f.type} - السائق: ${f.driver}\n`;
          });
        } else {
          realData = `\n\n[بيانات حقيقية من النظام]\nللأسف لا توجد شاحنات متاحة في ${city} حالياً.`;
        }
        break;
      }
    }

    // إذا سأل عن الأساطيل بشكل عام
    if (!foundCity && (lowerMessage.includes('اسطول') || lowerMessage.includes('شاحن') || lowerMessage.includes('متاح') || lowerMessage.includes('متوفر') || lowerMessage.includes('اين'))) {
      const allFleets = await getAllAvailableFleets(companyId);
      
      if (allFleets && Object.keys(allFleets).length > 0) {
        realData = '\n\n[بيانات حقيقية من النظام]\nالشاحنات المتاحة لدينا:\n\n';
        for (const [city, vehicles] of Object.entries(allFleets)) {
          realData += `📍 ${city}: ${vehicles.length} شاحنة\n`;
        }
        realData += '\nهذه فقط المدن المتاحة حالياً.';
      } else {
        realData = '\n\n[بيانات حقيقية من النظام]\nللأسف لا توجد شاحنات متاحة حالياً.';
      }
    }

    // System context - أسلوب بائع محترف
    let systemContext = `أنت موظف مبيعات محترف في شركة شحن سعودية. اسمك "مساعد الشحن".

🎯 هدفك الوحيد: إقناع العميل بالحجز فوراً!

📋 قواعد صارمة:
1. ردودك قصيرة (2-3 جمل فقط) - مثل الإنسان العادي
2. أسلوبك حماسي ومقنع - تجذب العميل
3. استخدم فقط البيانات الحقيقية من [بيانات حقيقية من النظام]
4. إذا لم تجد بيانات حقيقية، قل "للأسف لا يوجد" - لا تخترع!
5. الحمولة = بضاعة العميل | الشاحنة = مركبتنا
6. اطلب صورة الحمولة فقط (ليس الشاحنة!)

🔥 أسلوب الرد:
- كن حماسياً: "عندنا الحل المثالي لك!"
- اجعله يشعر بالحظ: "أنت محظوظ! لدينا شاحنات متاحة الآن"
- خلق الإلحاح: "احجز الآن قبل ما تنتهي!"
- كن واثقاً: "نضمن لك خدمة ممتازة"

⚠️ ممنوع منعاً باتاً:
- الردود الطويلة (أكثر من 3 جمل)
- اختراع معلومات غير موجودة
- طلب صورة الشاحنة
- الأسلوب البارد الرسمي`;

    if (realData) {
      systemContext += realData;
      systemContext += '\n\n⚠️ استخدم فقط هذه البيانات الحقيقية! لا تخترع أي معلومات أخرى!';
    }

    // بناء المحادثة
    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-4), // آخر 4 رسائل فقط
      { role: 'user', content: messageText }
    ];

    // الحصول على الرد
    const botResponse = await callDeepSeekChat(messages);
    
    console.log(`✅ رد البوت: ${botResponse}`);

    return {
      success: true,
      response: botResponse,
      shouldTransferToHuman: botResponse.includes('سيتواصل معك') || botResponse.includes('خدمة العملاء')
    };

  } catch (error) {
    console.error('❌ خطأ في معالجة الرسالة:', error);
    return {
      success: false,
      response: 'عذراً، حدث خطأ. سيتواصل معك فريقنا قريباً!',
      shouldTransferToHuman: true
    };
  }
}

/**
 * معالجة الصور المرسلة من العميل
 */
async function processImageMessage(imageUrl, userId) {
  try {
    const response = `ممتاز! 📸 استلمنا صورة الحمولة

فريقنا يراجعها الآن وسيرسل لك عرض سعر خلال دقائق!

في هذه الأثناء، هل لديك تفاصيل إضافية؟ (الوزن، الأبعاد، التاريخ المطلوب)`;

    return {
      success: true,
      response: response,
      shouldTransferToHuman: true
    };
  } catch (error) {
    return {
      success: false,
      response: 'تم استلام الصورة! سنتواصل معك قريباً',
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
    console.error('❌ خطأ في التحقق من البوت:', error);
    return false;
  }
}

module.exports = {
  callDeepSeekChat,
  searchAvailableFleets,
  getAllAvailableFleets,
  processChatMessage,
  processImageMessage,
  isBotEnabledForCompany
};
