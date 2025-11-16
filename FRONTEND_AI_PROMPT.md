# مطالبة تحديث الفرونت إند - نظام التحقق عبر البريد الإلكتروني

## المطلوب بالضبط:

### 1. احذف كل شيء متعلق برقم الهاتف
- امسح جميع حقول إدخال رقم الهاتف
- امسح أي إشارات لـ Telegram
- امسح أي كود متعلق بالتحقق عبر الهاتف

### 2. استبدل برقم الهاتف → البريد الإلكتروني
- أضف حقل إدخال البريد الإلكتروني في صفحة التسجيل
- عند الضغط على "التالي" → أرسل OTP تلقائياً للبريد

### 3. صفحة إدخال رمز OTP
- أنشئ صفحة جديدة لإدخال 6 أرقام
- أضف زر "إعادة إرسال الرمز" مع countdown 60 ثانية
- أضف loading spinner أثناء التحقق

### 4. بعد التحقق الناجح
- انتقل لصفحة اختيار نوع الحساب: individual, company, recruitment_office

## API Endpoints:

**إرسال OTP:**
```
POST /api/v1/email-verification/send-otp
Body: { "email": "user@example.com" }
```

**التحقق من OTP:**
```
POST /api/v1/email-verification/verify-otp
Body: {
  "email": "user@example.com",
  "code": "123456",
  "userData": {
    "name": "...",
    "birthdate": "...",
    "gender": "...",
    "country": "...",
    "city": "...",
    "password": "...",
    "accountType": "individual"
  }
}
```

**إعادة إرسال OTP:**
```
POST /api/v1/email-verification/resend-otp
Body: { "email": "user@example.com" }
```

**نسيت كلمة السر:**
```
POST /api/v1/email-verification/forgot-password
Body: { "email": "user@example.com" }
```

**إعادة تعيين كلمة السر:**
```
POST /api/v1/email-verification/reset-password
Body: {
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "..."
}
```

## ملاحظات:
- الرمز صالح 10 دقائق
- أنواع الحسابات: individual, company, recruitment_office
- اعرض رسائل الخطأ بوضوح
