const https = require('https');
const http = require('http');

/**
 * استخراج أبعاد الفيديو من رابط Cloudinary
 * @param {string} videoUrl - رابط الفيديو من Cloudinary
 * @returns {Promise<{width: number, height: number}>}
 */
async function getVideoMetadataFromCloudinary(videoUrl) {
  try {
    // استخراج معلومات الرابط
    const match = videoUrl.match(/cloudinary\.com\/([^\/]+)\/(video)\/upload\/(.+)/);
    if (!match) {
      throw new Error('Invalid Cloudinary URL');
    }

    const [, cloudName, , rest] = match;
    
    // استخدام Cloudinary API للحصول على metadata
    // نضيف fl_getinfo للحصول على معلومات الفيديو
    const infoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/fl_getinfo/${rest}`;
    
    return new Promise((resolve, reject) => {
      const protocol = infoUrl.startsWith('https') ? https : http;
      
      protocol.get(infoUrl, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            if (info.input && info.input.width && info.input.height) {
              resolve({
                width: info.input.width,
                height: info.input.height
              });
            } else {
              // إذا فشل fl_getinfo، نستخدم طريقة بديلة
              // نطلب الفيديو مع w_1 ونقرأ الأبعاد من response headers
              getVideoDimensionsFromHeaders(videoUrl).then(resolve).catch(reject);
            }
          } catch (error) {
            reject(new Error('Failed to parse video metadata'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error getting video metadata:', error);
    // إرجاع أبعاد افتراضية في حالة الفشل
    return { width: 1920, height: 1080 };
  }
}

/**
 * طريقة بديلة: استخراج الأبعاد من thumbnail
 */
async function getVideoDimensionsFromHeaders(videoUrl) {
  try {
    const match = videoUrl.match(/cloudinary\.com\/([^\/]+)\/(video)\/upload\/(.+?)(\.[^.]+)?$/);
    if (!match) {
      return { width: 1920, height: 1080 };
    }

    const [, cloudName, , publicId] = match;
    
    // نطلب thumbnail بدون تحديد أبعاد للحصول على الأبعاد الأصلية
    const thumbnailUrl = `https://res.cloudinary.com/${cloudName}/video/upload/so_0/${publicId}.jpg`;
    
    return new Promise((resolve, reject) => {
      https.get(thumbnailUrl, (res) => {
        let chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
          // نقرأ أول 24 بايت فقط (كافية لقراءة JPEG header)
          if (Buffer.concat(chunks).length >= 24) {
            res.destroy(); // نوقف التحميل
          }
        });
        
        res.on('close', () => {
          try {
            const buffer = Buffer.concat(chunks);
            const dimensions = getJPEGDimensions(buffer);
            if (dimensions) {
              resolve(dimensions);
            } else {
              resolve({ width: 1920, height: 1080 });
            }
          } catch (error) {
            resolve({ width: 1920, height: 1080 });
          }
        });
      }).on('error', () => {
        resolve({ width: 1920, height: 1080 });
      });
    });
  } catch (error) {
    return { width: 1920, height: 1080 };
  }
}

/**
 * قراءة أبعاد JPEG من buffer
 */
function getJPEGDimensions(buffer) {
  try {
    // JPEG يبدأ بـ FF D8
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return null;
    }

    let offset = 2;
    
    while (offset < buffer.length) {
      // نبحث عن marker
      if (buffer[offset] !== 0xFF) {
        return null;
      }
      
      const marker = buffer[offset + 1];
      offset += 2;
      
      // SOF markers (Start of Frame)
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        // نقفز 3 بايتات (length + precision)
        offset += 3;
        
        // نقرأ الأبعاد (big-endian)
        const height = (buffer[offset] << 8) | buffer[offset + 1];
        const width = (buffer[offset + 2] << 8) | buffer[offset + 3];
        
        return { width, height };
      }
      
      // نقرأ طول الـ segment ونقفز إليه
      const segmentLength = (buffer[offset] << 8) | buffer[offset + 1];
      offset += segmentLength;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  getVideoMetadataFromCloudinary
};

