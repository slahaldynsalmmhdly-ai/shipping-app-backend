const fs = require('fs');
const path = require('path');

// تحميل قاموس الحمولات وقواعد التسعير
const cargoData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/cargo_keywords.json'), 'utf8')
);

/**
 * حساب السعر بناءً على نوع الحمولة والمسافة والوزن
 * @param {Object} params - معاملات الحساب
 * @param {string} params.cargoType - نوع الحمولة
 * @param {number} params.distance - المسافة بالكيلومتر
 * @param {string} params.weightCategory - فئة الوزن (light, medium, heavy, very_heavy)
 * @param {boolean} params.isFragile - هل الحمولة هشة
 * @param {boolean} params.isRefrigerated - هل تحتاج تبريد
 * @param {boolean} params.isHazardous - هل خطرة
 * @param {boolean} params.isOversized - هل كبيرة الحجم
 * @param {boolean} params.isExpress - هل شحن سريع
 * @returns {Object} - تفاصيل السعر
 */
function calculatePrice(params) {
  const {
    cargoType = 'بضائع عامة',
    distance = 100,
    weightCategory = 'medium',
    isFragile = false,
    isRefrigerated = false,
    isHazardous = false,
    isOversized = false,
    isExpress = false
  } = params;

  // الحصول على معلومات نوع الحمولة
  const cargoTypeInfo = cargoData.cargo_types.find(ct => ct.type === cargoType);
  if (!cargoTypeInfo) {
    throw new Error(`نوع الحمولة غير معروف: ${cargoType}`);
  }

  // السعر الأساسي
  const baseRate = cargoData.pricing_rules.base_rate_per_km;
  let totalPrice = baseRate * distance;

  // تطبيق معامل نوع الحمولة
  totalPrice *= cargoTypeInfo.base_price_factor;

  // تطبيق معامل الوزن
  const weightMultiplier = cargoData.pricing_rules.weight_multiplier[weightCategory] || 1.0;
  totalPrice *= weightMultiplier;

  // تطبيق معاملات المعالجة الخاصة
  const specialHandling = cargoData.pricing_rules.special_handling;
  let specialHandlingFactor = 1.0;
  const appliedSpecialHandling = [];

  if (isFragile) {
    specialHandlingFactor *= specialHandling.fragile;
    appliedSpecialHandling.push('هش');
  }
  if (isRefrigerated) {
    specialHandlingFactor *= specialHandling.refrigerated;
    appliedSpecialHandling.push('مبرد');
  }
  if (isHazardous) {
    specialHandlingFactor *= specialHandling.hazardous;
    appliedSpecialHandling.push('خطر');
  }
  if (isOversized) {
    specialHandlingFactor *= specialHandling.oversized;
    appliedSpecialHandling.push('كبير الحجم');
  }
  if (isExpress) {
    specialHandlingFactor *= specialHandling.express;
    appliedSpecialHandling.push('سريع');
  }

  totalPrice *= specialHandlingFactor;

  // حساب الخصم بناءً على نوع الحمولة (ثقيلة أو خفيفة)
  let discount = 0;
  let discountPercentage = 0;
  
  // تحديد إذا كانت الحمولة ثقيلة أو خفيفة
  const heavyCargoTypes = ['رمل', 'حديد', 'أسمنت', 'طوب', 'بلوك', 'حصى', 'خرسانة', 'مقطورة'];
  const isHeavyCargo = heavyCargoTypes.includes(cargoType);
  
  if (cargoTypeInfo.discount_eligible) {
    if (isHeavyCargo) {
      // حمولة ثقيلة: خصم 15%
      discountPercentage = 0.15;
    } else {
      // حمولة خفيفة: خصم حسب النوع
      if (cargoType === 'أثاث') {
        discountPercentage = 0.10;
      } else if (cargoType === 'مواد غذائية') {
        discountPercentage = 0.05;
      } else if (cargoType === 'إلكترونيات' || cargoType === 'أجهزة كهربائية') {
        discountPercentage = 0.07;
      } else {
        discountPercentage = 0.05; // خصم افتراضي للحمولات الخفيفة الأخرى
      }
    }
    
    discount = totalPrice * discountPercentage;
  }

  const finalPrice = totalPrice - discount;

  return {
    cargo_type: cargoType,
    distance: distance,
    weight_category: weightCategory,
    base_price: parseFloat((baseRate * distance).toFixed(2)),
    cargo_factor: cargoTypeInfo.base_price_factor,
    weight_multiplier: weightMultiplier,
    special_handling_factor: parseFloat(specialHandlingFactor.toFixed(2)),
    applied_special_handling: appliedSpecialHandling,
    subtotal: parseFloat(totalPrice.toFixed(2)),
    discount_eligible: cargoTypeInfo.discount_eligible,
    discount_percentage: parseFloat((discountPercentage * 100).toFixed(2)),
    discount_amount: parseFloat(discount.toFixed(2)),
    final_price: parseFloat(finalPrice.toFixed(2)),
    currency: 'ريال سعودي'
  };
}

/**
 * الحصول على توصيات الخصم بناءً على المسافة
 * @param {number} currentDistance - المسافة الحالية
 * @param {string} cargoType - نوع الحمولة
 * @returns {Object} - توصيات الخصم
 */
function getDiscountRecommendations(currentDistance, cargoType) {
  const cargoTypeInfo = cargoData.cargo_types.find(ct => ct.type === cargoType);
  
  if (!cargoTypeInfo || !cargoTypeInfo.discount_eligible) {
    return {
      eligible: false,
      message: 'هذا النوع من الحمولة غير مؤهل للخصومات'
    };
  }

  const recommendations = [];
  
  if (currentDistance < 50) {
    recommendations.push({
      threshold: 50,
      discount: '5%',
      additional_distance: 50 - currentDistance
    });
  }
  if (currentDistance < 150) {
    recommendations.push({
      threshold: 150,
      discount: '10%',
      additional_distance: 150 - currentDistance
    });
  }
  if (currentDistance < 300) {
    recommendations.push({
      threshold: 300,
      discount: '15%',
      additional_distance: 300 - currentDistance
    });
  }
  if (currentDistance < 500) {
    recommendations.push({
      threshold: 500,
      discount: '20%',
      additional_distance: 500 - currentDistance
    });
  }

  return {
    eligible: true,
    current_distance: currentDistance,
    recommendations: recommendations
  };
}

module.exports = {
  calculatePrice,
  getDiscountRecommendations
};
