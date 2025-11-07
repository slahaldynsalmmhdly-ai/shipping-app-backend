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
        temperature: 0.8, // أعلى قليلاً للردود الطبيعية
        max_tokens: 100,  // ردود قصيرة ومركزة
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
 * جلب معلومات الشركة من الملف الشخصي
 */
async function getCompanyInfo(companyId) {
  try {
    const company = await User.findById(companyId).select('companyName name phone address city country location description');
    if (!company) return null;

    return {
      name: company.companyName || company.name,
      phone: company.phone || null,
      address: company.address || null,
      city: company.city || null,
      country: company.country || null,
      location: company.location || null,
      description: company.description || null
    };
  } catch (error) {
    console.error('❌ خطأ في جلب معلومات الشركة:', error);
    return null;
  }
}

/**
 * البحث عن الأساطيل المتاحة مع الأسعار والخصومات والصور
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
        imageUrls: v.imageUrls || [],
        phone: v.user?.phone || null
      };
    });
  } catch (error) {
    console.error('❌ خطأ في البحث:', error);
    return null;
  }
}

/**
 * البحث عن جميع الأساطيل المتاحة مع الأسعار
 */
async function getAllAvailableFleets(companyId) {
  try {
    const vehicles = await Vehicle.find({
      user: companyId,
      status: 'متاح'
    })
    .populate('user', 'phone')
    .select('vehicleName vehicleType vehicleColor vehicleModel departureCity cities discount imageUrls currency transportType');

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
            imageUrls: v.imageUrls || [],
            phone: v.user?.phone || null
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
 * تحليل حالة المحادثة - لمعرفة ما الذي جمعناه من العميل وجمع البيانات الفعلية
 */
function analyzeConversationState(conversationHistory) {
  const state = {
    hasLocation: false,
    hasImage: false,
    hasPhone: false,
    hasAddress: false,
    hasPickupTime: false,
    hasName: false,
    askedAboutPrice: false,
    agreedToPrice: false,
    confirmedBooking: false,
    readyToBook: false,
    // ✅ البيانات الفعلية المجموعة
    customerName: null,
    customerPhone: null,
    location: null,
    address: null,
    city: null,
    pickupTime: null,
    cargoImage: null,
    notes: null
  };

  conversationHistory.forEach(msg => {
    const text = msg.content || '';
    const lowerText = text.toLowerCase();
    
    // ✅ جمع رابط الموقع (Google Maps)
    const locationMatch = text.match(/(https?:\/\/[^\s]+maps[^\s]+)|(https?:\/\/maps\.[^\s]+)|(https?:\/\/goo\.gl\/[^\s]+)/);
    if (locationMatch) {
      state.location = locationMatch[0];
      state.hasLocation = true;
    }
    
    // ✅ جمع رقم الهاتف (سعودي 05XXXXXXXX أو دولي)
    const phoneMatch = text.match(/\b(05\d{8}|\+966\d{9}|00966\d{9}|\d{10})\b/);
    if (phoneMatch) {
      state.customerPhone = phoneMatch[0];
      state.hasPhone = true;
    }
    
    // ✅ جمع العنوان (إذا ذكر "عنوان" أو "حي")
    if (lowerText.includes('عنوان') || lowerText.includes('حي') || lowerText.includes('شارع')) {
      // استخراج العنوان من الرسالة
      const addressMatch = text.match(/عنوان[:\s]*(.+)|(حي [\u0621-\u064a\s]+)|(شارع [\u0621-\u064a\s]+)/);
      if (addressMatch) {
        state.address = (addressMatch[1] || addressMatch[2] || addressMatch[3]).trim();
        state.hasAddress = true;
      }
    }
    
    // ✅ جمع المدينة
    const saudiCities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الطائف', 'تبوك', 'أبها', 'الخبر', 'بريدة', 'الأحساء', 'القصيم', 'حائل', 'جيزان', 'نجران', 'الباحة', 'عرعر', 'سكاكا', 'القطيف', 'الجبيل'];
    for (const city of saudiCities) {
      if (lowerText.includes(city)) {
        state.city = city;
        break;
      }
    }
    
    // ✅ جمع الاسم (إذا قال "اسمي" أو "أنا")
    if (lowerText.includes('اسمي') || lowerText.includes('أنا')) {
      const nameMatch = text.match(/اسمي[:\s]+([\u0621-\u064a\s]+)|\u0623نا[:\s]+([\u0621-\u064a\s]+)/);
      if (nameMatch) {
        state.customerName = (nameMatch[1] || nameMatch[2]).trim();
        state.hasName = true;
      }
    }
    
    // ✅ جمع موعد الحضور
    if (lowerText.includes('غداً') || lowerText.includes('بعد غد') || lowerText.includes('اليوم') || lowerText.includes('الساعة')) {
      // استخراج الوقت
      const timeMatch = text.match(/(غداً?|بعد غد|اليوم).+?(الساعة \d+|\d+ صباحاً?|\d+ مساءً?)?/);
      if (timeMatch) {
        state.pickupTime = timeMatch[0].trim();
        state.hasPickupTime = true;
      }
    }
    
    // ✅ جمع صورة الحمولة (إذا أرسل صورة)
    if (msg.imageUrls && msg.imageUrls.length > 0 && msg.role === 'user') {
      state.cargoImage = msg.imageUrls[0];
      state.hasImage = true;
    }
    
    // تحقق من السعر
    if (lowerText.includes('سعر') || lowerText.includes('كم') || lowerText.includes('بكم')) {
      state.askedAboutPrice = true;
    }
    
    // تحقق من الموافقة
    if (lowerText.includes('تمام') || lowerText.includes('موافق') || lowerText.includes('ماشي') || lowerText.includes('اوكي')) {
      state.agreedToPrice = true;
    }
    
    // ✅ تحقق من تأكيد الحجز
    if (lowerText.includes('أكد') || lowerText.includes('احجز') || lowerText.includes('أرسل للسائق') || lowerText.includes('تواصل مع السائق')) {
      state.confirmedBooking = true;
    }
  });

  // ✅ العميل جاهز للحجز إذا كان عنده البيانات الأساسية
  state.readyToBook = state.hasPhone && (state.hasLocation || state.hasAddress) && state.city && state.agreedToPrice;

  return state;
}

/**
 * معالجة رسالة العميل - نظام محسّن واحترافي
 */
async function processChatMessage(messageText, userId, conversationHistory = [], companyId) {
  try {
    console.log(`📨 رسالة: "${messageText}"`);
    
    const lowerMessage = messageText.toLowerCase();
    
    // تحليل حالة المحادثة
    const conversationState = analyzeConversationState(conversationHistory);
    
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
          if (f.phone) {
            realData += `   رقم التواصل: ${f.phone}\n`;
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
          vehicles.slice(0, 3).forEach((v, i) => {
            realData += `   ${i + 1}. ${v.name} - ${v.type}\n`;
            if (v.discount > 0) {
              realData += `      السعر: ${v.price} ${v.currency} | بعد الخصم ${v.discount}%: ${v.finalPrice.toFixed(2)} ${v.currency}\n`;
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

    // ✅ إذا سأل عن معلومات الشركة
    if (lowerMessage.includes('موقع') || lowerMessage.includes('عنوان') || lowerMessage.includes('مدينة') || 
        lowerMessage.includes('رقم') || lowerMessage.includes('هاتف') || lowerMessage.includes('تواصل') || 
        lowerMessage.includes('وين مقر') || lowerMessage.includes('مقركم')) {
      const companyInfo = await getCompanyInfo(companyId);
      if (companyInfo) {
        realData += '\n\n[معلومات الشركة]:\n';
        if (companyInfo.name) realData += `الاسم: ${companyInfo.name}\n`;
        if (companyInfo.phone) realData += `رقم الهاتف: ${companyInfo.phone}\n`;
        if (companyInfo.address) realData += `العنوان: ${companyInfo.address}\n`;
        if (companyInfo.city) realData += `المدينة: ${companyInfo.city}\n`;
        if (companyInfo.location) realData += `رابط الموقع: ${companyInfo.location}\n`;
      }
    }

    // System context - احترافي وذكي
    let systemContext = `أنت موظف مبيعات محترف في شركة شحن سعودية. تتحدث بشكل طبيعي جداً كأنك شخص حقيقي.

⚠️ قواعد أساسية:
1. **ردود قصيرة جداً** - جملة أو جملتين فقط (15-25 كلمة كحد أقصى)
2. **لا تعطي معلومات إلا إذا طُلبت منك** - خلي العميل يسأل
3. **لا تذكر السعر إلا إذا طلبه العميل صراحة**
4. **لا تذكر الخصم إلا إذا اعترض على السعر أو قال "غالي"**
5. **إذا طلب صورة، قل "تمام بعثتها لك" فقط** - النظام سيرسلها تلقائياً
6. **استخدم اللهجة السعودية الطبيعية** - مثل: تبي، ايش، ايه، ماشي
7. **قلل الإيموجي** - واحد أو اثنين بالكثير في الرسالة

🎯 استراتيجية البيع الذكية:
- **لا تعطي خصم بسهولة** - خلي العميل يحس إنه حصل على صفقة
- **إذا قال السعر غالي**: راوغه شوي، قل "هذا السعر المعتاد" أو "جودة عالية"
- **إذا أصر على التخفيض**: هنا اعرض الخصم بذكاء
- **اجمع المعلومات بالتدريج**: موقع، صورة، رقم، عنوان، وقت الاستلام
- **إذا جمعت كل البيانات**: اسأل العميل "تمام، تبي أرسل طلبك للسائق الحين؟"
- **إذا ما عندك معلومات**: قل للعميل "ما عندي هالمعلومة، تبي أحولك لموظف؟"

✅ أمثلة على الردود الصحيحة:

السؤال: "السلام عليكم"
الرد: "وعليكم السلام، أهلاً 👋"

السؤال: "عندكم شاحنات للرياض؟"
الرد: "ايه عندنا متاح، تبي تعرف التفاصيل؟"

السؤال: "كم السعر؟"
الرد: "السعر 500 ريال"

السؤال: "غالي شوي"
الرد: "هذا السعر المعتاد للجودة اللي عندنا، بس ممكن نشوف لك حل"

السؤال: "لا والله غالي مرة"
الرد: "طيب عندنا خصم 10%، يصير 450 ريال، ماشي؟"

السؤال: "ابي اشوف صور"
الرد: "تمام، بعثتها لك 📸"

السؤال: "متى تقدرون تجون؟"
الرد: "نقدر نوصل خلال ساعتين، ايش الموقع بالضبط؟"

السؤال: "كم رقمكم؟"
الرد: "الرقم [الرقم من البيانات]، تقدر تتواصل مباشرة"

⚠️ ممنوع منعاً باتاً:
- ❌ ردود طويلة أو تفصيلية
- ❌ اعطاء معلومات ما طلبها العميل
- ❌ ذكر السعر قبل ما يطلبه
- ❌ ذكر الخصم مباشرة (إلا إذا أصر على التخفيض)
- ❌ تكرار نفس الكلام
- ❌ كثرة الإيموجي
- ❌ اعطاء خصم بسهولة

✅ مسموح:
- ✅ ردود قصيرة وطبيعية
- ✅ المراوغة الذكية في البيع
- ✅ جمع المعلومات بالتدريج
- ✅ التحويل للموظف إذا ما عندك معلومات

📌 حالة المحادثة الحالية:
- الموقع: ${conversationState.hasLocation ? '✅ موجود' : '❌ مطلوب'}
- الصورة: ${conversationState.hasImage ? '✅ موجودة' : '❌ مطلوبة'}
- الرقم: ${conversationState.hasPhone ? '✅ موجود' : '❌ مطلوب'}
- العنوان: ${conversationState.hasAddress ? '✅ موجود' : '❌ مطلوب'}
- وقت الاستلام: ${conversationState.hasPickupTime ? '✅ موجود' : '❌ مطلوب'}
- جاهز للحجز: ${conversationState.readyToBook ? '✅ نعم' : '❌ لا'}

${conversationState.readyToBook ? '🎉 العميل جاهز للحجز! اسأله إذا يبي يأكد الطلب.' : ''}
${!conversationState.hasLocation && conversationState.askedAboutPrice ? '⚠️ اطلب الموقع من العميل' : ''}
${!conversationState.hasImage && conversationState.agreedToPrice ? '⚠️ اطلب صورة البضاعة من العميل' : ''}`;

    if (realData) {
      systemContext += `\n\n[البيانات الحقيقية من قاعدة البيانات]${realData}\n\n⚠️ استخدم هذه البيانات بذكاء ولا تعطي كل شيء مرة واحدة!`;
    } else {
      systemContext += `\n\n⚠️ لا توجد بيانات متاحة حالياً. قل للعميل: "ما عندي هالمعلومة حالياً، تبي أحولك لموظف بشري؟"`;
    }

    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-8), // سياق أطول للمحادثة
      { role: 'user', content: messageText }
    ];

    const botResponse = await callDeepSeekChat(messages);
    
    console.log(`✅ رد البوت: ${botResponse}`);

    // التحقق من طلب الصور
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

    // ✅ التحقق من الإرسال التلقائي للسائق
    let autoSentToDriver = false;
    let driverInfo = null;
    
    if (conversationState.confirmedBooking && conversationState.readyToBook && conversationState.city) {
      console.log('✅ العميل أكد الحجز! جاري الإرسال للسائق...');
      
      const { findSuitableDriver } = require('./find-suitable-driver');
      const { sendBookingToDriver } = require('./auto-send-to-driver');
      
      // تحديد السائق المناسب
      const driver = await findSuitableDriver(conversationState.city, companyId);
      
      if (driver) {
        // إرسال الطلب للسائق
        const bookingData = {
          customerName: conversationState.customerName || 'العميل',
          customerPhone: conversationState.customerPhone,
          location: conversationState.location,
          address: conversationState.address,
          city: conversationState.city,
          pickupTime: conversationState.pickupTime,
          cargoImage: conversationState.cargoImage,
          notes: conversationState.notes
        };
        
        const sendResult = await sendBookingToDriver(bookingData, driver.driverId, companyId, null);
        
        if (sendResult.success) {
          autoSentToDriver = true;
          driverInfo = driver;
          console.log('✅ تم إرسال الطلب للسائق بنجاح!');
        }
      } else {
        console.log('❌ لم يتم العثور على سائق متاح');
      }
    }
    
    // التحقق من طلب التحويل للموظف
    const shouldTransfer = 
      botResponse.includes('موظف بشري') || 
      botResponse.includes('خدمة العملاء') ||
      botResponse.includes('أحولك') ||
      (!realData && (lowerMessage.includes('متى') || lowerMessage.includes('كم') || lowerMessage.includes('وين')));

    // ✅ إضافة رسالة تأكيد إذا تم الإرسال للسائق
    let finalResponse = botResponse;
    if (autoSentToDriver && driverInfo) {
      finalResponse += `\n\n✅ **تم إرسال طلبك للسائق ${driverInfo.driverName} بنجاح!**\nسيتواصل معك قريباً على رقمك: ${conversationState.customerPhone} 🚚`;
    }
    
    return {
      success: true,
      response: finalResponse,
      shouldTransferToHuman: shouldTransfer,
      imageUrls: imageUrls.length > 0 ? imageUrls : null,
      conversationState: conversationState,
      autoSentToDriver: autoSentToDriver,  // ✅ معلومة الإرسال التلقائي
      driverInfo: driverInfo
    };

  } catch (error) {
    console.error('❌ خطأ:', error);
    return {
      success: false,
      response: 'عذراً، حصل خطأ تقني. دعني أحولك لموظف بشري الآن 😊',
      shouldTransferToHuman: true
    };
  }
}

/**
 * رسالة الترحيب الأولى - محسّنة
 */
async function sendWelcomeMessage(companyId) {
  try {
    // جلب معلومات الشركة
    const company = await User.findById(companyId).select('companyName name');
    const companyName = company?.companyName || company?.name || 'شركتنا';

    return {
      success: true,
      response: `مرحباً بك في ${companyName}! 👋

كيف أقدر أساعدك اليوم؟ 😊`
    };
  } catch (error) {
    return {
      success: true,
      response: `مرحباً بك! 👋

كيف أقدر أساعدك اليوم؟ 😊`
    };
  }
}

/**
 * معالجة الصور - محسّنة
 */
async function processImageMessage(imageUrl, userId) {
  return {
    success: true,
    response: `تمام، استلمت الصورة 📸

خلني أراجعها وأرجع لك بعرض سعر خلال دقائق. أو تبي أحولك لموظف الحين؟`,
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
  getCompanyInfo,  // ✅ إضافة دالة جلب معلومات الشركة
  processChatMessage,
  sendWelcomeMessage,
  processImageMessage,
  isBotEnabledForCompany
};
