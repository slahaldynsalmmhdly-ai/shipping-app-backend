const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const passport = require("passport");
const admin = require("../config/firebase"); // استيراد Firebase Admin SDK

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, userType, phone, companyName } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    // Create user with all provided fields
    const userData = {
      name,
      email,
      password,
      userType,
    };

    // Add optional fields if provided
    if (phone) userData.phone = phone;
    if (companyName) userData.companyName = companyName;

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          phone: user.phone,
          companyName: user.companyName,
        },
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  })
);

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  })
);

// @desc    Authenticate with Firebase ID token (for both email/password and Google)
// @route   POST /api/auth/firebase-login
// @access  Public
router.post(
  "/firebase-login",
  asyncHandler(async (req, res) => {
    const { idToken, userType } = req.body; // userType يمكن أن يأتي من الواجهة الأمامية لتحديد نوع المستخدم عند التسجيل لأول مرة

    if (!idToken) {
      res.status(400);
      throw new Error("Firebase ID token is required");
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;
      const name = decodedToken.name || email; // استخدم الاسم من Firebase أو البريد الإلكتروني كاسم افتراضي

      let user = await User.findOne({ email });

      if (!user) {
        // إذا لم يكن المستخدم موجودًا، قم بإنشاء حساب جديد
        user = await User.create({
          name,
          email,
          // لا نقوم بتخزين كلمة مرور هنا لأن المصادقة تتم عبر Firebase
          userType: userType || "individual", // تعيين نوع المستخدم الافتراضي أو استخدام ما تم توفيره
          firebaseUid, // تخزين Firebase UID لربط المستخدمين
        });
      } else if (!user.firebaseUid) {
        // إذا كان المستخدم موجودًا ولكن ليس لديه firebaseUid، قم بتحديثه
        user.firebaseUid = firebaseUid;
        await user.save();
      }

      // إنشاء رمز JWT الخاص بنا وإرساله إلى العميل
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        token: generateToken(user._id),
      });
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, Firebase token failed: " + error.message);
    }
  })
);

// @desc    Auth with Google (existing Google OAuth flow)
// @route   GET /api/auth/google
// @access  Public
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// @desc    Google auth callback (existing Google OAuth flow)
// @route   GET /api/auth/google/callback
// @access  Public
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      userType: req.user.userType,
      token: generateToken(req.user._id),
    });
  }
);

module.exports = router;

