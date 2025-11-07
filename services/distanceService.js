const axios = require('axios');
const NodeGeocoder = require('node-geocoder');

// إعداد Geocoder لتحويل أسماء المدن إلى إحداثيات
// يستخدم LocationIQ - مجاني 5000 طلب/يوم
const geocoder = NodeGeocoder({
  provider: 'locationiq',
  apiKey: process.env.LOCATIONIQ_API_KEY || 'pk.ab46a4d29ad870e2b9a79705088e9826',
  httpAdapter: 'https',
  formatter: null
});

/**
 * تحويل اسم المدينة إلى إحداثيات (latitude, longitude)
 * @param {string} cityName - اسم المدينة (بالعربي أو الإنجليزي)
 * @returns {Promise<Object>} - {lat, lon, formattedAddress}
 */
async function geocodeCity(cityName) {
  try {
    // إضافة ", Saudi Arabia" للبحث الدقيق
    const searchQuery = cityName.includes(',') ? cityName : `${cityName}, Saudi Arabia`;
    const results = await geocoder.geocode(searchQuery);
    
    if (!results || results.length === 0) {
      throw new Error(`لم يتم العثور على المدينة: ${cityName}`);
    }
    
    const location = results[0];
    
    return {
      lat: location.latitude,
      lon: location.longitude,
      formattedAddress: location.formattedAddress,
      city: location.city || location.county || cityName,
      country: location.country || 'غير محدد'
    };
  } catch (error) {
    console.error(`خطأ في geocoding للمدينة ${cityName}:`, error.message);
    throw new Error(`فشل في تحديد موقع المدينة: ${cityName}`);
  }
}

/**
 * حساب المسافة بين نقطتين باستخدام OSRM (Open Source Routing Machine)
 * يحسب المسافة الفعلية على الطرق (ليس المسافة المباشرة)
 * @param {number} lat1 - خط عرض النقطة الأولى
 * @param {number} lon1 - خط طول النقطة الأولى
 * @param {number} lat2 - خط عرض النقطة الثانية
 * @param {number} lon2 - خط طول النقطة الثانية
 * @returns {Promise<Object>} - {distance_km, duration_hours, route_geometry}
 */
async function calculateRouteDistance(lat1, lon1, lat2, lon2) {
  try {
    // استخدام OSRM Demo Server (مجاني)
    // يمكن استبداله بخادم خاص للإنتاج
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    
    const response = await axios.get(osrmUrl, {
      timeout: 10000 // 10 ثواني
    });
    
    if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
      throw new Error('فشل في حساب المسار');
    }
    
    const route = response.data.routes[0];
    const distanceMeters = route.distance;
    const durationSeconds = route.duration;
    
    return {
      distance_km: Math.round(distanceMeters / 1000), // تحويل من متر إلى كيلومتر
      distance_meters: distanceMeters,
      duration_hours: parseFloat((durationSeconds / 3600).toFixed(2)), // تحويل من ثانية إلى ساعة
      duration_minutes: Math.round(durationSeconds / 60),
      method: 'osrm_driving'
    };
  } catch (error) {
    console.error('خطأ في OSRM API:', error.message);
    
    // في حالة فشل OSRM، استخدم حساب المسافة المباشرة (Haversine)
    console.log('استخدام حساب المسافة المباشرة كبديل...');
    const directDistance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    
    // تقدير المسافة على الطرق = المسافة المباشرة × 1.3 (عامل تقريبي)
    const estimatedRoadDistance = Math.round(directDistance * 1.3);
    
    return {
      distance_km: estimatedRoadDistance,
      distance_meters: estimatedRoadDistance * 1000,
      duration_hours: parseFloat((estimatedRoadDistance / 80).toFixed(2)), // تقدير بسرعة 80 كم/س
      duration_minutes: Math.round((estimatedRoadDistance / 80) * 60),
      method: 'haversine_estimated',
      note: 'تقدير تقريبي - OSRM غير متاح'
    };
  }
}

