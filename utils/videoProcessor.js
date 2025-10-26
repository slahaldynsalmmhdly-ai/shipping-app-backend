// ===== كود جاهز لمعالجة الفيديو في الخادم =====
// يجب إضافة هذا الكود في ملف رفع الفيديو

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// ===== 1. دالة لتوليد Thumbnail من الفيديو =====
const generateThumbnail = (videoPath, outputDir) => {
  return new Promise((resolve, reject) => {
    const thumbnailFilename = `thumbnail_${Date.now()}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailFilename);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'], // استخراج الإطار من الثانية الأولى
        filename: thumbnailFilename,
        folder: outputDir,
        size: '1280x720' // دقة عالية
      })
      .on('end', () => {
        console.log(`Thumbnail generated: ${thumbnailFilename}`);
        resolve(thumbnailFilename);
      })
      .on('error', (err) => {
        console.error('Error generating thumbnail:', err);
        reject(err);
      });
  });
};

// ===== 2. دالة لضغط الفيديو (اختياري) =====
const compressVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264') // H.264 codec
      .audioCodec('aac') // AAC audio
      .size('1280x720') // HD resolution
      .videoBitrate('2000k') // 2 Mbps
      .audioBitrate('128k')
      .outputOptions([
        '-preset fast', // سرعة معالجة متوسطة
        '-crf 23' // جودة جيدة (18-28، أقل = أفضل)
      ])
      .on('end', () => {
        console.log('Video compression completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error compressing video:', err);
        reject(err);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .save(outputPath);
  });
};

// ===== 3. دالة للحصول على معلومات الفيديو =====
const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        resolve({
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          duration: metadata.format.duration || 0,
          size: metadata.format.size || 0
        });
      }
    });
  });
};

// ===== 4. دالة شاملة لمعالجة الفيديو =====
const processVideo = async (videoPath, options = {}) => {
  try {
    const uploadDir = path.dirname(videoPath);
    const filename = path.basename(videoPath);
    const compressedFilename = `compressed_${filename}`;
    const compressedPath = path.join(uploadDir, compressedFilename);

    // 1. الحصول على معلومات الفيديو
    console.log('Getting video metadata...');
    const metadata = await getVideoMetadata(videoPath);
    console.log('Video metadata:', metadata);

    // 2. توليد thumbnail
    console.log('Generating thumbnail...');
    const thumbnailFilename = await generateThumbnail(videoPath, uploadDir);

    // 3. ضغط الفيديو (اختياري)
    let finalVideoPath = videoPath;
    let finalVideoFilename = filename;
    
    if (options.compress !== false) {
      console.log('Compressing video...');
      await compressVideo(videoPath, compressedPath);
      
      // حذف الفيديو الأصلي واستخدام المضغوط
      fs.unlinkSync(videoPath);
      finalVideoPath = compressedPath;
      finalVideoFilename = compressedFilename;
      
      console.log('Original video deleted, using compressed version');
    }

    return {
      videoUrl: `/uploads/${finalVideoFilename}`,
      thumbnailUrl: `/uploads/${thumbnailFilename}`,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      size: metadata.size
    };
  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
};

// ===== 5. مثال على استخدام الدالة في endpoint =====
// في routes/postRoutes.js أو حيث يتم رفع الفيديو

/*
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/upload-video', protect, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoPath = req.file.path;
    
    // معالجة الفيديو
    const processedVideo = await processVideo(videoPath, {
      compress: true // أو false إذا لا تريد الضغط
    });

    // حفظ في قاعدة البيانات (مثال)
    // const post = new Post({
    //   user: req.user.id,
    //   media: [{
    //     type: 'video',
    //     url: processedVideo.videoUrl,
    //     thumbnail: processedVideo.thumbnailUrl,
    //     width: processedVideo.width,
    //     height: processedVideo.height,
    //     duration: processedVideo.duration
    //   }]
    // });
    // await post.save();

    res.json({
      success: true,
      video: processedVideo
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});
*/

// ===== 6. تحديث النماذج (Models) =====
/*
في models/Post.js:

const mediaSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  thumbnail: { type: String }, // ✅ إضافة
  width: { type: Number }, // ✅ إضافة
  height: { type: Number }, // ✅ إضافة
  duration: { type: Number } // ✅ إضافة (بالثواني)
});

نفس التحديث في:
- models/ShipmentAd.js
- models/EmptyTruckAd.js
*/

// ===== 7. تثبيت المكتبات المطلوبة =====
/*
في terminal:
npm install fluent-ffmpeg

وتثبيت ffmpeg على الخادم:
# Ubuntu/Debian:
sudo apt update
sudo apt install ffmpeg

# أو إذا كنت تستخدم Docker، أضف في Dockerfile:
RUN apt-get update && apt-get install -y ffmpeg
*/

// ===== 8. ملاحظات مهمة =====
/*
1. تأكد من أن مجلد uploads/ موجود وله صلاحيات الكتابة
2. تأكد من أن ffmpeg مثبت على الخادم
3. معالجة الفيديو قد تأخذ وقت (خاصة الضغط)، استخدم queue system للفيديوهات الكبيرة
4. احذف الفيديوهات القديمة بشكل دوري لتوفير المساحة
5. استخدم CDN لتحسين سرعة تحميل الفيديوهات
*/

module.exports = {
  generateThumbnail,
  compressVideo,
  getVideoMetadata,
  processVideo
};

