const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { protect } = require("../middleware/authMiddleware");

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
    if (file.mimetype.startsWith("image")) {
      folder = "shipping-app/images";
    } else if (file.mimetype.startsWith("video")) {
      folder = "shipping-app/videos";
    } else {
      folder = "shipping-app/others";
    }
    return {
      folder: folder,
      format: file.mimetype.split("/")[1], // Use original file format
      public_id: `${folder.split("/").pop()}-${Date.now()}`,
    };
  },
});

// Filter for image and video files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image") || file.mimetype.startsWith("video")) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// @desc    Upload single image/video
// @route   POST /api/upload/single
// @access  Private
router.post("/single", protect, upload.single("file"), (req, res) => {
  if (req.file) {
    res.json({
      message: "File uploaded successfully",
      filePath: req.file.path, // Cloudinary URL
      fileType: req.file.mimetype.startsWith("image") ? "image" : "video",
    });
  } else {
    res.status(400).json({ message: "No file provided" });
  }
});

// @desc    Upload multiple images/videos
// @route   POST /api/upload/multiple
// @access  Private
router.post("/multiple", protect, upload.array("files", 10), (req, res) => {
  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map((file) => file.path); // Cloudinary URLs
    const fileTypes = req.files.map((file) =>
      file.mimetype.startsWith("image") ? "image" : "video"
    );
    res.json({
      message: "Files uploaded successfully",
      filePaths: filePaths,
      fileTypes: fileTypes,
    });
  } else {
    res.status(400).json({ message: "No files provided" });
  }
});

module.exports = router;
