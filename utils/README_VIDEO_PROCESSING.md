# Video Processing Setup

## Overview

This module provides video processing capabilities including:
- **Thumbnail generation** from the first frame of the video
- **Video compression** to reduce file size
- **Metadata extraction** (width, height, duration)

## Requirements

### 1. Install ffmpeg

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

#### On macOS:
```bash
brew install ffmpeg
```

#### On Docker:
Add to your `Dockerfile`:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

### 2. Install Node.js dependencies

Already installed in `package.json`:
```bash
npm install fluent-ffmpeg
```

## Usage

### In your route file:

```javascript
const { processVideo } = require('../utils/videoProcessor');

router.post('/create', protect, upload.single('media'), async (req, res) => {
  try {
    let mediaData;

    if (req.file.mimetype.startsWith('video')) {
      // Process video
      const processed = await processVideo(req.file.path, {
        compress: true // Enable video compression
      });

      mediaData = {
        type: 'video',
        url: processed.videoUrl,
        thumbnail: processed.thumbnailUrl,
        width: processed.width,
        height: processed.height,
        duration: processed.duration
      };
    } else {
      // Regular image
      mediaData = {
        type: 'image',
        url: `/uploads/${req.file.filename}`
      };
    }

    // Save to database...
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

## Important Notes

### For Render.com users:

**Render.com Free tier does NOT support installing system packages like ffmpeg.**

**Solutions:**

1. **Upgrade to Paid tier** - Allows custom Docker images with ffmpeg

2. **Use Cloudinary** (Recommended for Render.com):
   ```bash
   npm install cloudinary
   ```

   ```javascript
   const cloudinary = require('cloudinary').v2;

   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET
   });

   // Upload video with automatic thumbnail
   const result = await cloudinary.uploader.upload(videoPath, {
     resource_type: 'video',
     eager: [
       { width: 1280, height: 720, crop: 'limit', format: 'jpg', page: 1 }
     ]
   });

   // result.url = video URL
   // result.eager[0].url = thumbnail URL
   ```

   **Cloudinary Free tier includes:**
   - 10 GB storage
   - 10 GB bandwidth/month
   - Automatic thumbnail generation
   - CDN included

3. **Use VPS** - Deploy to a VPS (DigitalOcean, AWS, etc.) where you have full control

## Alternative: Client-side thumbnail generation

If you cannot use ffmpeg on the server, you can generate thumbnails on the client side using Canvas (already implemented in the frontend).

## Testing

To test if ffmpeg is installed:
```bash
ffmpeg -version
```

## Performance

- Thumbnail generation: ~1-2 seconds per video
- Video compression: ~10-30 seconds for a 1-minute video (depends on file size and quality)

For large videos, consider using a queue system (Bull, RabbitMQ) to process videos in the background.

## Troubleshooting

### Error: "ffmpeg not found"
- ffmpeg is not installed on the server
- Solution: Install ffmpeg or use Cloudinary

### Error: "EACCES: permission denied"
- The uploads directory doesn't have write permissions
- Solution: `chmod 755 uploads/`

### Error: "Out of memory"
- Video is too large for available RAM
- Solution: Use a queue system or external service

## License

MIT

