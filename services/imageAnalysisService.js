const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// تحميل قاموس الحمولات
const cargoKeywords = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/cargo_keywords.json'), 'utf8')
);

/**
 * تحليل الصورة باستخدام Python script الذي يستخدم CLIP و BLIP
 * @param {string} imagePath - مسار الصورة المؤقت
 * @returns {Promise<Object>} - نتيجة التحليل
 */
async function analyzeImage(imagePath) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../scripts/analyze_image.py');
    
    // تشغيل سكريبت Python
    const pythonProcess = spawn('python3.11', [pythonScript, imagePath]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorData);
        reject(new Error(`تحليل الصورة فشل: ${errorData}`));
        return;
      }
      
      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (error) {
        reject(new Error(`خطأ في تحليل نتيجة Python: ${error.message}`));
      }
    });
  });
}

/**
 * مطابقة النتائج مع قائمة الحمولات المعرفة
 * @param {Array<string>} clipTags - الكلمات المستخرجة من CLIP
 * @param {string} blipDescription - الوصف من BLIP
 * @returns {Object} - نوع الحمولة والثقة
 */
function matchCargoType(clipTags, blipDescription) {
  const scores = {};
  const allText = [...clipTags, blipDescription].join(' ').toLowerCase();
  
  // حساب النقاط لكل نوع حمولة
  cargoKeywords.cargo_types.forEach(cargoType => {
    let score = 0;
    
    cargoType.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // تحقق من وجود الكلمة في النص
      if (allText.includes(keywordLower)) {
        score += 1;
      }
      
      // نقاط إضافية إذا كانت الكلمة في CLIP tags
      if (clipTags.some(tag => tag.toLowerCase().includes(keywordLower))) {
        score += 2;
      }
    });
    
    scores[cargoType.type] = score;
  });
  
  // إيجاد أعلى نقاط
  let maxScore = 0;
  let bestMatch = 'بضائع عامة'; // القيمة الافتراضية
  
  Object.keys(scores).forEach(type => {
    if (scores[type] > maxScore) {
      maxScore = scores[type];
      bestMatch = type;
    }
  });
  
  // حساب نسبة الثقة (0-1)
  const confidence = Math.min(maxScore / 10, 1.0);
  
  return {
    cargo_type: bestMatch,
    confidence: confidence,
    all_scores: scores
  };
}

/**
 * حذف الصورة المؤقتة
 * @param {string} imagePath - مسار الصورة
 */
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
  matchCargoType,
  deleteTemporaryImage,
  cargoKeywords
};
