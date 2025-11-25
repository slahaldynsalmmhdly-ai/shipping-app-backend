const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// @desc    Get post permalink preview (for social media sharing)
// @route   GET /p/:postId
// @access  Public
router.get('/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('user', 'name companyName avatar');

    if (!post) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>المنشور غير موجود</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px;">
          <h1>المنشور غير موجود</h1>
          <p>عذراً، لم نتمكن من العثور على هذا المنشور.</p>
        </body>
        </html>
      `);
    }

    // Extract post details
    const postTitle = post.text ? post.text.substring(0, 100) : 'منشور جديد';
    const postDescription = post.text || 'شاهد هذا المنشور';
    const authorName = post.user?.companyName || post.user?.name || 'مستخدم';
    const hasImage = post.media && post.media.length > 0 && post.media[0].type === 'image';
    const imageUrl = hasImage ? post.media[0].url : null;

    // Build full image URL if exists (use larger version for social media)
    let fullImageUrl = null;
    if (imageUrl) {
      if (imageUrl.startsWith('http')) {
        fullImageUrl = imageUrl;
        // If Cloudinary image, transform to larger size for better preview
        if (fullImageUrl.includes('cloudinary.com')) {
          fullImageUrl = fullImageUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill/');
        }
      } else {
        fullImageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
      }
    }

    // Generate HTML response
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mehnaty.ly - ${postTitle}</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="Mehnaty.ly - ${postTitle}">
  <meta property="og:site_name" content="Mehnaty.ly">
  <meta property="og:description" content="${postDescription}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${req.protocol}://${req.get('host')}/p/${post._id}">
  ${fullImageUrl ? `<meta property="og:image" content="${fullImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">` : ''}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="${fullImageUrl ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="Mehnaty.ly - ${postTitle}">
  <meta name="twitter:site" content="@Mehnaty_ly">
  <meta name="twitter:description" content="${postDescription}">
  ${fullImageUrl ? `<meta name="twitter:image" content="${fullImageUrl}">` : ''}
  
  <!-- WhatsApp & Telegram Optimization -->
  <meta property="og:locale" content="ar_AR">
  <meta name="description" content="${postDescription}">
  
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
    
    .post-image {
      width: 100%;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .placeholder-container {
      width: 100%;
      max-width: 250px;
      height: 250px;
      background: #EEE;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 120px;
      font-weight: bold;
      color: #333;
      margin: 0 auto 20px;
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
      
      .placeholder-container {
        max-width: 200px;
        height: 200px;
        font-size: 100px;
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
      ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
      
      ${fullImageUrl ? 
        `<img src="${fullImageUrl}" alt="Post content" class="post-image">` : 
        `<div class="placeholder-container">م</div>`
      }
    </div>
    
    <div class="footer">
      <a href="${req.protocol}://${req.get('host')}/api/v1/posts/${post._id}" class="btn">عرض المنشور الكامل</a>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    console.error('Error in permalink route:', err.message);
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
        <p>عذراً، حدث خطأ أثناء تحميل المنشور.</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
