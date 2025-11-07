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

    // إنشاء أو جلب حساب User للسائق
    const User = require("../models/User");
    let driverUser = null;
    
    if (vehicle.driverUser) {
      // السائق لديه حساب مسبقاً
      driverUser = await User.findById(vehicle.driverUser);
    }
    
    if (!driverUser) {
      // إنشاء حساب User جديد للسائق
      const driverEmail = `${vehicle.fleetAccountId}@driver.local`;
      driverUser = await User.create({
        email: driverEmail,
        password: vehicle.fleetPassword, // نفس كلمة السر (مشفرة مسبقاً)
        name: vehicle.driverName,
        userType: "driver",
        avatar: vehicle.imageUrls?.[0] || "",
      });
      
      // ربط User بـ Vehicle
      vehicle.driverUser = driverUser._id;
    }
    
    // تحديث آخر تسجيل دخول وحالة الاتصال
    vehicle.lastLogin = new Date();
    vehicle.isOnline = true; // تعيين حالة الاتصال إلى متصل
    await vehicle.save();

    // إنشاء JWT Token
    const token = jwt.sign(
      { 
        id: driverUser._id, // استخدام User._id بدلاً من vehicle._id
        type: 'fleet',
        fleetId: vehicle.fleetAccountId,
        companyId: vehicle.user._id,
        vehicleId: vehicle._id
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Log for debugging
    console.log('Fleet login successful:', {
      vehicleId: vehicle._id,
      fleetId: vehicle.fleetAccountId,
      hasUser: !!vehicle.user,
      userId: vehicle.user?._id,
      userName: vehicle.user?.name || vehicle.user?.companyName
    });

    // Check if user exists
    if (!vehicle.user || !vehicle.user._id) {
      res.status(500);
      throw new Error("خطأ في البيانات: لم يتم العثور على معلومات الشركة المرتبطة بهذا الأسطول");
    }

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
          _id: vehicle.user._id,
          id: vehicle.user._id,
          name: vehicle.user.companyName || vehicle.user.name,
          avatar: vehicle.user.avatar,
        }
      }
    });
  })
);

// @desc    Fleet logout (تسجيل خروج الأسطول)
// @route   POST /api/fleet/logout
// @access  Private (Fleet only)
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    // يجب أن يتم التحقق من الـ token هنا
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

      const vehicle = await Vehicle.findById(decoded.id);

      if (vehicle) {
        vehicle.isOnline = false; // تعيين حالة الاتصال إلى غير متصل
        await vehicle.save();
      }

      res.json({
        success: true,
        message: "تم تسجيل الخروج بنجاح"
      });
    } catch (error) {
      res.status(401);
      throw new Error("غير مصرح، token غير صالح");
    }
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
            _id: vehicle.user._id,
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

// @desc    Change fleet password (تغيير كلمة سر السائق)
// @route   POST /api/fleet/change-password
// @access  Private (Fleet only)
router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const { fleetId, newPassword } = req.body;

    if (!fleetId || !newPassword) {
      res.status(400);
      throw new Error("يرجى إدخال رقم الأسطول وكلمة السر الجديدة");
    }

    // التحقق من طول كلمة السر
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error("كلمة السر يجب أن تكون 6 أحرف على الأقل");
    }

    // البحث عن الأسطول
    const vehicle = await Vehicle.findOne({ fleetAccountId: fleetId })
      .select('+fleetPassword')
      .populate('user', 'name companyName');

    if (!vehicle) {
      res.status(404);
      throw new Error("رقم الأسطول غير موجود");
    }

    // تشفير كلمة السر الجديدة
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // تحديث كلمة السر في Vehicle
    vehicle.fleetPassword = hashedPassword;
    
    // تحديث كلمة السر في User (إذا كان موجوداً)
    if (vehicle.driverUser) {
      const User = require("../models/User");
      const driverUser = await User.findById(vehicle.driverUser);
      if (driverUser) {
        driverUser.password = hashedPassword;
        await driverUser.save();
      }
    }

    await vehicle.save();

    // إنشاء token جديد
    const User = require("../models/User");
    let driverUser = await User.findById(vehicle.driverUser);
    
    if (!driverUser) {
      res.status(500);
      throw new Error("خطأ في النظام: لم يتم العثور على حساب المستخدم");
    }

    const token = jwt.sign(
      { 
        id: driverUser._id,
        type: 'fleet',
        fleetId: vehicle.fleetAccountId,
        companyId: vehicle.user._id,
        vehicleId: vehicle._id
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "تم تغيير كلمة السر بنجاح",
      token,
      fleet: {
        id: vehicle._id,
        fleetId: vehicle.fleetAccountId,
        driverName: vehicle.driverName,
        vehicleName: vehicle.vehicleName,
      }
    });
  })
);

// @desc    Verify fleet password (التحقق من كلمة سر السائق)
// @route   POST /api/fleet/verify-password
// @access  Public
router.post(
  "/verify-password",
  asyncHandler(async (req, res) => {
    const { fleetId, password } = req.body;

    if (!fleetId || !password) {
      res.status(400);
      throw new Error("يرجى إدخال رقم الأسطول وكلمة السر");
    }

    // البحث عن الأسطول
    const vehicle = await Vehicle.findOne({ fleetAccountId: fleetId })
      .select('+fleetPassword')
      .populate('user', 'name companyName avatar');

    if (!vehicle) {
      res.status(401);
      throw new Error("رقم الأسطول أو كلمة السر غير صحيحة");
    }

    if (!vehicle.fleetPassword) {
      res.status(403);
      throw new Error("هذا الأسطول لا يملك حساباً");
    }

    // التحقق من كلمة السر
    const isPasswordMatch = await bcrypt.compare(password, vehicle.fleetPassword);

    if (!isPasswordMatch) {
      res.status(401);
      throw new Error("كلمة السر غير صحيحة");
    }

    // إنشاء token جديد
    const User = require("../models/User");
    let driverUser = await User.findById(vehicle.driverUser);
    
    if (!driverUser) {
      res.status(500);
      throw new Error("خطأ في النظام");
    }

    const token = jwt.sign(
      { 
        id: driverUser._id,
        type: 'fleet',
        fleetId: vehicle.fleetAccountId,
        companyId: vehicle.user._id,
        vehicleId: vehicle._id
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "تم التحقق بنجاح",
      token,
      fleet: {
        id: vehicle._id,
        fleetId: vehicle.fleetAccountId,
        driverName: vehicle.driverName,
        vehicleName: vehicle.vehicleName,
        company: {
          _id: vehicle.user._id,
          name: vehicle.user.companyName || vehicle.user.name,
          avatar: vehicle.user.avatar,
        }
      }
    });
  })
);
