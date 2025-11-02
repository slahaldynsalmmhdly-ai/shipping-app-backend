const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// @desc    Admin login with simple password
// @route   POST /api/admin/login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;

    // التحقق من كلمة السر
    if (password === "12345") {
      // إنشاء token إداري خاص
      const token = jwt.sign(
        { 
          id: "admin", 
          role: "admin",
          isAdmin: true 
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        token,
        message: "Admin authenticated successfully"
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

module.exports = router;
