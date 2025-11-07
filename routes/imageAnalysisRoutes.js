const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  analyzeImage,
  matchCargoType,
  deleteTemporaryImage,
  cargoKeywords
} = require('../services/imageAnalysisService');

// إعداد Multer للتعامل مع رفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // حد أقصى 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بالصور (JPEG, PNG, WebP)'));
    }
  }
});

/**
 * @route   POST /api/v1/analyze-image
 * @desc    تحليل صورة الحمولة وتحديد نوعها
 * @access  Public
 */
router.post('/', upload.single('image'), async (req, res) => {
  let imagePath = null;
  
  try {
    // التحقق من وجود الصورة
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرفاق صورة'
      });
    }
    
    imagePath = req.file.path;
    console.log(`تحليل الصورة: ${imagePath}`);
    
    // تحليل الصورة باستخدام CLIP و BLIP
    const analysisResult = await analyzeImage(imagePath);
    
    if (!analysisResult || analysisResult.status !== 'success') {
      throw new Error('فشل تحليل الصورة');
    }
    
    // مطابقة النتائج مع أنواع الحمولات
    const matchResult = matchCargoType(
      analysisResult.clip_tags,
      analysisResult.blip_description
    );
    
    // الحصول على معلومات نوع الحمولة
    const cargoTypeInfo = cargoKeywords.cargo_types.find(
      ct => ct.type === matchResult.cargo_type
    );
    
    // إعداد الاستجابة
    const response = {
      success: true,
      cargo_type: matchResult.cargo_type,
      description: analysisResult.blip_description,
      clip_tags: analysisResult.clip_tags,
      confidence: matchResult.confidence,
      cargo_info: {
        type: cargoTypeInfo.type,
        description: cargoTypeInfo.description,
        base_price_factor: cargoTypeInfo.base_price_factor,
        discount_eligible: cargoTypeInfo.discount_eligible
      },
      all_scores: matchResult.all_scores
    };
    
    // حذف الصورة المؤقتة
    deleteTemporaryImage(imagePath);
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('خطأ في تحليل الصورة:', error);
    
    // حذف الصورة المؤقتة في حالة الخطأ
    if (imagePath) {
      deleteTemporaryImage(imagePath);
    }
    
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحليل الصورة',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/analyze-image/base64
 * @desc    تحليل صورة الحمولة من Base64
 * @access  Public
 */
router.post('/base64', async (req, res) => {
  let imagePath = null;
  
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال الصورة بصيغة Base64'
      });
    }
    
    // فك تشفير Base64 وحفظ الصورة مؤقتاً
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    imagePath = path.join(tempDir, `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);
    fs.writeFileSync(imagePath, buffer);
    
    console.log(`تحليل الصورة من Base64: ${imagePath}`);
    
    // تحليل الصورة باستخدام CLIP و BLIP
    const analysisResult = await analyzeImage(imagePath);
    
    if (!analysisResult || analysisResult.status !== 'success') {
      throw new Error('فشل تحليل الصورة');
    }
    
    // مطابقة النتائج مع أنواع الحمولات
    const matchResult = matchCargoType(
      analysisResult.clip_tags,
      analysisResult.blip_description
    );
    
    // الحصول على معلومات نوع الحمولة
    const cargoTypeInfo = cargoKeywords.cargo_types.find(
      ct => ct.type === matchResult.cargo_type
    );
    
    // إعداد الاستجابة
    const response = {
      success: true,
      cargo_type: matchResult.cargo_type,
      description: analysisResult.blip_description,
      clip_tags: analysisResult.clip_tags,
      confidence: matchResult.confidence,
      cargo_info: {
        type: cargoTypeInfo.type,
        description: cargoTypeInfo.description,
        base_price_factor: cargoTypeInfo.base_price_factor,
        discount_eligible: cargoTypeInfo.discount_eligible
      },
      all_scores: matchResult.all_scores
    };
    
    // حذف الصورة المؤقتة
    deleteTemporaryImage(imagePath);
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('خطأ في تحليل الصورة:', error);
    
    // حذف الصورة المؤقتة في حالة الخطأ
    if (imagePath) {
      deleteTemporaryImage(imagePath);
    }
    
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحليل الصورة',
      error: error.message
    });
  }
});

module.exports = router;
