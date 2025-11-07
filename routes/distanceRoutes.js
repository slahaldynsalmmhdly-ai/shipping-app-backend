const express = require('express');
const router = express.Router();
const {
  calculateDistanceBetweenCities,
  extractCitiesFromText
} = require('../services/distanceService');
const { calculatePrice } = require('../services/pricingService');

/**
 * @route   POST /api/v1/distance/calculate
 * @desc    حساب المسافة بين مدينتين
 * @access  Public
 */
router.post('/calculate', async (req, res) => {
  try {
    const { from, to } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المدينة الأولى (from) والمدينة الثانية (to)'
      });
    }
    
    // حساب المسافة
    const result = await calculateDistanceBetweenCities(from, to);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('خطأ في حساب المسافة:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء حساب المسافة',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/distance/extract-and-calculate
 * @desc    استخراج المدن من نص وحساب المسافة
 * @access  Public
 */
router.post('/extract-and-calculate', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال النص (text) للتحليل'
      });
    }
    
    // استخراج أسماء المدن من النص
    const cities = extractCitiesFromText(text);
    
    if (!cities) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم العثور على مدن في النص. استخدم صيغة مثل: "من الرياض إلى جدة"'
      });
    }
    
    // حساب المسافة
    const result = await calculateDistanceBetweenCities(cities.from, cities.to);
    
    res.status(200).json({
      ...result,
      extracted_from_text: text,
      detected_pattern: `من ${cities.from} إلى ${cities.to}`
    });
    
  } catch (error) {
    console.error('خطأ في استخراج المدن وحساب المسافة:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء معالجة النص',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/distance/calculate-with-pricing
 * @desc    حساب المسافة والسعر معاً
 * @access  Public
 */
router.post('/calculate-with-pricing', async (req, res) => {
  try {
    const { from, to, cargoType, weightCategory, isFragile, isRefrigerated, isHazardous, isOversized, isExpress } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المدينة الأولى (from) والمدينة الثانية (to)'
      });
    }
    
    // حساب المسافة
    const distanceResult = await calculateDistanceBetweenCities(from, to);
    
    if (!distanceResult.success) {
      return res.status(400).json(distanceResult);
    }
    
    // حساب السعر بناءً على المسافة
    const pricing = calculatePrice({
      cargoType: cargoType || 'بضائع عامة',
      distance: distanceResult.distance.kilometers,
      weightCategory: weightCategory || 'medium',
      isFragile: isFragile || false,
      isRefrigerated: isRefrigerated || false,
      isHazardous: isHazardous || false,
      isOversized: isOversized || false,
      isExpress: isExpress || false
    });
    
    res.status(200).json({
      success: true,
      distance_info: distanceResult,
      pricing: pricing,
      summary: {
        route: `${distanceResult.from.city} → ${distanceResult.to.city}`,
        distance_km: distanceResult.distance.kilometers,
        estimated_duration: `${distanceResult.duration.hours} ساعة`,
        cargo_type: pricing.cargo_type,
        final_price: pricing.final_price,
        currency: pricing.currency,
        discount_applied: pricing.discount_amount > 0
      }
    });
    
  } catch (error) {
    console.error('خطأ في حساب المسافة والسعر:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء الحساب',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/distance/smart-query
 * @desc    استعلام ذكي: استخراج المدن من نص وحساب المسافة والسعر
 * @access  Public
 * @example "أريد شحن كراتين من الرياض إلى جدة"
 */
router.post('/smart-query', async (req, res) => {
  try {
    const { query, cargoType, weightCategory } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال الاستعلام (query)'
      });
    }
    
    // استخراج أسماء المدن من النص
    const cities = extractCitiesFromText(query);
    
    if (!cities) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم العثور على مدن في الاستعلام. استخدم صيغة مثل: "من الرياض إلى جدة"',
        suggestion: 'مثال: "أريد شحن بضائع من الرياض إلى جدة"'
      });
    }
    
    // حساب المسافة
    const distanceResult = await calculateDistanceBetweenCities(cities.from, cities.to);
    
    if (!distanceResult.success) {
      return res.status(400).json(distanceResult);
    }
    
    // حساب السعر
    const pricing = calculatePrice({
      cargoType: cargoType || 'بضائع عامة',
      distance: distanceResult.distance.kilometers,
      weightCategory: weightCategory || 'medium'
    });
    
    // إعداد رد ذكي
    const response = {
      success: true,
      original_query: query,
      understanding: {
        from_city: distanceResult.from.city,
        to_city: distanceResult.to.city,
        cargo_type: pricing.cargo_type
      },
      distance: {
        kilometers: distanceResult.distance.kilometers,
        estimated_duration: `${distanceResult.duration.hours} ساعة (${distanceResult.duration.minutes} دقيقة)`
      },
      pricing: {
        base_price: pricing.base_price,
        final_price: pricing.final_price,
        currency: pricing.currency,
        discount_percentage: pricing.discount_percentage,
        discount_amount: pricing.discount_amount
      },
      discount_info: {
        eligible: pricing.discount_eligible,
        current_discount: pricing.discount_percentage > 0 ? `${pricing.discount_percentage}%` : 'لا يوجد',
        message: pricing.discount_percentage > 0 
          ? `تم تطبيق خصم ${pricing.discount_percentage}% على هذه الرحلة!`
          : 'هذه الرحلة غير مؤهلة للخصم حالياً'
      },
      ai_response: generateAIResponse(distanceResult, pricing)
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('خطأ في الاستعلام الذكي:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء معالجة الاستعلام',
      error: error.message
    });
  }
});

/**
 * توليد رد ذكي للمستخدم
 */
function generateAIResponse(distanceResult, pricing) {
  const from = distanceResult.from.city;
  const to = distanceResult.to.city;
  const distance = distanceResult.distance.kilometers;
  const duration = distanceResult.duration.hours;
  const price = pricing.final_price;
  const discount = pricing.discount_percentage;
  
  let response = `تم حساب المسافة من ${from} إلى ${to}:\n\n`;
  response += `📍 المسافة: ${distance} كيلومتر\n`;
  response += `⏱️ الوقت المتوقع: ${duration} ساعة\n`;
  response += `📦 نوع الحمولة: ${pricing.cargo_type}\n\n`;
  
  if (discount > 0) {
    response += `💰 السعر الأساسي: ${pricing.subtotal} ${pricing.currency}\n`;
    response += `🎉 الخصم (${discount}%): -${pricing.discount_amount} ${pricing.currency}\n`;
    response += `✅ السعر النهائي: ${price} ${pricing.currency}\n\n`;
    response += `تهانينا! حصلت على خصم ${discount}% على هذه الرحلة! 🎊`;
  } else {
    response += `💰 السعر: ${price} ${pricing.currency}\n\n`;
    
    // اقتراح للحصول على خصم
    if (pricing.discount_eligible) {
      if (distance < 50) {
        response += `💡 نصيحة: أضف ${50 - distance} كم للحصول على خصم 5%`;
      } else if (distance < 150) {
        response += `💡 نصيحة: أضف ${150 - distance} كم للحصول على خصم 10%`;
      } else if (distance < 300) {
        response += `💡 نصيحة: أضف ${300 - distance} كم للحصول على خصم 15%`;
      } else if (distance < 500) {
        response += `💡 نصيحة: أضف ${500 - distance} كم للحصول على خصم 20%`;
      }
    }
  }
  
  return response;
}

module.exports = router;
