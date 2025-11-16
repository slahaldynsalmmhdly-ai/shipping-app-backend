const express = require('express');
const router = express.Router();
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * إرسال رمز OTP إلى البريد الإلكتروني
 * POST /api/v1/email-verification/send-otp
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صحيح' });
    }

    // توليد رمز OTP (6 أرقام)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // حفظ الرمز في قاعدة البيانات
    await OTP.findOneAndUpdate(
      { identifier: email },
      {
        identifier: email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 دقائق
      },
      { upsert: true, new: true }
    );

    // إرسال الرمز عبر البريد الإلكتروني
    await sendOTPEmail(email, code);

    console.log(`✅ تم إرسال OTP إلى ${email}: ${code}`);

    res.status(200).json({
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      email
    });
  } catch (error) {
    console.error('❌ خطأ في إرسال OTP:', error);
    res.status(500).json({ message: 'فشل إرسال رمز التحقق' });
  }
});

/**
 * التحقق من رمز OTP وإنشاء حساب
 * POST /api/v1/email-verification/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, userData } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'البريد الإلكتروني والرمز مطلوبان' });
    }

    // البحث عن الرمز
    const otpRecord = await OTP.findOne({ identifier: email, code });

    if (!otpRecord) {
      return res.status(400).json({ message: 'الرمز غير صحيح' });
    }

    // التحقق من انتهاء صلاحية الرمز
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'انتهت صلاحية الرمز' });
    }

    // التحقق من عدم وجود المستخدم مسبقاً
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    // إنشاء مستخدم جديد
    const newUser = new User({
      ...userData,
      email,
      emailVerified: true
    });

    await newUser.save();

    // حذف الرمز بعد الاستخدام
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log(`✅ تم التحقق من OTP وإنشاء حساب: ${email}`);

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('❌ خطأ في التحقق من OTP:', error);
    res.status(500).json({ message: 'فشل التحقق من الرمز' });
  }
});

/**
 * إرسال رمز إعادة تعيين كلمة السر
 * POST /api/v1/email-verification/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }

    // التحقق من وجود المستخدم
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'البريد الإلكتروني غير موجود' });
    }

    // توليد رمز OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // حفظ الرمز
    await OTP.findOneAndUpdate(
      { identifier: email },
      {
        identifier: email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      },
      { upsert: true, new: true }
    );

    // إرسال الرمز
    await sendPasswordResetEmail(email, code);

    console.log(`✅ تم إرسال رمز إعادة تعيين كلمة السر إلى ${email}`);

    res.status(200).json({
      message: 'تم إرسال رمز إعادة تعيين كلمة السر إلى بريدك الإلكتروني'
    });
  } catch (error) {
    console.error('❌ خطأ في إرسال رمز إعادة تعيين كلمة السر:', error);
    res.status(500).json({ message: 'فشل إرسال الرمز' });
  }
});

/**
 * إعادة تعيين كلمة السر
 * POST /api/v1/email-verification/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    // التحقق من الرمز
    const otpRecord = await OTP.findOne({ identifier: email, code });

    if (!otpRecord) {
      return res.status(400).json({ message: 'الرمز غير صحيح' });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'انتهت صلاحية الرمز' });
    }

    // تحديث كلمة السر
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    user.password = newPassword;
    await user.save();

    // حذف الرمز
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log(`✅ تم إعادة تعيين كلمة السر لـ ${email}`);

    res.status(200).json({ message: 'تم إعادة تعيين كلمة السر بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في إعادة تعيين كلمة السر:', error);
    res.status(500).json({ message: 'فشل إعادة تعيين كلمة السر' });
  }
});

/**
 * إعادة إرسال رمز OTP
 * POST /api/v1/email-verification/resend-otp
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }

    // توليد رمز جديد
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // تحديث الرمز
    await OTP.findOneAndUpdate(
      { identifier: email },
      {
        identifier: email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      },
      { upsert: true, new: true }
    );

    // إرسال الرمز
    await sendOTPEmail(email, code);

    console.log(`✅ تم إعادة إرسال OTP إلى ${email}`);

    res.status(200).json({ message: 'تم إعادة إرسال رمز التحقق' });
  } catch (error) {
    console.error('❌ خطأ في إعادة إرسال OTP:', error);
    res.status(500).json({ message: 'فشل إعادة إرسال الرمز' });
  }
});

module.exports = router;
