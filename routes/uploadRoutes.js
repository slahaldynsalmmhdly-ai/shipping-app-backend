const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { protect } = require("../middleware/authMiddleware");
const { getOptimizedMediaUrls } = require("../utils/cloudinaryHelper");
const { getVideoMetadataFromCloudinary } = require("../utils/videoMetadata");

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder;
    let resourceType = "auto"; // Let Cloudinary detect automatically
    
    if (file.mimetype.startsWith("image")) {
      folder = "shipping-app/images";
      resourceType = "image";
    } else if (file.mimetype.startsWith("video")) {
      folder = "shipping-app/videos";
      resourceType = "video";
    } else {
      // Fallback: check file extension
      const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (['.mp4', '.mpeg', '.mov', '.webm', '.avi'].includes(fileExt)) {
        folder = "shipping-app/videos";
        resourceType = "video";
      } else {
        folder = "shipping-app/others";
        resourceType = "auto";
      }
    }
    
    return {
      folder: folder,
      resource_type: resourceType,
      // Don't specify format, let Cloudinary handle it automatically
    };
  },
});

// Filter for image and video files
const fileFilter = (req, file, cb) => {
  // التحقق من mimetype أولاً (الأهم)
  if (file.mimetype && (file.mimetype.startsWith("image") || file.mimetype.startsWith("video"))) {
    return cb(null, true);
  }
  
  // التحقق من الامتداد كـ fallback
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', 
                             '.mp4', '.mpeg', '.mov', '.webm', '.avi'];
  const fileExt = file.originalname ? 
    file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.')) : '';
  
  if (allowedExtensions.includes(fileExt)) {
    return cb(null, true);
  }
  
  // إذا كان الاسم "blob" ولكن mimetype صحيح، نقبله
  if (file.originalname === 'blob' && file.mimetype) {
    return cb(null, true);
  }
  
  console.log(`Rejected file: ${file.originalname}, mimetype: ${file.mimetype}`);
  cb(new Error(`نوع الملف غير مدعوم. يرجى رفع صورة أو فيديو فقط.`), false);
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// @desc    Upload single image/video
// @route   POST /api/upload/single
// @access  Private
router.post("/single", protect, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: "حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت" 
        });
      }
      return res.status(400).json({ 
        message: "خطأ في رفع الملف", 
        error: err.message 
      });
    } else if (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ 
        message: "فشل في رفع الملف", 
        error: err.message
      });
    }
    
    if (req.file) {
      console.log("File uploaded successfully:", req.file.path);
      
      const fileType = req.file.mimetype.startsWith("image") ? "image" : "video";
      const optimizedUrls = getOptimizedMediaUrls(req.file.path, fileType);
      
      // إذا كان فيديو، نستخرج الأبعاد
      if (fileType === "video") {
        getVideoMetadataFromCloudinary(req.file.path)
          .then(dimensions => {
            res.json({
              message: "File uploaded successfully",
              url: req.file.path,  // ✅ إضافة url للتوافق مع الواجهة الأمامية
              filePath: req.file.path,
              fileType: fileType,
              optimized: optimizedUrls,
              // إضافة أبعاد الفيديو
              width: dimensions.width,
              height: dimensions.height,
              // إضافة الصورة المصغرة للفيديو
              thumbnail: optimizedUrls.thumbnail || optimizedUrls.thumbnailSmall
            });
          })
          .catch(error => {
            console.error("Error getting video dimensions:", error);
            // نرجع البيانات بدون الأبعاد في حالة الفشل
            res.json({
              message: "File uploaded successfully",
              url: req.file.path,  // ✅ إضافة url للتوافق مع الواجهة الأمامية
              filePath: req.file.path,
              fileType: fileType,
              optimized: optimizedUrls,
              // إضافة الصورة المصغرة حتى في حالة الفشل
              thumbnail: optimizedUrls.thumbnail || optimizedUrls.thumbnailSmall
            });
          });
      } else {
        res.json({
          message: "File uploaded successfully",
          url: req.file.path,  // ✅ إضافة url للتوافق مع الواجهة الأمامية
          filePath: req.file.path,
          fileType: fileType,
          optimized: optimizedUrls
        });
      }
    } else {
      res.status(400).json({ message: "لم يتم تحديد ملف" });
    }
  });
});

// @desc    Upload multiple images/videos
// @route   POST /api/upload/multiple
// @access  Private
router.post("/multiple", protect, (req, res) => {
  upload.array("files", 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: "حجم أحد الملفات كبير جداً. الحد الأقصى 100 ميجابايت لكل ملف" 
        });
      }
      return res.status(400).json({ 
        message: "خطأ في رفع الملفات", 
        error: err.message 
      });
    } else if (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ 
        message: "فشل في رفع الملفات", 
        error: err.message 
      });
    }
    
    if (req.files && req.files.length > 0) {
      console.log(`${req.files.length} files uploaded successfully`);
      
      // معالجة الملفات بشكل غير متزامن للحصول على أبعاد الفيديوهات
      Promise.all(
        req.files.map(async (file) => {
          const fileType = file.mimetype.startsWith("image") ? "image" : "video";
          const optimizedUrls = getOptimizedMediaUrls(file.path, fileType);
          
          const fileData = {
            filePath: file.path,
            fileType: fileType,
            optimized: optimizedUrls
          };
          
          // إذا كان فيديو، نستخرج الأبعاد والصورة المصغرة
          if (fileType === "video") {
            try {
              const dimensions = await getVideoMetadataFromCloudinary(file.path);
              fileData.width = dimensions.width;
              fileData.height = dimensions.height;
              // إضافة الصورة المصغرة للفيديو
              fileData.thumbnail = optimizedUrls.thumbnail || optimizedUrls.thumbnailSmall;
            } catch (error) {
              console.error("Error getting video dimensions:", error);
              // إضافة الصورة المصغرة حتى في حالة الفشل
              fileData.thumbnail = optimizedUrls.thumbnail || optimizedUrls.thumbnailSmall;
            }
          }
          
          return fileData;
        })
      ).then(filesData => {
             
        // للتوافق مع الكود القديم
        const filePaths = req.files.map((file) => file.path);
        const fileTypes = req.files.map((file) =>
          file.mimetype.startsWith("image") ? "image" : "video"
        );
        res.json({
          message: "Files uploaded successfully",
          filePaths: filePaths,
          fileTypes: fileTypes,
          files: filesData
        });
      }).catch(error => {
        console.error("Error processing files:", error);
        res.status(500).json({ 
          message: "فشل في معالجة الملفات",
          error: error.message 
        });
      });
    } else {
      res.status(400).json({ message: "لم يتم تحديد ملفات" });
    }
  });
});

module.exports = router;

