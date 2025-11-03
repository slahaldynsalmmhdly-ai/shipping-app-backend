# توثيق تحديث ميزة حقل الدولة في تطبيق الشحن

## نظرة عامة

تم تحديث خادم تطبيق الشحن لجعل حقل **اسم الدولة (Country)** إلزامياً في عملية التسجيل وتسجيل الدخول. هذا التحديث يضمن أن جميع المستخدمين الجدد يجب عليهم إدخال اسم الدولة عند إنشاء حساب جديد.

---

## التحديثات المنفذة على الخادم (Backend)

### 1. تحديث نموذج المستخدم (User Model)

**الملف:** `/models/User.js`

**التغيير:**
- تم تحويل حقل `country` من حقل اختياري إلى حقل **إلزامي (required: true)**

**الكود المحدث:**
```javascript
country: {
  type: String,
  required: true,  // تم التحديث من default: "" إلى required: true
},
```

**التأثير:**
- لن يتم قبول أي تسجيل جديد بدون إدخال اسم الدولة
- سيتم رفض الطلبات التي لا تحتوي على حقل الدولة من قاعدة البيانات

---

### 2. تحديث مسار التسجيل (Register Route)

**الملف:** `/routes/authRoutes.js`

**التغييرات:**

#### أ. إضافة حقل الدولة في استقبال البيانات
```javascript
const { name, email, password, userType, phone, companyName, country } = req.body;
```

#### ب. إضافة حقل الدولة في بيانات المستخدم
```javascript
const userData = {
  name,
  email,
  password,
  userType,
  country,  // تم إضافة حقل الدولة هنا
};
```

#### ج. إرجاع حقل الدولة في الاستجابة
```javascript
user: {
  _id: user._id,
  name: user.name,
  email: user.email,
  userType: user.userType,
  phone: user.phone,
  companyName: user.companyName,
  country: user.country,  // تم إضافة حقل الدولة في الاستجابة
},
```

---

### 3. تحديث مسار تسجيل الدخول (Login Route)

**الملف:** `/routes/authRoutes.js`

**التغيير:**
- تم إضافة حقل `country` في استجابة تسجيل الدخول

```javascript
user: {
  _id: user._id,
  name: user.name,
  email: user.email,
  userType: user.userType,
  avatar: user.avatar,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  country: user.country,  // تم إضافة حقل الدولة
},
```

---

### 4. تحديث مسار Firebase Login

**الملف:** `/routes/authRoutes.js`

**التغييرات:**

#### أ. استقبال حقل الدولة من الواجهة الأمامية
```javascript
const { idToken, userType, country } = req.body;
```

#### ب. حفظ حقل الدولة عند إنشاء مستخدم جديد
```javascript
user = await User.create({
  name,
  email,
  userType: userType || "individual",
  firebaseUid,
  country: country || "",  // تم إضافة حقل الدولة
});
```

---

## حالة الواجهة الأمامية (Frontend)

### الوضع الحالي

الواجهة الأمامية **تحتوي بالفعل** على حقل الدولة في نماذج التسجيل:

#### 1. نموذج التسجيل للأفراد
**الملف:** `/components/signup/SignUpIndividualScreen.tsx`

- يحتوي على حقل اختيار الدولة (Country Selector)
- يرسل حقل `country` ضمن بيانات التسجيل
- يستخدم بيانات الدول من `/data/countries`

**الكود الموجود:**
```typescript
body: JSON.stringify({
  name: `${firstName} ${lastName}`,
  email,
  phone,
  password,
  userType: 'individual',
  avatar: profileImage,
  dateOfBirth: dob,
  country,  // حقل الدولة موجود بالفعل
}),
```

#### 2. نموذج التسجيل للشركات
**الملف:** `/components/signup/SignUpCompanyScreen.tsx`

- يحتوي على حقل اختيار الدولة (Country Selector)
- يرسل حقل `country` ضمن بيانات التسجيل

**الكود الموجود:**
```typescript
body: JSON.stringify({
  name: companyName,
  email,
  phone,
  password,
  country,  // حقل الدولة موجود بالفعل
  userType: 'company',
}),
```

---

## التحقق من صحة البيانات

### في الواجهة الأمامية
كلا النموذجين يتحققان من أن حقل الدولة غير فارغ قبل تفعيل زر الإنشاء:

```typescript
const isValid = 
  // ... حقول أخرى
  country.trim() !== '' &&
  // ... حقول أخرى
```

### في الخادم
نموذج المستخدم في MongoDB يتحقق تلقائياً من وجود حقل الدولة لأنه الآن `required: true`

---

## خطوات النشر

### 1. رفع التحديثات إلى GitHub

```bash
cd /home/ubuntu/shipping-app-backend
git add models/User.js routes/authRoutes.js
git commit -m "feat: Make country field required in user registration and login"
git push origin main
```

### 2. إعادة تشغيل الخادم

بعد رفع التحديثات، يجب إعادة تشغيل الخادم لتطبيق التغييرات:

```bash
npm install  # إذا كانت هناك تبعيات جديدة
npm start    # أو pm2 restart app-name
```

---

## الاختبار

### اختبار التسجيل بدون حقل الدولة

**الطلب:**
```bash
curl -X POST http://your-server-url/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "userType": "individual"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "error": "User validation failed: country: Path `country` is required."
}
```

### اختبار التسجيل مع حقل الدولة

**الطلب:**
```bash
curl -X POST http://your-server-url/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "userType": "individual",
    "country": "Saudi Arabia"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "_id": "...",
  "name": "Test User",
  "email": "test@example.com",
  "userType": "individual",
  "token": "...",
  "user": {
    "_id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "userType": "individual",
    "country": "Saudi Arabia"
  }
}
```

---

## ملاحظات مهمة

1. **المستخدمون الحاليون:** المستخدمون الذين تم تسجيلهم قبل هذا التحديث قد لا يملكون حقل الدولة. قد تحتاج إلى:
   - تشغيل سكريبت لتحديث السجلات القديمة
   - أو إضافة منطق للتعامل مع السجلات القديمة

2. **Firebase Authentication:** تم تحديث مسار Firebase Login لدعم حقل الدولة، لكنه اختياري حالياً (`country: country || ""`). قد تحتاج لجعله إلزامياً أيضاً.

3. **التوافق مع الإصدارات السابقة:** إذا كان لديك تطبيقات موبايل قديمة، تأكد من تحديثها لإرسال حقل الدولة.

---

## الملفات المعدلة

1. `/models/User.js` - تحديث نموذج المستخدم
2. `/routes/authRoutes.js` - تحديث مسارات المصادقة

---

## الخلاصة

✅ تم جعل حقل الدولة إلزامياً في نموذج المستخدم  
✅ تم تحديث مسار التسجيل لمعالجة حقل الدولة  
✅ تم تحديث مسار تسجيل الدخول لإرجاع حقل الدولة  
✅ تم تحديث مسار Firebase Login لدعم حقل الدولة  
✅ الواجهة الأمامية تحتوي بالفعل على حقل الدولة وترسله بشكل صحيح  

**النتيجة النهائية:** لن يتم قبول أي تسجيل جديد بدون إدخال اسم الدولة.
