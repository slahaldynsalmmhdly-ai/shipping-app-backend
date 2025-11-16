# تحديث: ميزة التحقق من رقم الهاتف عبر تيليجرام

## الملفات الجديدة المضافة

1. `models/OTP.js` - نموذج قاعدة البيانات لرموز التحقق
2. `services/telegramBot.js` - خدمة إدارة بوت تيليجرام
3. `routes/phoneVerificationRoutes.js` - مسارات API للتحقق من الهاتف

## الملفات المعدلة

1. `models/User.js` - إضافة حقول phoneVerified و telegramChatId و userType جديد
2. `server.js` - إضافة مسارات التحقق وتهيئة البوت
3. `.env.example` - إضافة متغيرات بيئة البوت

## خطوات التشغيل

1. تثبيت المكتبات:
   ```bash
   npm install
   ```

2. تحديث ملف .env:
   ```env
   TELEGRAM_BOT_TOKEN=8019318702:AAHf5S8MJCSWj2-rVtUl8B3IFXoaXAd61Ww
   TELEGRAM_BOT_USERNAME=salah_ai_bot
   ```

3. تشغيل الخادم:
   ```bash
   npm start
   ```

## APIs الجديدة

- POST `/api/v1/phone-verification/send-otp`
- POST `/api/v1/phone-verification/verify-otp`
- POST `/api/v1/phone-verification/forgot-password`
- POST `/api/v1/phone-verification/reset-password`
- GET `/api/v1/phone-verification/otp-status/:otpId`
- POST `/api/v1/phone-verification/resend-otp`

راجع ملف `TELEGRAM_VERIFICATION_GUIDE.md` للحصول على التوثيق الكامل.
