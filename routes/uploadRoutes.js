const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Store files in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post("/image", protect, upload.single("image"), (req, res) => {
  if (req.file) {
    // Return the URL of the uploaded image
    // In a production environment, this would be a public URL from a cloud storage service
    // For local development, we'll return a path that can be served statically
    res.json({
      message: "Image uploaded successfully",
      filePath: `/uploads/${req.file.filename}`,
    });
  } else {
    res.status(400).json({ message: "No image file provided" });
  }
});

// @desc    Upload multiple images (e.g., for fleet)
// @route   POST /api/upload/multiple-images
// @access  Private
router.post("/multiple-images", protect, upload.array("images", 10), (req, res) => {
  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map(file => `/uploads/${file.filename}`);
    res.json({
      message: "Images uploaded successfully",
      filePaths: filePaths,
    });
  } else {
    res.status(400).json({ message: "No image files provided" });
  }
});

module.exports = router;