/**
 * حساب المسافة المباشرة بين نقطتين باستخدام صيغة Haversine
 * (المسافة كما يطير الطائر - ليست المسافة على الطرق)
 * @param {number} lat1 - خط عرض النقطة الأولى
 * @param {number} lon1 - خط طول النقطة الأولى
 * @param {number} lat2 - خط عرض النقطة الثانية
 * @param {number} lon2 - خط طول النقطة الثانية
 * @returns {number} - المسافة بالكيلومتر
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
}

/**
 * تحويل الدرجات إلى راديان
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * حساب المسافة بين مدينتين (الدالة الرئيسية)
 * @param {string} fromCity - اسم المدينة الأولى
 * @param {string} toCity - اسم المدينة الثانية
 * @returns {Promise<Object>} - معلومات المسافة والمدن
 */
async function calculateDistanceBetweenCities(fromCity, toCity) {
  try {
    console.log(`حساب المسافة من "${fromCity}" إلى "${toCity}"...`);
    
    // تحويل أسماء المدن إلى إحداثيات
    const [fromLocation, toLocation] = await Promise.all([
      geocodeCity(fromCity),
      geocodeCity(toCity)
    ]);
    
    console.log(`من: ${fromLocation.formattedAddress}`);
    console.log(`إلى: ${toLocation.formattedAddress}`);
    
    // حساب المسافة على الطرق
    const routeInfo = await calculateRouteDistance(
      fromLocation.lat,
      fromLocation.lon,
      toLocation.lat,
      toLocation.lon
    );
    
    return {
      success: true,
      from: {
        input: fromCity,
        city: fromLocation.city,
        country: fromLocation.country,
        coordinates: {
          lat: fromLocation.lat,
          lon: fromLocation.lon
        },
        formatted_address: fromLocation.formattedAddress
      },
      to: {
        input: toCity,
        city: toLocation.city,
        country: toLocation.country,
        coordinates: {
          lat: toLocation.lat,
          lon: toLocation.lon
        },
        formatted_address: toLocation.formattedAddress
      },
      distance: {
        kilometers: routeInfo.distance_km,
        meters: routeInfo.distance_meters,
        method: routeInfo.method,
        note: routeInfo.note
      },
      duration: {
        hours: routeInfo.duration_hours,
        minutes: routeInfo.duration_minutes
      },
      calculated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('خطأ في حساب المسافة بين المدن:', error);
    throw error;
  }
}

/**
 * استخراج أسماء المدن من نص (للاستخدام مع AI)
 * يبحث عن أنماط مثل "من X إلى Y" أو "من X لـ Y"
 * @param {string} text - النص المراد تحليله
 * @returns {Object|null} - {from: string, to: string} أو null
 */
function extractCitiesFromText(text) {
  // أنماط عربية
  const arabicPatterns = [
    /من\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:إلى|الى|لـ|ل)\s+([^\s]+(?:\s+[^\s]+)?)/i,
    /من\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:ل|الى|إلى)\s+([^\s]+(?:\s+[^\s]+)?)/i,
    /شحن\s+من\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:إلى|الى|لـ|ل)\s+([^\s]+(?:\s+[^\s]+)?)/i
  ];
  
  // أنماط إنجليزية
  const englishPatterns = [
    /from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$|\.|\?)/i,
    /shipping\s+from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$|\.|\?)/i
  ];
  
  // تجربة الأنماط العربية
  for (const pattern of arabicPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        from: match[1].trim(),
        to: match[2].trim()
      };
    }
  }
  
  // تجربة الأنماط الإنجليزية
  for (const pattern of englishPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        from: match[1].trim(),
        to: match[2].trim()
      };
    }
  }
  
  return null;
}

module.exports = {
  geocodeCity,
  calculateRouteDistance,
  calculateHaversineDistance,
  calculateDistanceBetweenCities,
  extractCitiesFromText
};
