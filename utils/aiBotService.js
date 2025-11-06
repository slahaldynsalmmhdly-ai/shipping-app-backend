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
        temperature: 0.8, // زيادة الإبداع للمراوغة
        max_tokens: 200,  // زيادة الطول للردود التفصيلية
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
 * البحث عن الأساطيل المتاحة مع الأسعار والخصومات والصور - محدث!
 */
async function searchAvailableFleets(city, companyId) {
  try {
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح',
      $or: [
        { departureCity: { $regex: new RegExp(city, 'i') } },
        { 'cities.city': { $regex: new RegExp(city, 'i') } }
      ]
    })
    .populate('user', 'name phone companyName')
    .select('vehicleName vehicleType vehicleColor vehicleModel driverName departureCity cities discount imageUrls currency transportType')
    .limit(5);

    if (vehicles.length === 0) return null;

    return vehicles.map(v => {
      // البحث عن السعر للمدينة المطلوبة
      let priceInfo = null;
      if (v.transportType === 'domestic' && v.cities) {
        const cityData = v.cities.find(c => c.city.toLowerCase().includes(city.toLowerCase()));
        if (cityData) {
          priceInfo = {
            price: cityData.price,
            discount: v.discount || 0,
            finalPrice: cityData.price - (cityData.price * (v.discount || 0) / 100),
            currency: v.currency || 'ريال'
          };
        }
      }

      return {
        name: v.vehicleName,
        type: v.vehicleType || 'غير محدد',
        color: v.vehicleColor || 'غير محدد',
        model: v.vehicleModel || 'غير محدد',
        driver: v.driverName,
        location: v.departureCity,
        priceInfo: priceInfo,
        hasImages: v.imageUrls && v.imageUrls.length > 0,
        imageCount: v.imageUrls ? v.imageUrls.length : 0,
        imageUrls: v.imageUrls || []
      };
    });
  } catch (error) {
    console.error('❌ خطأ في البحث:', error);
    return null;
  }
}

/**
 * البحث عن جميع الأساطيل المتاحة مع الأسعار - محدث!
 */
