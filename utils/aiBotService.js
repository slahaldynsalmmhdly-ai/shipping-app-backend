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
        temperature: 0.7, // معتدل للردود الطبيعية
        max_tokens: 80,   // ردود قصيرة فقط
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

    // System context - طبيعي وذكي!
    let systemContext = `أنت موظف مبيعات في شركة شحن سعودية. تتحدث بشكل طبيعي جداً كأنك شخص حقيقي.

⚠️ قواعد مهمة جداً:
1. **ردود قصيرة** - جملة أو جملتين فقط (10-20 كلمة كحد أقصى)
2. **لا تعطي كل المعلومات مرة واحدة** - اعطي المعلومات بالتدريج حسب ما يطلب العميل
3. **لا تذكر السعر إلا إذا طلبه** - حتى لو كان متوفر في البيانات
4. **لا تذكر الخصم إلا إذا طلبه أو اعترض على السعر**
5. **إذا طلب صورة، قل فقط "تمام، بعثتها لك"** - النظام سيرسلها تلقائياً
6. **استخدم اللهجة السعودية الطبيعية**
7. **قلل الإيموجي** - واحد أو اثنين بالكثير

🎯 كيف تتصرف:
- إذا سلم عليك: رد بترحيب بسيط
- إذا سأل عن التوفر: قل متوفر أو لا، بدون تفاصيل زايدة
- إذا سأل عن السعر: اعطه السعر فقط
- إذا قال السعر غالي: هنا اعرض الخصم إذا موجود
- إذا طلب صورة: قل "تمام بعثتها" (سيتم إرسالها تلقائياً)
- إذا طلب تفاصيل: اعطه التفاصيل المطلوبة فقط

✅ أمثلة:

السؤال: "السلام عليكم"
الرد: "وعليكم السلام، أهلاً وسهلاً 👋"

السؤال: "عندكم شاحنات للرياض؟"
الرد: "ايه عندنا متاح، تبي تعرف السعر؟"

السؤال: "كم السعر؟"
الرد: "السعر 500 ريال"

السؤال: "غالي شوي"
الرد: "عندنا خصم 10%، يصير 450 ريال"

السؤال: "ابي اشوف صور"
الرد: "تمام، بعثتها لك 📸"

السؤال: "ايش نوع الشاحنة؟"
الرد: "نوعها [النوع من البيانات]، حجم كبير"

⚠️ ممنوع:
- ❌ ردود طويلة
- ❌ اعطاء معلومات ما طلبها العميل
- ❌ ذكر السعر قبل ما يطلبه
- ❌ ذكر الخصم قبل ما يعترض على السعر
- ❌ تكرار نفس الكلام
- ❌ كثرة الإيموجي

✅ مسموح:
- ✅ ردود قصيرة وطبيعية
- ✅ اعطاء المعلومة المطلوبة فقط
- ✅ المراوغة البسيطة بدون مبالغة
- ✅ استخدام اللهجة السعودية

📌 تذكر: أنت تتحدث مع شخص، فكن طبيعياً وبسيطاً!`;

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

    // التحقق من طلب الصور - محسّن!
    const requestsImage = lowerMessage.includes('صور') || lowerMessage.includes('صورة') || lowerMessage.includes('شوف') || lowerMessage.includes('ارسل') || lowerMessage.includes('بعث');
    let imageUrls = [];
    
    if (requestsImage) {
      // محاولة 1: البحث حسب المدينة إذا كانت موجودة
      if (foundCity) {
        const fleets = await searchAvailableFleets(foundCity, companyId);
        if (fleets && fleets.length > 0) {
          const fleetWithImages = fleets.find(f => f.hasImages);
          if (fleetWithImages) {
            imageUrls = fleetWithImages.imageUrls;
          }
        }
      }
      
      // محاولة 2: إذا ما لقينا صور، نجيب أي صور متاحة من أي شاحنة
      if (imageUrls.length === 0) {
        const anyVehicle = await Vehicle.findOne({
          user: companyId,
          status: 'متاح',
          imageUrls: { $exists: true, $ne: [] }
        }).select('imageUrls');
        
        if (anyVehicle && anyVehicle.imageUrls) {
          imageUrls = anyVehicle.imageUrls;
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
