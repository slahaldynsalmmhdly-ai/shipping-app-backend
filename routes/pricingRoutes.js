const express = require('express');
const router = express.Router();
const { calculatePrice, getDiscountRecommendations } = require('../services/pricingService');

/**
 * @route   POST /api/v1/pricing/calculate
 * @desc    حساب السعر بناءً على نوع الحمولة والمسافة
 * @access  Public
 */
router.post('/calculate', async (req, res) => {
  try {
    const {
      cargoType,
      distance,
      weightCategory,
      isFragile,
      isRefrigerated,
      isHazardous,
      isOversized,
      isExpress
    } = req.body;

    // التحقق من المعاملات المطلوبة
    if (!cargoType || !distance) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد نوع الحمولة والمسافة'
      });
    }

    // حساب السعر
    const pricing = calculatePrice({
      cargoType,
      distance: parseFloat(distance),
      weightCategory: weightCategory || 'medium',
      isFragile: isFragile || false,
      isRefrigerated: isRefrigerated || false,
      isHazardous: isHazardous || false,
      isOversized: isOversized || false,
      isExpress: isExpress || false
    });

    // الحصول على توصيات الخصم
    const discountRecommendations = getDiscountRecommendations(
      parseFloat(distance),
      cargoType
    );

    res.status(200).json({
      success: true,
      pricing: pricing,
      discount_recommendations: discountRecommendations
    });

  } catch (error) {
    console.error('خطأ في حساب السعر:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حساب السعر',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/pricing/recommendations/:cargoType/:distance
 * @desc    الحصول على توصيات الخصم
 * @access  Public
 */
router.get('/recommendations/:cargoType/:distance', async (req, res) => {
  try {
    const { cargoType, distance } = req.params;

    const recommendations = getDiscountRecommendations(
      parseFloat(distance),
      decodeURIComponent(cargoType)
    );

    res.status(200).json({
      success: true,
      recommendations: recommendations
    });

  } catch (error) {
    console.error('خطأ في الحصول على التوصيات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على التوصيات',
      error: error.message
    });
  }
});

module.exports = router;
