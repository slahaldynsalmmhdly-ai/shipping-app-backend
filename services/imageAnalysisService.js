const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');

// تحميل قاعدة بيانات الكلمات المفتاحية
const cargoKeywords = require('../data/cargo_keywords.json');

// إنشاء عميل Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || 'your-replicate-token-here',
});

/**
 * تحليل الصورة باستخدام Replicate API (CLIP + BLIP)
 * لا يحتاج Python أو مكتبات ضخمة!
 */
async function analyzeImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('الصورة غير موجودة');
    }

    console.log('🔍 بدء تحليل الصورة باستخدام Replicate API...');

    // قراءة الصورة وتحويلها إلى Base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    // 1. استخدام BLIP لإنتاج وصف تفصيلي
    console.log('📝 استخدام BLIP لوصف الصورة...');
    const description = await generateImageCaption(dataUri);
    console.log(`✅ الوصف: ${description}`);

    // 2. استخدام CLIP للحصول على الكلمات المفتاحية
    console.log('🏷️ استخدام CLIP للتصنيف...');
    const clipTags = await classifyImageWithCLIP(dataUri);
    console.log(`✅ الكلمات المفتاحية: ${clipTags.join(', ')}`);

    // 3. تحديد نوع الحمولة بناءً على النتائج
    const cargoType = determineCargoType(description, clipTags);
    console.log(`📦 نوع الحمولة: ${cargoType}`);

    // 4. حساب نسبة الثقة
    const confidence = calculateConfidence(description, clipTags, cargoType);

    // حذف الصورة بعد التحليل
    fs.unlinkSync(imagePath);
    console.log('🗑️ تم حذف الصورة بعد التحليل');

    return {
      success: true,
      cargo_type: cargoType,
      clip_tags: clipTags,
      description: description,
      confidence: confidence
    };

  } catch (error) {
    console.error('❌ خطأ في تحليل الصورة:', error.message);
    
    // حذف الصورة حتى في حالة الخطأ
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    throw error;
  }
}

/**
 * استخدام BLIP لإنتاج وصف للصورة
 */
async function generateImageCaption(imageDataUri) {
  try {
    const output = await replicate.run(
      "salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746",
      {
        input: {
          image: imageDataUri,
          task: "image_captioning"
        }
      }
    );

    if (output && typeof output === 'string') {
      return output.trim();
    }

    return 'حمولة غير محددة';
  } catch (error) {
    console.error('❌ خطأ في BLIP:', error.message);
    return 'حمولة غير محددة';
  }
}

/**
 * استخدام CLIP للتصنيف
 */
async function classifyImageWithCLIP(imageDataUri) {
  try {
    // قائمة الفئات للتصنيف
    const candidateLabels = [
      'cardboard boxes',
      'sand pile',
      'iron metal bars',
      'furniture items',
      'food products',
      'transport equipment',
      'trailer truck',
      'cement bags',
      'shipping container',
      'general cargo'
    ];

    const output = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: imageDataUri
        }
      }
    );

    // CLIP يرجع embeddings، نستخدم BLIP interrogator بدلاً منه
    const interrogatorOutput = await replicate.run(
      "pharmapsychotic/clip-interrogator:a4a8bafd6089e1716b06057c42b19378250d008b80fe87caa5cd36d40c1eda90",
      {
        input: {
          image: imageDataUri,
          mode: "best"
        }
      }
    );

    if (interrogatorOutput && typeof interrogatorOutput === 'string') {
      // استخراج الكلمات المفتاحية من النتيجة
      const keywords = interrogatorOutput.toLowerCase().split(',').map(k => k.trim()).slice(0, 5);
      return keywords;
    }

    return ['general cargo'];
  } catch (error) {
    console.error('❌ خطأ في CLIP:', error.message);
    return ['general cargo'];
  }
}

/**
 * تحديد نوع الحمولة بناءً على الوصف والكلمات المفتاحية
 */
function determineCargoType(description, clipTags) {
  const combinedText = `${description} ${clipTags.join(' ')}`.toLowerCase();

  // البحث في قاعدة البيانات
  for (const [cargoType, data] of Object.entries(cargoKeywords)) {
    const keywords = data.keywords || [];
    
    // التحقق من وجود أي كلمة مفتاحية
    for (const keyword of keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        return data.arabic_name;
      }
    }
  }

  // إذا لم نجد تطابق، نستخدم mapping بسيط
  const mapping = {
    'box': 'كراتين',
    'cardboard': 'كراتين',
    'sand': 'رمل',
    'iron': 'حديد',
    'metal': 'حديد',
    'furniture': 'أثاث',
    'chair': 'أثاث',
    'table': 'أثاث',
    'food': 'مواد غذائية',
    'truck': 'معدات نقل',
    'trailer': 'مقطورة',
    'cement': 'أسمنت',
    'bag': 'أسمنت',
    'container': 'شحن دولي',
    'shipping': 'شحن دولي'
  };

  for (const [keyword, type] of Object.entries(mapping)) {
    if (combinedText.includes(keyword)) {
      return type;
    }
  }

  return 'بضائع عامة';
}

/**
 * حساب نسبة الثقة
 */
function calculateConfidence(description, clipTags, cargoType) {
  let confidence = 0.5; // قيمة أساسية

  // زيادة الثقة إذا كان الوصف واضح
  if (description && description.length > 10 && description !== 'حمولة غير محددة') {
    confidence += 0.2;
  }

  // زيادة الثقة إذا كان هناك كلمات مفتاحية
  if (clipTags && clipTags.length > 0 && !clipTags.includes('general cargo')) {
    confidence += 0.2;
  }

  // زيادة الثقة إذا كان نوع الحمولة محدد
  if (cargoType && cargoType !== 'بضائع عامة') {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * تحليل صورة من Base64
 */
async function analyzeImageFromBase64(base64Data) {
  try {
    // إزالة البادئة إذا وجدت
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // تحويل Base64 إلى Buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // حفظ مؤقتاً
    const tempPath = path.join(__dirname, '../temp', `temp_${Date.now()}.jpg`);
    
    // إنشاء مجلد temp إذا لم يكن موجود
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempPath, imageBuffer);
    
    // تحليل الصورة
    return await analyzeImage(tempPath);
    
  } catch (error) {
    console.error('❌ خطأ في تحليل Base64:', error.message);
    throw error;
  }
}

// دوال إضافية للتوافق مع الكود القديم
function matchCargoType(clipTags, blipDescription) {
  const cargoType = determineCargoType(blipDescription, clipTags);
  const confidence = calculateConfidence(blipDescription, clipTags, cargoType);
  
  return {
    cargo_type: cargoType,
    confidence: confidence
  };
}

function deleteTemporaryImage(imagePath) {
  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`تم حذف الصورة المؤقتة: ${imagePath}`);
    }
  } catch (error) {
    console.error(`خطأ في حذف الصورة المؤقتة: ${error.message}`);
  }
}

module.exports = {
  analyzeImage,
  analyzeImageFromBase64,
  matchCargoType,
  deleteTemporaryImage,
  cargoKeywords
};
