const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Vehicle = require("../models/Vehicle");

// @desc    Fleet login (تسجيل دخول الأسطول)
// @route   POST /api/fleet/login
// @access  Public
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { fleetId, password } = req.body;

    if (!fleetId || !password) {
      res.status(400);
      throw new Error("يرجى إدخال رقم الأسطول وكلمة السر");
    }

    // البحث عن الأسطول (مع إرجاع كلمة السر)
    const vehicle = await Vehicle.findOne({ fleetAccountId: fleetId })
      .select('+fleetPassword')
      .populate('user', 'name email companyName avatar');

    if (!vehicle) {
      res.status(401);
      throw new Error("رقم الأسطول أو كلمة السر غير صحيحة");
    }

    // التحقق من وجود كلمة سر (للأساطيل القديمة التي لم يتم إنشاء حساب لها)
    if (!vehicle.fleetPassword) {
      res.status(403);
      throw new Error("هذا الأسطول لا يملك حساباً. يرجى التواصل مع الشركة لإنشاء حساب");
    }

    // التحقق من أن الحساب نشط
    if (!vehicle.isAccountActive) {
      res.status(403);
      throw new Error("هذا الحساب معطل. يرجى التواصل مع الشركة");
    }

    // التحقق من كلمة السر
    const isPasswordMatch = await bcrypt.compare(password, vehicle.fleetPassword);

    if (!isPasswordMatch) {
      res.status(401);
      throw new Error("رقم الأسطول أو كلمة السر غير صحيحة");
    }

    // تحديث آخر تسجيل دخول
    vehicle.lastLogin = new Date();
    await vehicle.save();

    // إنشاء JWT Token
    const token = jwt.sign(
      { 
        id: vehicle._id, 
        type: 'fleet',
        fleetId: vehicle.fleetAccountId,
        companyId: vehicle.user._id
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token,
      fleet: {
        id: vehicle._id,
        fleetId: vehicle.fleetAccountId,
        driverName: vehicle.driverName,
        vehicleName: vehicle.vehicleName,
        licensePlate: vehicle.licensePlate,
        imageUrl: vehicle.imageUrl,
        company: {
          id: vehicle.user._id,
          name: vehicle.user.companyName || vehicle.user.name,
          avatar: vehicle.user.avatar,
        }
      }
    });
  })
);

// @desc    Get fleet profile (معلومات الأسطول)
// @route   GET /api/fleet/me
// @access  Private (Fleet only)
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    // هنا يمكن إضافة middleware للتحقق من token الأسطول
    // لكن حالياً سنتركها بسيطة
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401);
      throw new Error("غير مصرح، لا يوجد token");
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'fleet') {
        res.status(403);
        throw new Error("غير مصرح، هذا ليس حساب أسطول");
      }

      const vehicle = await Vehicle.findById(decoded.id)
        .populate('user', 'name email companyName avatar');

      if (!vehicle) {
        res.status(404);
        throw new Error("الأسطول غير موجود");
      }

      res.json({
        success: true,
        fleet: {
          id: vehicle._id,
          fleetId: vehicle.fleetAccountId,
          driverName: vehicle.driverName,
          vehicleName: vehicle.vehicleName,
          licensePlate: vehicle.licensePlate,
          imageUrl: vehicle.imageUrl,
          vehicleType: vehicle.vehicleType,
          currentLocation: vehicle.currentLocation,
          status: vehicle.status,
          company: {
            id: vehicle.user._id,
            name: vehicle.user.companyName || vehicle.user.name,
            avatar: vehicle.user.avatar,
          },
          lastLogin: vehicle.lastLogin,
          accountCreatedAt: vehicle.accountCreatedAt,
        }
      });
    } catch (error) {
      res.status(401);
      throw new Error("غير مصرح، token غير صالح");
    }
  })
);

module.exports = router;
