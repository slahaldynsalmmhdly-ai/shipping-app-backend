const EmptyTruckAd = require('../models/EmptyTruckAd');

/**
 * استخراج معلومات البحث عن الشاحنات من نص المستخدم
 * @param {string} userMessage - رسالة المستخدم
 * @returns {Object|null} - {searchType, from, to} أو null
 */
function extractTruckSearchQuery(userMessage) {
  const message = userMessage.toLowerCase().trim();
  
  // قائمة المدن السعودية الرئيسية
  const saudiCities = [
    'الرياض', 'riyadh',
    'جدة', 'jeddah', 'جده',
    'مكة', 'makkah', 'مكه',
    'المدينة', 'madinah', 'المدينه',
    'الدمام', 'dammam',
    'الطائف', 'taif',
    'تبوك', 'tabuk',
    'بريدة', 'buraidah',
    'خميس مشيط', 'khamis mushait',
    'الهفوف', 'hofuf',
    'حفر الباطن', 'hafar al-batin',
    'حائل', 'hail',
    'نجران', 'najran',
    'جيزان', 'jazan', 'jizan',
    'ينبع', 'yanbu',
    'الخبر', 'khobar',
    'عرعر', 'arar',
    'سكاكا', 'sakaka',
    'أبها', 'abha',
    'القطيف', 'qatif'
  ];
  
  // البحث عن أنماط مختلفة
  
  // نمط 1: "شاحنة من X إلى Y" أو "من X إلى Y" أو "احجز لي من X إلى Y"
  const pattern1 = /(?:احجز|احجزي|ابغى|أبغى|اريد|شاحن[ةه]|مركب[ةه]|truck)?\s*(?:لي)?\s*(?:شاحن[ةه]|مركب[ةه]|truck)?\s*(?:من|from)\s+([^\s]+)\s+(?:إلى|الى|إلي|to)\s+([^\s]+)/i;
  const match1 = message.match(pattern1);
  if (match1) {
    return {
      searchType: 'from_to',
      from: match1[1].trim(),
      to: match1[2].trim()
    };
  }
  
  // نمط 2: "شاحنة في X" أو "شاحنة بـ X"
  const pattern2 = /(?:شاحن[ةه]|truck)\s+(?:في|ب|at|in)\s+([^\s]+)/i;
  const match2 = message.match(pattern2);
  if (match2) {
    return {
      searchType: 'in_city',
      city: match2[1].trim()
    };
  }
  
  // نمط 3: "شاحنة متجهة إلى X" أو "شاحنة رايحة X"
  const pattern3 = /(?:شاحن[ةه]|truck)\s+(?:متجه[ةه]|رايح[ةه]|going|heading)\s+(?:إلى|الى|إلي|to|ل)?\s*([^\s]+)/i;
  const match3 = message.match(pattern3);
  if (match3) {
    return {
      searchType: 'to_city',
      to: match3[1].trim()
    };
  }
  
  // نمط 4: "هل توجد شاحنة في X"
  const pattern4 = /(?:هل|يوجد|توجد|فيه|في)\s+(?:شاحن[ةه]|truck)\s+(?:في|ب|at|in)\s+([^\s]+)/i;
  const match4 = message.match(pattern4);
  if (match4) {
    return {
      searchType: 'in_city',
      city: match4[1].trim()
    };
  }
  
  // نمط 5: "أريد شاحنة في X" أو "أبحث عن شاحنة في X"
  const pattern5 = /(?:أريد|ابحث|ابغى|أبغى|want|need)\s+(?:شاحن[ةه]|truck)\s+(?:في|ب|at|in)\s+([^\s]+)/i;
  const match5 = message.match(pattern5);
  if (match5) {
    return {
      searchType: 'in_city',
      city: match5[1].trim()
    };
  }
  
  return null;
}

/**
 * البحث عن الشاحنات في قاعدة البيانات
 * @param {Object} searchQuery - {searchType, from, to, city}
 * @returns {Promise<Object>} - {success, trucks, message}
 */