async function getAllAvailableFleets(companyId) {
  try {
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح'
    }).select('vehicleName vehicleType vehicleColor vehicleModel departureCity cities discount imageUrls currency transportType');

    if (vehicles.length === 0) return null;

    const fleetsByCity = {};
    vehicles.forEach(v => {
      if (v.transportType === 'domestic' && v.cities) {
        v.cities.forEach(cityData => {
          const city = cityData.city || 'غير محدد';
          if (!fleetsByCity[city]) fleetsByCity[city] = [];
          
          const finalPrice = cityData.price - (cityData.price * (v.discount || 0) / 100);
          
          fleetsByCity[city].push({
            name: v.vehicleName,
            type: v.vehicleType || 'غير محدد',
            color: v.vehicleColor || 'غير محدد',
            model: v.vehicleModel || 'غير محدد',
            price: cityData.price,
            discount: v.discount || 0,
            finalPrice: finalPrice,
            currency: v.currency || 'ريال',
            hasImages: v.imageUrls && v.imageUrls.length > 0,
            imageUrls: v.imageUrls || []
          });
        });
      }
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
 * معالجة رسالة العميل - محدث مع المراوغة!
 */
async function processChatMessage(messageText, userId, conversationHistory = [], companyId) {
  try {
    console.log(`📨 رسالة: "${messageText}"`);
    
    const lowerMessage = messageText.toLowerCase();
    
    // جمع البيانات الحقيقية من قاعدة البيانات
    let realData = '';
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة', 'الأحساء', 'القصيم', 'حائل', 'جيزان', 'نجران', 'الباحة', 'عرعر', 'سكاكا', 'القطيف', 'الجبيل'];
    
    // البحث عن مدينة في الرسالة
    let foundCity = null;
    for (const city of saudiCities) {
      if (lowerMessage.includes(city)) {
        foundCity = city;
        break;
      }
    }

    // إذا ذكر مدينة، ابحث عن الأساطيل المتاحة مع الأسعار
    if (foundCity) {
      const fleets = await searchAvailableFleets(foundCity, companyId);
      if (fleets && fleets.length > 0) {
        realData += `\n\n[بيانات الأسطول المتاح في ${foundCity}]:\n`;
        fleets.forEach((f, i) => {
          realData += `${i + 1}. ${f.name} - ${f.type} - ${f.color} - ${f.model}\n`;
          if (f.priceInfo) {
            realData += `   السعر الأصلي: ${f.priceInfo.price} ${f.priceInfo.currency}\n`;
            if (f.priceInfo.discount > 0) {
              realData += `   الخصم: ${f.priceInfo.discount}%\n`;
              realData += `   السعر بعد الخصم: ${f.priceInfo.finalPrice.toFixed(2)} ${f.priceInfo.currency}\n`;
            }
          }
          if (f.hasImages) {
            realData += `   يوجد ${f.imageCount} صورة متاحة للمركبة\n`;
          }
          realData += `   السائق: ${f.driver}\n`;
        });
      } else {
        realData += `\n\n[لا توجد شاحنات متاحة في ${foundCity} حالياً]`;
      }
    }

    // إذا سأل عن الأساطيل بشكل عام
    if (lowerMessage.includes('اسطول') || lowerMessage.includes('شاحن') || lowerMessage.includes('متاح') || lowerMessage.includes('عندكم')) {
      const allFleets = await getAllAvailableFleets(companyId);
      if (allFleets) {
        realData += '\n\n[الشاحنات المتاحة في جميع المدن]:\n';
        for (const [city, vehicles] of Object.entries(allFleets)) {
          realData += `\n📍 ${city}: ${vehicles.length} شاحنة\n`;
          vehicles.forEach((v, i) => {
            realData += `   ${i + 1}. ${v.name} - ${v.type}\n`;
            if (v.discount > 0) {
              realData += `      السعر: ${v.price} ${v.currency} ❌ | بعد الخصم ${v.discount}%: ${v.finalPrice.toFixed(2)} ${v.currency} ✅\n`;
            } else {
              realData += `      السعر: ${v.price} ${v.currency}\n`;
            }
          });
        }
      }
    }

    // إذا سأل عن منشور أو إعلان
    if (lowerMessage.includes('منشور') || lowerMessage.includes('اعلان') || lowerMessage.includes('شفت')) {
      const ads = await searchEmptyTruckAds(companyId);
      if (ads && ads.length > 0) {
        realData += '\n\n[إعلانات الشاحنات الفارغة]:\n';
        ads.forEach((ad, i) => {
          realData += `${i + 1}. من ${ad.from} إلى ${ad.to} - ${ad.type}\n`;
        });
      }
    }

    // System context محسّن - مراوغ وذكي!
    let systemContext = `أنت مساعد ذكاء اصطناعي ذكي ومراوغ لشركة شحن سعودية. هدفك هو إقناع العميل بالحجز بأي طريقة ممكنة.

🎭 شخصيتك:
- أنت بائع محترف وذكي جداً
- تعرف كيف تقنع العميل وتراوغه بذكاء
- تستخدم أساليب البيع النفسية
- تخلق إحساس بالاستعجال والندرة
- تبالغ قليلاً في المزايا (لكن لا تكذب في الأرقام الموجودة)

🎯 استراتيجيات المراوغة:

1. **خلق الاستعجال:**
   - "صراحة الأسعار بترتفع الأسبوع الجاي"
   - "عندي عميل ثاني مهتم بنفس الشاحنة"
   - "العرض هذا لمدة محدودة فقط"
   - "الطلب على هالخط عالي جداً هالأيام"

2. **إبراز الخصومات:**
   - إذا كان هناك خصم: "الحمد لله قدرت أطلع لك خصم خاص ${الخصم}%!"
   - "السعر الأصلي ${السعر الأصلي}، لكن لأنك تواصلت معي مباشرة، أقدر أعطيك ${السعر بعد الخصم}"
   - "هذا آخر خصم أقدر أعطيه، صدقني"

3. **المبالغة في المزايا:**
   - "هذي أفضل شاحنة عندنا، السائق خبرة 15 سنة"
   - "الشاحنة نظيفة جداً ومفحوصة بالكامل"
   - "نضمن لك التوصيل بأسرع وقت ممكن"

4. **التقليل من المنافسين:**
   - "الشركات الثانية أسعارهم أغلى بكثير"
   - "احنا الوحيدين اللي نعطي هالخصومات"
   - "جودة خدمتنا ما لها مثيل"

5. **عند طلب الصور:**
   - "طبعاً! عندي صور للشاحنة، بس خليني أرسلها لك"
   - "الصور توضح جودة الشاحنة بشكل واضح"
   - إذا لم تكن هناك صور: "الشاحنة جديدة، ما صورناها بعد، لكن أضمن لك جودتها"

6. **التعامل مع الاعتراضات:**
   - إذا قال السعر غالي: "صدقني هذا أرخص سعر في السوق، وإذا لقيت أرخص أنا أطابقه"
   - إذا تردد: "خذ وقتك، لكن ما أضمن لك الشاحنة تبقى متاحة بعد ساعتين"
   - إذا سأل عن التفاصيل: أعطه كل التفاصيل بطريقة إيجابية

7. **أسلوب الرد:**
   - استخدم الإيموجي بذكاء: ✅ ❌ 🔥 ⚡ 💯 🎉
   - كن ودوداً وحماسياً
   - اجعل الردود متوسطة الطول (3-5 جمل)
   - استخدم اللهجة السعودية المحلية أحياناً

⚠️ قواعد صارمة:
1. **لا تخترع أرقام** - استخدم الأسعار والخصومات الموجودة في البيانات فقط
2. **لا تكذب في التفاصيل الأساسية** - نوع الشاحنة، اللون، الموديل يجب أن تكون صحيحة
3. **يمكنك المبالغة** في: جودة الخدمة، خبرة السائق، سرعة التوصيل، مقارنة مع المنافسين
4. **إذا لم تكن هناك بيانات** - راوغ بذكاء: "دعني أتحقق وأرجع لك بالتفاصيل"
5. **إذا طلب صورة وموجودة** - قل "أرسل لك الصور الآن" (سيتم إرسالها تلقائياً)
6. **إذا طلب صورة وغير موجودة** - قل "الشاحنة في الطريق حالياً، بس أضمن لك جودتها"

✅ أمثلة على الردود المراوغة:

السؤال: "كم السعر من الرياض لجدة؟"
الرد: "الحمد لله! عندنا عرض خاص اليوم 🔥 السعر الأصلي 800 ريال، لكن لأنك تواصلت معي مباشرة أقدر أعطيك 680 ريال بس (خصم 15%)! صراحة العرض هذا لمدة محدودة، والطلب على هالخط عالي جداً 📈"

السؤال: "عندكم شاحنات متاحة؟"
الرد: "ايه والله! 💯 عندنا 3 شاحنات متاحة حالياً، لكن واحدة منهم تقريباً محجوزة. الشاحنة الثانية ممتازة جداً - نظيفة ومفحوصة بالكامل، والسائق خبرة طويلة. تبي تحجز قبل ما تنتهي؟ ⚡"

السؤال: "السعر غالي شوي"
الرد: "أفهمك تماماً 😊 لكن صدقني هذا أرخص سعر في السوق! الشركات الثانية تاخذ 900-1000 ريال لنفس المسافة. احنا نعطيك جودة عالية بسعر منافس، وكمان عندنا خصم! لو تحجز الحين، أضمن لك هالسعر، لأن الأسعار بترتفع الأسبوع الجاي 📊"

السؤال: "ابي اشوف صور الشاحنة"
الرد: "طبعاً! 📸 عندي صور واضحة للشاحنة، بترسلها لك الحين. الشاحنة نظيفة جداً وحالتها ممتازة، بتشوف بنفسك! 👌"

السؤال: "خليني افكر"
الرد: "تمام، خذ وقتك! 😊 لكن بصراحة ما أقدر أضمن لك الشاحنة تبقى متاحة بعد ساعتين، الطلب عليها عالي. لو تبي أحجزها لك لمدة ساعة بدون التزام؟ 🤔"

السؤال: "asdfgh" (كلام غير مفهوم)
الرد: "عذراً، ما فهمت رسالتك 😅 تقدر توضح أكثر؟ تبي تسأل عن الأسعار، المدن المتاحة، أو الشاحنات؟"`;

    if (realData) {
      systemContext += `\n\n[البيانات الحقيقية من قاعدة البيانات]${realData}\n\n⚠️ استخدم هذه البيانات وراوغ العميل بذكاء لإقناعه بالحجز!`;
    } else {
      systemContext += `\n\n⚠️ لا توجد بيانات متاحة حالياً. راوغ العميل بذكاء واطلب منه تفاصيل أكثر عن احتياجه.`;
    }

    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-6), // زيادة السياق للمحادثة
      { role: 'user', content: messageText }
    ];

    const botResponse = await callDeepSeekChat(messages);
    
    console.log(`✅ رد البوت: ${botResponse}`);

    // التحقق من طلب الصور
    const requestsImage = lowerMessage.includes('صور') || lowerMessage.includes('صورة') || lowerMessage.includes('شوف');
    let imageUrls = [];
    
    if (requestsImage && foundCity) {
      const fleets = await searchAvailableFleets(foundCity, companyId);
      if (fleets && fleets.length > 0) {
        const fleetWithImages = fleets.find(f => f.hasImages);
        if (fleetWithImages) {
          imageUrls = fleetWithImages.imageUrls;
        }
      }
    }

    return {
      success: true,
      response: botResponse,
      shouldTransferToHuman: botResponse.includes('موظف بشري') || botResponse.includes('خدمة العملاء'),
      imageUrls: imageUrls.length > 0 ? imageUrls : null
    };

  } catch (error) {
    console.error('❌ خطأ:', error);
    return {
      success: false,
      response: 'عذراً، حصل خطأ تقني بسيط. دعني أحولك لموظف بشري الآن 😊',
      shouldTransferToHuman: true
    };
  }
}

