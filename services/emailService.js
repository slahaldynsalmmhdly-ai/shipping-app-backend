const nodemailer = require('nodemailer');

// إنشاء transporter باستخدام Gmail مع إعدادات محسّنة
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

/**
 * إرسال رمز OTP عبر البريد الإلكتروني
 */
async function sendOTPEmail(email, code) {
  try {
    const mailOptions = {
      from: `"برنامج الوظائف" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'رمز التحقق - برنامج الوظائف',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">💼 برنامج الوظائف</h2>
            <p style="font-size: 16px; color: #666; text-align: center;">رمز التحقق الخاص بك:</p>
            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 5px;">${code}</h1>
            </div>
            <p style="font-size: 14px; color: #999; text-align: center;">⚠️ لا تشارك هذا الرمز مع أي أحد</p>
            <p style="font-size: 14px; color: #999; text-align: center;">⏰ صالح لمدة 10 دقائق</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ تم إرسال البريد الإلكتروني:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ خطأ في إرسال البريد الإلكتروني:', error);
    throw error;
  }
}

/**
 * إرسال رمز إعادة تعيين كلمة السر
 */
async function sendPasswordResetEmail(email, code) {
  try {
    const mailOptions = {
      from: `"برنامج الوظائف" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'إعادة تعيين كلمة السر - برنامج الوظائف',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">🔐 إعادة تعيين كلمة السر</h2>
            <p style="font-size: 16px; color: #666; text-align: center;">رمز إعادة تعيين كلمة السر:</p>
            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <h1 style="color: #dc3545; font-size: 36px; margin: 0; letter-spacing: 5px;">${code}</h1>
            </div>
            <p style="font-size: 14px; color: #999; text-align: center;">⚠️ لا تشارك هذا الرمز مع أي أحد</p>
            <p style="font-size: 14px; color: #999; text-align: center;">⏰ صالح لمدة 10 دقائق</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ تم إرسال بريد إعادة تعيين كلمة السر:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ خطأ في إرسال البريد الإلكتروني:', error);
    throw error;
  }
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail
};