async function searchTrucks(searchQuery) {
  try {
    if (!searchQuery) {
      return {
        success: false,
        message: 'لم أتمكن من فهم طلبك. يرجى توضيح المدينة أو المسار المطلوب.'
      };
    }
    
    let query = {
      // لا نفلتر حسب isPublished أو availabilityDate
      // نبحث عن جميع الشاحنات المتاحة
    };
    
    let trucks = [];
    let searchDescription = '';
    
    if (searchQuery.searchType === 'from_to') {
      // البحث عن شاحنات من X إلى Y
      const from = searchQuery.from;
      const to = searchQuery.to;
      
      query.$and = [
        {
          $or: [
            { currentLocation: new RegExp(from, 'i') },
            { currentLocation: new RegExp(normalizeArabicCity(from), 'i') }
          ]
        },
        {
          $or: [
            { preferredDestination: new RegExp(to, 'i') },
            { preferredDestination: new RegExp(normalizeArabicCity(to), 'i') },
            { preferredDestination: /جميع المملكة/i },
            { preferredDestination: /كل المملكة/i },
            { preferredDestination: /all kingdom/i }
          ]
        }
      ];
      
      searchDescription = `من ${from} إلى ${to}`;
      
    } else if (searchQuery.searchType === 'in_city') {
      // البحث عن شاحنات في المدينة (الموقع الحالي)
      const city = searchQuery.city;
      
      query.$or = [
        { currentLocation: new RegExp(city, 'i') },
        { currentLocation: new RegExp(normalizeArabicCity(city), 'i') }
      ];
      
      searchDescription = `في ${city}`;
      
    } else if (searchQuery.searchType === 'to_city') {
      // البحث عن شاحنات متجهة إلى المدينة
      const to = searchQuery.to;
      
      query.$or = [
        { preferredDestination: new RegExp(to, 'i') },
        { preferredDestination: new RegExp(normalizeArabicCity(to), 'i') },
        { preferredDestination: /جميع المملكة/i },
        { preferredDestination: /كل المملكة/i },
        { preferredDestination: /all kingdom/i }
      ];
      
      searchDescription = `متجهة إلى ${to}`;
    }
    
    // تنفيذ البحث
    trucks = await EmptyTruckAd.find(query)
      .populate('user', 'name companyName phone')
      .sort({ createdAt: -1 })
      .limit(10);
    
    if (trucks.length === 0) {
      return {
        success: true,
        trucks: [],
        count: 0,
        message: `عذراً، لا توجد شاحنات متاحة ${searchDescription} حالياً.`
      };
    }
    
    // تنسيق النتائج
    const formattedTrucks = trucks.map(truck => ({
      id: truck._id,
      currentLocation: truck.currentLocation,
      preferredDestination: truck.preferredDestination,
      truckType: truck.truckType,
      availabilityDate: truck.availabilityDate,
      driverName: truck.user?.name || 'غير متوفر',
      companyName: truck.user?.companyName || null,
      phone: truck.user?.phone || null
    }));
    
    return {
      success: true,
      trucks: formattedTrucks,
      count: trucks.length,
      searchDescription: searchDescription,
      message: `تم العثور على ${trucks.length} شاحنة ${searchDescription}`
    };
    
  } catch (error) {
    console.error('خطأ في البحث عن الشاحنات:', error);
    return {
      success: false,
      message: 'عذراً، حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.'
    };
  }
}

/**
 * تطبيع أسماء المدن العربية (إزالة التشكيل والهمزات)
 */
function normalizeArabicCity(city) {
  return city
    .replace(/[أإآء]/g, 'ا') // أ إ آ ء -> ا
    .replace(/[ىي]/g, 'ي') // ى ي -> ي
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/[\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652]/g, '') // إزالة التشكيل
    .trim()
    .toLowerCase();
}

module.exports = {
  extractTruckSearchQuery,
  searchTrucks
};
