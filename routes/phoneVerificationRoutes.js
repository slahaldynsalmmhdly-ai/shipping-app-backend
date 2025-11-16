const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const OTP = require("../models/OTP");
const User = require("../models/User");
const { sendOTPViaTelegram, getBotLink } = require("../services/telegramBot");

// دالة لتوليد رمز عشوائي من 6 أرقام
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    إرسال رمز التحقق عبر تيليجرام (للتسجيل)
// @route   POST /api/v1/phone-verification/send-otp
// @access  Public
router.post(
  "/send-otp",
  asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
      res.status(400);
      throw new Error("رقم الهاتف مطلوب");
    }

    // توليد رمز التحقق
    const code = generateOTP();

    // حذف أي رموز قديمة لنفس رقم الهاتف
    await OTP.deleteMany({ phone });

    // إنشاء رمز جديد (صالح لمدة 10 دقائق)
    const otp = await OTP.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 دقائق
    });

    // الحصول على رابط البوت
    const botLink = getBotLink();

    res.status(200).json({
      success: true,
      message: "تم إنشاء رمز التحقق بنجاح",
      botLink,
      otpId: otp._id,
    });
  })
);

// @desc    التحقق من الرمز وإكمال التسجيل
// @route   POST /api/v1/phone-verification/verify-otp
// @access  Public
router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const { phone, code, userData } = req.body;

    if (!phone || !code) {
      res.status(400);
      throw new Error("رقم الهاتف والرمز مطلوبان");
    }

    // البحث عن الرمز
    const otp = await OTP.findOne({
      phone,
      code,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      res.status(400);
      throw new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
    }

    // التحقق من أن المستخدم غير موجود مسبقًا
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      res.status(400);
      throw new Error("رقم الهاتف مسجل مسبقًا");
    }

    // تحديث حالة الرمز
    otp.verified = true;
    await otp.save();

    // إنشاء المستخدم الجديد
    const user = await User.create({
      name: userData.name,
      email: userData.email || `${phone}@temp.com`, // بريد مؤقت إذا لم يتم توفيره
      phone,
      phoneVerified: true,
      userType: userData.userType || "individual",
      country: userData.country || "",
      city: userData.city || "",
      telegramChatId: otp.telegramChatId,
      password: userData.password || Math.random().toString(36).slice(-8), // كلمة سر عشوائية إذا لم يتم توفيرها
    });

    // إنشاء توكن
    const generateToken = require("../utils/generateToken");
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "تم التحقق بنجاح وإنشاء الحساب",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        userType: user.userType,
        country: user.country,
        city: user.city,
      },
      token,
    });
  })
);

// @desc    إرسال رمز لإعادة تعيين كلمة السر
// @route   POST /api/v1/phone-verification/forgot-password
// @access  Public
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
      res.status(400);
      throw new Error("رقم الهاتف مطلوب");
    }

    // التحقق من وجود المستخدم
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(404);
      throw new Error("لا يوجد حساب مرتبط بهذا الرقم");
    }

    // توليد رمز التحقق
    const code = generateOTP();

    // حذف أي رموز قديمة لنفس رقم الهاتف
    await OTP.deleteMany({ phone });

    // إنشاء رمز جديد (صالح لمدة 10 دقائق)
    const otp = await OTP.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 دقائق
    });

    // الحصول على رابط البوت
    const botLink = getBotLink();

    res.status(200).json({
      success: true,
      message: "تم إرسال رمز إعادة تعيين كلمة السر",
      botLink,
      otpId: otp._id,
    });
  })
);

// @desc    التحقق من الرمز وإعادة تعيين كلمة السر
// @route   POST /api/v1/phone-verification/reset-password
// @access  Public
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      res.status(400);
      throw new Error("رقم الهاتف والرمز وكلمة السر الجديدة مطلوبة");
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error("يجب أن تتكون كلمة السر من 6 أحرف على الأقل");
    }

    // البحث عن الرمز
    const otp = await OTP.findOne({
      phone,
      code,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      res.status(400);
      throw new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
    }

    // البحث عن المستخدم
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(404);
      throw new Error("المستخدم غير موجود");
    }

    // تحديث حالة الرمز
    otp.verified = true;
    await otp.save();

    // تحديث كلمة السر
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "تم إعادة تعيين كلمة السر بنجاح",
    });
  })
);

// @desc    الحصول على حالة الرمز (هل تم إرساله عبر تيليجرام؟)
// @route   GET /api/v1/phone-verification/otp-status/:otpId
// @access  Public
router.get(
  "/otp-status/:otpId",
  asyncHandler(async (req, res) => {
    const otp = await OTP.findById(req.params.otpId);

    if (!otp) {
      res.status(404);
      throw new Error("الرمز غير موجود");
    }

    res.status(200).json({
      success: true,
      sent: otp.telegramChatId !== null,
      expired: otp.expiresAt < new Date(),
      verified: otp.verified,
    });
  })
);

// @desc    إعادة إرسال الرمز
// @route   POST /api/v1/phone-verification/resend-otp
// @access  Public
router.post(
  "/resend-otp",
  asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
      res.status(400);
      throw new Error("رقم الهاتف مطلوب");
    }

    // توليد رمز جديد
    const code = generateOTP();

    // حذف الرموز القديمة
    await OTP.deleteMany({ phone });

    // إنشاء رمز جديد
    const otp = await OTP.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const botLink = getBotLink();

    res.status(200).json({
      success: true,
      message: "تم إعادة إرسال رمز التحقق",
      botLink,
      otpId: otp._id,
    });
  })
);

module.exports = router;
