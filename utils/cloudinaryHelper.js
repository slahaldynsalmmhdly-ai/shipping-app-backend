/**
 * Cloudinary Helper Utilities
 * 
 * هذا الملف يحتوي على دوال مساعدة لتوليد روابط Cloudinary محسّنة
 * للفيديوهات والصور مع دعم التكيف التلقائي لجودة الشبكة
 */

/**
 * استخراج معلومات Cloudinary من رابط كامل
 * @param {string} cloudinaryUrl - الرابط الكامل من Cloudinary
 * @returns {object} - معلومات الملف (cloud_name, resource_type, public_id)
 */
function parseCloudinaryUrl(cloudinaryUrl) {
  try {
    // مثال: https://res.cloudinary.com/demo/video/upload/v1234567890/folder/video-id.mp4
    const urlPattern = /cloudinary\.com\/([^\/]+)\/(image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = cloudinaryUrl.match(urlPattern);
    
    if (match) {
      return {
        cloudName: match[1],
        resourceType: match[2],
        publicId: match[3]
      };
    }
    
    // إذا كان الرابط لا يحتوي على cloudinary، نعيد null
    return null;
  } catch (error) {
    console.error('Error parsing Cloudinary URL:', error);
    return null;
  }
}

/**
 * توليد رابط فيديو محسّن مع جودة تلقائية وصيغة تلقائية
 * @param {string} cloudinaryUrl - الرابط الأصلي من Cloudinary
 * @param {object} options - خيارات التحسين
 * @returns {string} - رابط الفيديو المحسّن
 */
function getOptimizedVideoUrl(cloudinaryUrl, options = {}) {
  const parsed = parseCloudinaryUrl(cloudinaryUrl);
  
  if (!parsed || parsed.resourceType !== 'video') {
    return cloudinaryUrl; // إرجاع الرابط الأصلي إذا لم يكن فيديو Cloudinary
  }
  
  const {
    quality = 'auto:good', // q_auto:good - جودة جيدة مع حجم معقول
    format = 'auto',       // f_auto - اختيار الصيغة تلقائياً
    width = null,          // عرض الفيديو (اختياري)
    height = null,         // ارتفاع الفيديو (اختياري)
    bitRate = null,        // معدل البت (اختياري) مثل: '250k'
    codec = 'auto'         // vc_auto - اختيار الترميز تلقائياً
  } = options;
  
  // بناء معاملات التحويل
  const transformations = [];
  
  // إضافة الجودة
  transformations.push(`q_${quality}`);
  
  // إضافة الصيغة
  transformations.push(`f_${format}`);
  
  // إضافة الترميز
  if (codec !== 'auto') {
    transformations.push(`vc_${codec}`);
  }
  
  // إضافة الأبعاد إذا كانت محددة
  if (width) {
    transformations.push(`w_${width}`);
  }
  if (height) {
    transformations.push(`h_${height}`);
  }
  
  // إضافة معدل البت إذا كان محدداً
  if (bitRate) {
    transformations.push(`br_${bitRate}`);
  }
  
  const transformString = transformations.join(',');
  
  // بناء الرابط المحسّن
  return `https://res.cloudinary.com/${parsed.cloudName}/video/upload/${transformString}/${parsed.publicId}`;
}

/**
 * توليد رابط صورة مصغرة (thumbnail) من فيديو
 * @param {string} cloudinaryUrl - الرابط الأصلي للفيديو من Cloudinary
 * @param {object} options - خيارات الصورة المصغرة
 * @returns {string} - رابط الصورة المصغرة
 */
function getVideoThumbnailUrl(cloudinaryUrl, options = {}) {
  const parsed = parseCloudinaryUrl(cloudinaryUrl);
  
  if (!parsed || parsed.resourceType !== 'video') {
    return cloudinaryUrl; // إرجاع الرابط الأصلي إذا لم يكن فيديو Cloudinary
  }
  
  const {
    startOffset = 0,       // so_ - الثانية التي نستخرج منها الإطار (افتراضي: 0)
    width = 400,           // عرض الصورة المصغرة
    height = 300,          // ارتفاع الصورة المصغرة
    crop = 'fill',         // نوع القص (fill, thumb, scale, etc.)
    quality = 'auto',      // جودة الصورة
    format = 'jpg',        // صيغة الصورة (jpg, png, webp)
    gravity = 'auto'       // g_auto - تحديد المحتوى المهم تلقائياً
  } = options;
  
  // بناء معاملات التحويل
  const transformations = [
    `so_${startOffset}`,   // Start offset
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `q_${quality}`,
    `g_${gravity}`
  ];
  
  const transformString = transformations.join(',');
  
  // بناء الرابط مع تغيير الامتداد إلى صورة
  return `https://res.cloudinary.com/${parsed.cloudName}/video/upload/${transformString}/${parsed.publicId}.${format}`;
}

/**
 * توليد رابط صورة محسّنة مع جودة وصيغة تلقائية
 * @param {string} cloudinaryUrl - الرابط الأصلي من Cloudinary
 * @param {object} options - خيارات التحسين
 * @returns {string} - رابط الصورة المحسّنة
 */
function getOptimizedImageUrl(cloudinaryUrl, options = {}) {
  const parsed = parseCloudinaryUrl(cloudinaryUrl);
  
  if (!parsed || parsed.resourceType !== 'image') {
    return cloudinaryUrl; // إرجاع الرابط الأصلي إذا لم تكن صورة Cloudinary
  }
  
  const {
    quality = 'auto',      // q_auto - جودة تلقائية
    format = 'auto',       // f_auto - صيغة تلقائية (WebP, AVIF, etc.)
    width = null,          // عرض الصورة (اختياري)
    height = null,         // ارتفاع الصورة (اختياري)
    crop = null,           // نوع القص (اختياري)
    dpr = 'auto',          // dpr_auto - كثافة البكسل التلقائية
    gravity = null         // تحديد نقطة التركيز (اختياري)
  } = options;
  
  // بناء معاملات التحويل
  const transformations = [];
  
  // إضافة الجودة والصيغة
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  
  // إضافة كثافة البكسل
  if (dpr !== 'none') {
    transformations.push(`dpr_${dpr}`);
  }
  
  // إضافة الأبعاد إذا كانت محددة
  if (width) {
    transformations.push(`w_${width}`);
  }
  if (height) {
    transformations.push(`h_${height}`);
  }
  
  // إضافة نوع القص إذا كان محدداً
  if (crop) {
    transformations.push(`c_${crop}`);
  }
  
  // إضافة نقطة التركيز إذا كانت محددة
  if (gravity) {
    transformations.push(`g_${gravity}`);
  }
  
  const transformString = transformations.join(',');
  
  // بناء الرابط المحسّن
  return `https://res.cloudinary.com/${parsed.cloudName}/image/upload/${transformString}/${parsed.publicId}`;
}

/**
 * توليد رابط صورة placeholder منخفض الجودة للتحميل السريع
 * @param {string} cloudinaryUrl - الرابط الأصلي من Cloudinary
 * @returns {string} - رابط الصورة المنخفضة الجودة
 */
function getImagePlaceholderUrl(cloudinaryUrl) {
  const parsed = parseCloudinaryUrl(cloudinaryUrl);
  
  if (!parsed || parsed.resourceType !== 'image') {
    return cloudinaryUrl;
  }
  
  // إنشاء placeholder مع blur وجودة منخفضة جداً
  const transformations = [
    'q_auto:low',      // جودة منخفضة
    'f_auto',          // صيغة تلقائية
    'w_50',            // عرض صغير جداً
    'e_blur:1000'      // blur قوي لتقليل الحجم
  ];
  
  const transformString = transformations.join(',');
  
  return `https://res.cloudinary.com/${parsed.cloudName}/image/upload/${transformString}/${parsed.publicId}`;
}

/**
 * معالجة رابط الميديا وإرجاع كائن يحتوي على الروابط المحسّنة
 * @param {string} mediaUrl - الرابط الأصلي للميديا
 * @param {string} mediaType - نوع الميديا ('image' أو 'video')
 * @returns {object} - كائن يحتوي على الروابط المحسّنة
 */
function getOptimizedMediaUrls(mediaUrl, mediaType) {
  if (!mediaUrl) {
    return null;
  }
  
  // التحقق من أن الرابط من Cloudinary
  if (!mediaUrl.includes('cloudinary.com')) {
    return {
      original: mediaUrl,
      optimized: mediaUrl
    };
  }
  
  if (mediaType === 'video') {
    return {
      original: mediaUrl,
      optimized: getOptimizedVideoUrl(mediaUrl),
      thumbnail: getVideoThumbnailUrl(mediaUrl, {
        startOffset: 0,
        width: 640,
        height: 360
      }),
      thumbnailSmall: getVideoThumbnailUrl(mediaUrl, {
        startOffset: 0,
        width: 320,
        height: 180
      })
    };
  } else if (mediaType === 'image') {
    return {
      original: mediaUrl,
      optimized: getOptimizedImageUrl(mediaUrl),
      placeholder: getImagePlaceholderUrl(mediaUrl),
      responsive: {
        small: getOptimizedImageUrl(mediaUrl, { width: 400 }),
        medium: getOptimizedImageUrl(mediaUrl, { width: 800 }),
        large: getOptimizedImageUrl(mediaUrl, { width: 1200 })
      }
    };
  }
  
  return {
    original: mediaUrl,
    optimized: mediaUrl
  };
}

module.exports = {
  parseCloudinaryUrl,
  getOptimizedVideoUrl,
  getVideoThumbnailUrl,
  getOptimizedImageUrl,
  getImagePlaceholderUrl,
  getOptimizedMediaUrls
};

