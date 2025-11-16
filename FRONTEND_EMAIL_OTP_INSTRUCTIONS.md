# تعليمات تحديث الفرونت إند - نظام التحقق عبر البريد الإلكتروني

## التغييرات المطلوبة

### 1. إزالة حقول رقم الهاتف
- احذف جميع input fields الخاصة بـ phone number
- احذف أي إشارات لـ Telegram bot

### 2. إضافة حقل البريد الإلكتروني
- أضف input field للبريد الإلكتروني في صفحة التسجيل
- التحقق من صحة البريد الإلكتروني قبل الإرسال

### 3. صفحة إدخال رمز OTP
- أنشئ صفحة جديدة لإدخال الرمز المكون من 6 أرقام
- أضف loading spinner أثناء التحقق
- أضف زر "إعادة إرسال الرمز"

### 4. API Endpoints الجديدة

#### إرسال OTP
```javascript
POST /api/v1/email-verification/send-otp
Body: {
  "email": "user@example.com"
}
Response: {
  "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
  "email": "user@example.com"
}
```

#### التحقق من OTP وإنشاء الحساب
```javascript
POST /api/v1/email-verification/verify-otp
Body: {
  "email": "user@example.com",
  "code": "123456",
  "userData": {
    "name": "اسم المستخدم",
    "birthdate": "1990-01-01",
    "gender": "male",
    "country": "السعودية",
    "city": "الرياض",
    "password": "password123",
    "accountType": "individual"
  }
}
Response: {
  "message": "تم إنشاء الحساب بنجاح",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "اسم المستخدم"
  }
}
```

#### إعادة إرسال OTP
```javascript
POST /api/v1/email-verification/resend-otp
Body: {
  "email": "user@example.com"
}
Response: {
  "message": "تم إعادة إرسال رمز التحقق"
}
```

#### نسيت كلمة السر
```javascript
POST /api/v1/email-verification/forgot-password
Body: {
  "email": "user@example.com"
}
Response: {
  "message": "تم إرسال رمز إعادة تعيين كلمة السر إلى بريدك الإلكتروني"
}
```

#### إعادة تعيين كلمة السر
```javascript
POST /api/v1/email-verification/reset-password
Body: {
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
Response: {
  "message": "تم إعادة تعيين كلمة السر بنجاح"
}
```

## سير العمل الجديد

### التسجيل:
1. المستخدم يدخل: الاسم، تاريخ الميلاد، الجنس، الدولة، المدينة
2. المستخدم يدخل البريد الإلكتروني
3. النظام يرسل OTP تلقائياً (مثل WhatsApp/Facebook)
4. المستخدم يدخل الرمز المكون من 6 أرقام
5. بعد التحقق → الانتقال لصفحة اختيار نوع الحساب (individual, company, recruitment_office)

### نسيت كلمة السر:
1. المستخدم يدخل البريد الإلكتروني
2. النظام يرسل OTP
3. المستخدم يدخل الرمز
4. المستخدم يدخل كلمة السر الجديدة

## ملاحظات مهمة
- الرمز صالح لمدة 10 دقائق فقط
- يجب عرض loading spinner أثناء إرسال/التحقق من الرمز
- يجب عرض رسائل الخطأ بوضوح
- أضف خيار "إعادة إرسال الرمز" مع countdown timer (60 ثانية)
- أنواع الحسابات: individual, company, recruitment_office