/**
 * رسالة الترحيب الأولى
 */
async function sendWelcomeMessage(companyId) {
  try {
    // جلب معلومات الشركة
    const company = await User.findById(companyId).select('companyName name');
    const companyName = company?.companyName || company?.name || 'شركتنا';

    return {
      success: true,
      response: `مرحباً بك في ${companyName}! 👋🚚

أنا مساعدك الذكي، جاهز لخدمتك! 💯

كيف أقدر أساعدك اليوم؟ 
🔹 تبي تعرف الأسعار؟
🔹 تبي تشوف الشاحنات المتاحة؟
🔹 عندك استفسار معين؟

تواصل معي بأي وقت! ⚡`
    };
  } catch (error) {
    return {
      success: true,
      response: `مرحباً بك! 👋🚚

أنا مساعدك الذكي، كيف أقدر أساعدك اليوم؟ 💯`
    };
  }
}

/**
 * معالجة الصور
 */
async function processImageMessage(imageUrl, userId) {
  return {
    success: true,
    response: `تم استلام الصورة! 📸

شكلها واضحة وممتازة! دعني أراجعها وأرجع لك بعرض سعر دقيق خلال دقائق. 

أو إذا تبي، أقدر أحولك لموظف بشري الحين لخدمة أسرع؟ 🤔`,
    shouldTransferToHuman: false
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
