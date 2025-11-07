const EmptyTruckAd = require('../models/EmptyTruckAd');

/**
 * استخراج معلومات السعر من نص المستخدم
 * @param {string} userMessage - رسالة المستخدم
 * @returns {Object|null} - {from, to} أو null
 */
function extractPriceQuery(userMessage) {
  const message = userMessage.toLowerCase().trim();
  
  // نمط 1: "كم السعر من X إلى Y"
  const pattern1 = /(?:كم|ما|what|how much)?\s*(?:السعر|الاسعار|الأسعار|price|cost)?\s*(?:من|from)\s+([^\s]+)\s+(?:إلى|الى|إلي|to)\s+([^\s]+)/i;
  const match1 = message.match(pattern1);
  if (match1) {
    return {
      from: match1[1].trim(),
      to: match1[2].trim()
    };
  }
  
  // نمط 2: "كم السعر إلى Y" (بدون ذكر المصدر)
  const pattern2 = /(?:كم|ما|what|how much)?\s*(?:السعر|الاسعار|الأسعار|price|cost)?\s*(?:إلى|الى|إلي|to|ل)\s+([^\s]+)/i;
  const match2 = message.match(pattern2);
  if (match2) {
    return {
      to: match2[1].trim()
    };
  }
  
  // نمط 3: "كم السعر؟" (بدون تحديد المسار)
  const pattern3 = /(?:كم|ما|what|how much)\s*(?:السعر|الاسعار|الأسعار|price|cost)/i;
  if (pattern3.test(message)) {
    return {
      general: true
    };
  }
  
  return null;
}

/**
 * البحث عن السعر في قاعدة البيانات
 * @param {Object} priceQuery - {from, to}
 * @returns {Promise<Object>} - {success, price, message}
 */
async function searchPrice(priceQuery) {
  try {
    if (!priceQuery) {
      return {
        success: false,
        message: 'لم أتمكن من فهم استفسارك عن السعر. يرجى تحديد المسار (من أين إلى أين؟)'
      };
    }
    
    // إذا كان السؤال عام (كم السعر؟)
    if (priceQuery.general) {
      return {
        success: false,
        message: 'يرجى تحديد المسار. من أين إلى أين تريد الشحن؟'
      };
    }
    
    // البحث عن الشاحنات المتاحة
    let query = {};
    
    if (priceQuery.from) {
      query.$or = [
        { currentLocation: new RegExp(priceQuery.from, 'i') },
        { currentLocation: new RegExp(normalizeArabicCity(priceQuery.from), 'i') }
      ];
    }
    
    const trucks = await EmptyTruckAd.find(query)
      .populate('user', 'name companyName phone')
      .limit(10);
    
    if (trucks.length === 0) {
      return {
        success: false,
        message: `عذراً، لا توجد شاحنات متاحة ${priceQuery.from ? 'في ' + priceQuery.from : ''} حالياً.`
      };
    }
    
    // البحث عن السعر في destinationPrices
    const to = priceQuery.to;
    const normalizedTo = normalizeArabicCity(to);
    
    for (const truck of trucks) {
      if (truck.destinationPrices && truck.destinationPrices.length > 0) {
        const priceEntry = truck.destinationPrices.find(dp => {
          const normalizedCity = normalizeArabicCity(dp.city);
          return normalizedCity === normalizedTo || 
                 dp.city.toLowerCase().includes(to.toLowerCase()) ||
                 to.toLowerCase().includes(dp.city.toLowerCase());
        });
        
        if (priceEntry) {
          return {
            success: true,
            price: priceEntry.price,
            from: truck.currentLocation,
            to: priceEntry.city,
            truckType: truck.truckType,
            driverName: truck.user?.name || 'غير متوفر',
            companyName: truck.user?.companyName || null,
            message: `السعر من ${truck.currentLocation} إلى ${priceEntry.city}: ${priceEntry.price} ريال`
          };
        }
      }
    }
    
    // إذا لم نجد السعر
    return {
      success: false,
      message: `عذراً، لا يوجد سعر محدد ${priceQuery.from ? 'من ' + priceQuery.from : ''} إلى ${to} حالياً.`
    };
    
  } catch (error) {
    console.error('خطأ في البحث عن السعر:', error);
    return {
      success: false,
      message: 'عذراً، حدث خطأ أثناء البحث عن السعر. يرجى المحاولة مرة أخرى.'
    };
  }
}

/**
 * تطبيع أسماء المدن العربية
 */
function normalizeArabicCity(city) {
  return city
    .replace(/[أإآء]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652]/g, '')
    .trim()
    .toLowerCase();
}

module.exports = {
  extractPriceQuery,
  searchPrice
};
