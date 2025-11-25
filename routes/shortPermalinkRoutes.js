const express = require('express');
const router = express.Router();
const Short = require('../models/Short');

// @desc    Get short permalink preview (for social media sharing)
// @route   GET /s/:shortId
// @access  Public
router.get('/:shortId', async (req, res) => {
  try {
    const short = await Short.findById(req.params.shortId)
      .populate('user', 'name companyName avatar');

    if (!short) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>الفيديو غير موجود</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px;">
          <h1>الفيديو غير موجود</h1>
          <p>عذراً، لم نتمكن من العثور على هذا الفيديو.</p>
        </body>
        </html>
      `);
    }

    // Extract short details
    const shortTitle = short.title || short.description?.substring(0, 100) || 'فيديو قصير';
    const shortDescription = short.description || short.title || 'شاهد هذا الفيديو';
    const authorName = short.user?.companyName || short.user?.name || 'مستخدم';
    
    // Get thumbnail and video URLs
    let thumbnailUrl = short.thumbnailUrl;
    let videoUrl = short.videoUrl;
    
    // Build full URLs
    let fullThumbnailUrl = null;
    let fullVideoUrl = null;
    
    if (thumbnailUrl) {
      if (thumbnailUrl.startsWith('http')) {
        fullThumbnailUrl = thumbnailUrl;
        // If Cloudinary image, transform to larger size for better preview
        if (fullThumbnailUrl.includes('cloudinary.com')) {
          fullThumbnailUrl = fullThumbnailUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill/');
        }
      } else {
        fullThumbnailUrl = `${req.protocol}://${req.get('host')}${thumbnailUrl}`;
      }
    }
    
    if (videoUrl) {
      if (videoUrl.startsWith('http')) {
        fullVideoUrl = videoUrl;
      } else {
        fullVideoUrl = `${req.protocol}://${req.get('host')}${videoUrl}`;
      }
    }

    // Generate HTML response
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mehnaty.ly - ${shortTitle}</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="Mehnaty.ly - ${shortTitle}">
  <meta property="og:site_name" content="Mehnaty.ly">
  <meta property="og:description" content="${shortDescription}">
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${req.protocol}://${req.get('host')}/s/${short._id}">
  ${fullThumbnailUrl ? `<meta property="og:image" content="${fullThumbnailUrl}">
  <meta property="og:image:width" content="1080">
  <meta property="og:image:height" content="1920">
  <meta property="og:image:type" content="image/jpeg">` : ''}
  ${fullVideoUrl ? `<meta property="og:video" content="${fullVideoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="1080">
  <meta property="og:video:height" content="1920">` : ''}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="Mehnaty.ly - ${shortTitle}">
  <meta name="twitter:site" content="@Mehnaty_ly">
  <meta name="twitter:description" content="${shortDescription}">
  ${fullThumbnailUrl ? `<meta name="twitter:image" content="${fullThumbnailUrl}">` : ''}
  
  <!-- WhatsApp & Telegram Optimization -->
  <meta property="og:locale" content="ar_AR">
  <meta name="description" content="${shortDescription}">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .container {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 16px;
      opacity: 0.9;
    }
    
    .content {
      padding: 30px;
    }
    
    .post-text {
      font-size: 18px;
      line-height: 1.6;
      color: #333;
      margin-bottom: 20px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .post-video {
      width: 100%;
      border-radius: 12px;
      margin-bottom: 20px;
      max-height: 500px;
    }
    
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    
    .btn:hover {
      transform: translateY(-2px);
    }
    
    @media (max-width: 600px) {
      .header h1 {
        font-size: 20px;
      }
      
      .post-text {
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mehnaty.ly</h1>
      <p>${authorName}</p>
    </div>
    
    <div class="content">
      ${short.title ? `<h2 class="post-text">${short.title}</h2>` : ''}
      ${short.description ? `<div class="post-text">${short.description}</div>` : ''}
      
      ${fullVideoUrl ? 
        `<video controls class="post-video" poster="${fullThumbnailUrl}">
          <source src="${fullVideoUrl}" type="video/mp4">
          متصفحك لا يدعم تشغيل الفيديو.
        </video>` : 
        fullThumbnailUrl ? 
        `<img src="${fullThumbnailUrl}" alt="Video thumbnail" class="post-video">` : 
        ''
      }
    </div>
    
    <div class="footer">
      <a href="${req.protocol}://${req.get('host')}/api/v1/shorts/${short._id}" class="btn">مشاهدة الفيديو الكامل</a>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    console.error('Error in short permalink route:', err.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>خطأ</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px;">
        <h1>حدث خطأ</h1>
        <p>عذراً، حدث خطأ أثناء تحميل الفيديو.</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
