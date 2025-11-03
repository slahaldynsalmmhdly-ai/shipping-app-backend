# مطالبة كتابية للذكاء الاصطناعي - تحديث ميزة حقل الدولة

## المطالبة الكاملة (Prompt)

يمكنك نسخ النص التالي وإعطائه لأي ذكاء اصطناعي (مثل ChatGPT, Claude, Gemini) لتطبيق التحديثات على مشروعك:

---

```
أريدك أن تقوم بتحديث خادم تطبيق Node.js/Express الخاص بي لجعل حقل "الدولة" (country) إلزامياً في عملية التسجيل وتسجيل الدخول. إليك التفاصيل:

## المطلوب:

1. **تحديث نموذج المستخدم (User Model)**:
   - الملف: `models/User.js`
   - اجعل حقل `country` إلزامياً بدلاً من اختياري
   - غير من `default: ""` إلى `required: true`

2. **تحديث مسار التسجيل (Register Route)**:
   - الملف: `routes/authRoutes.js`
   - أضف `country` في استقبال البيانات من `req.body`
   - أضف `country` في كائن `userData` عند إنشاء المستخدم
   - أضف `country` في الاستجابة المرسلة للعميل

3. **تحديث مسار تسجيل الدخول (Login Route)**:
   - الملف: `routes/authRoutes.js`
   - أضف `country` في الاستجابة المرسلة للعميل عند تسجيل الدخول الناجح

4. **تحديث مسار Firebase Login** (إذا كان موجوداً):
   - الملف: `routes/authRoutes.js`
   - أضف `country` في استقبال البيانات من `req.body`
   - أضف `country` عند إنشاء مستخدم جديد عبر Firebase

## البنية الحالية:

### نموذج المستخدم الحالي:
```javascript
country: {
  type: String,
  default: "",
},
```

### مسار التسجيل الحالي:
```javascript
const { name, email, password, userType, phone, companyName } = req.body;

const userData = {
  name,
  email,
  password,
  userType,
};
```

## الكود المطلوب:

### 1. نموذج المستخدم المحدث:
```javascript
country: {
  type: String,
  required: true,
},
```

### 2. مسار التسجيل المحدث:
```javascript
const { name, email, password, userType, phone, companyName, country } = req.body;

const userData = {
  name,
  email,
  password,
  userType,
  country,
};

// في الاستجابة:
user: {
  _id: user._id,
  name: user.name,
  email: user.email,
  userType: user.userType,
  phone: user.phone,
  companyName: user.companyName,
  country: user.country,
}
```

### 3. مسار تسجيل الدخول المحدث:
```javascript
user: {
  _id: user._id,
  name: user.name,
  email: user.email,
  userType: user.userType,
  avatar: user.avatar,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  country: user.country,
}
```

### 4. مسار Firebase Login المحدث:
```javascript
const { idToken, userType, country } = req.body;

user = await User.create({
  name,
  email,
  userType: userType || "individual",
  firebaseUid,
  country: country || "",
});
```

## ملاحظات:

1. الواجهة الأمامية ترسل بالفعل حقل `country` في طلبات التسجيل
2. تأكد من أن حقل الدولة موجود في جميع الاستجابات
3. لا تنسى التعامل مع الأخطاء إذا لم يتم إرسال حقل الدولة
4. قد تحتاج لتحديث المستخدمين القدامى الذين ليس لديهم حقل دولة

قم بتطبيق هذه التحديثات على الملفات المذكورة وأعطني الكود الكامل المحدث.
```

---

## مطالبة مختصرة (للاستخدام السريع)

إذا كنت تريد مطالبة أقصر، استخدم هذا:

```
حدّث خادم Node.js/Express الخاص بي:

1. في `models/User.js`: اجعل حقل `country` إلزامياً (required: true)
2. في `routes/authRoutes.js`:
   - أضف `country` في مسار `/register` (استقبال + حفظ + إرجاع)
   - أضف `country` في مسار `/login` (إرجاع فقط)
   - أضف `country` في مسار `/firebase-login` (استقبال + حفظ)

الواجهة الأمامية ترسل بالفعل حقل `country`، فقط اربطه مع الخادم.
```

---

## مطالبة للتحقق من التحديثات

بعد تطبيق التحديثات، استخدم هذه المطالبة للتحقق:

```
راجع الملفات التالية وتأكد من:

1. `models/User.js`: حقل `country` هو `required: true`
2. `routes/authRoutes.js`:
   - مسار `/register` يستقبل ويحفظ ويرجع `country`
   - مسار `/login` يرجع `country`
   - مسار `/firebase-login` يستقبل ويحفظ `country`

أعطني تقريراً بالتحديثات المطبقة والملفات المعدلة.
```

---

## مطالبة لإنشاء سكريبت تحديث للمستخدمين القدامى

إذا كنت تريد تحديث المستخدمين القدامى الذين ليس لديهم حقل دولة:

```
أنشئ سكريبت Node.js لتحديث جميع المستخدمين القدامى في قاعدة البيانات:

1. ابحث عن جميع المستخدمين الذين حقل `country` لديهم فارغ أو غير موجود
2. اطلب من المسؤول إدخال دولة افتراضية
3. حدّث جميع السجلات بالدولة الافتراضية
4. اطبع تقريراً بعدد السجلات المحدثة

استخدم Mongoose وتأكد من التعامل مع الأخطاء بشكل صحيح.
```

---

## مطالبة لإنشاء اختبارات API

لإنشاء اختبارات للتأكد من عمل الميزة:

```
أنشئ اختبارات API باستخدام Jest/Supertest للتحقق من:

1. **اختبار التسجيل بدون حقل الدولة**: يجب أن يفشل ويرجع خطأ
2. **اختبار التسجيل مع حقل الدولة**: يجب أن ينجح ويرجع بيانات المستخدم مع الدولة
3. **اختبار تسجيل الدخول**: يجب أن يرجع بيانات المستخدم بما في ذلك الدولة
4. **اختبار Firebase Login بدون دولة**: يجب أن يفشل أو يستخدم قيمة افتراضية
5. **اختبار Firebase Login مع دولة**: يجب أن ينجح ويحفظ الدولة

أعطني ملف اختبار كامل جاهز للتشغيل.
```

---

## مطالبة لتحديث الوثائق

لإنشاء وثائق API محدثة:

```
حدّث وثائق API (Swagger/OpenAPI) لتشمل حقل `country`:

1. في endpoint `/api/v1/auth/register`:
   - أضف `country` كحقل إلزامي في Request Body
   - أضف `country` في Response Schema

2. في endpoint `/api/v1/auth/login`:
   - أضف `country` في Response Schema

3. في endpoint `/api/v1/auth/firebase-login`:
   - أضف `country` كحقل اختياري في Request Body
   - أضف `country` في Response Schema

أعطني ملف Swagger YAML أو JSON محدث.
```

---

## نصائح للاستخدام

1. **انسخ المطالبة كاملة** وألصقها في أي أداة ذكاء اصطناعي
2. **أرفق ملفات الكود الحالية** إذا كانت الأداة تدعم ذلك
3. **راجع الكود المُنشأ** قبل تطبيقه على مشروعك
4. **اختبر التحديثات** في بيئة تطوير قبل النشر
5. **احتفظ بنسخة احتياطية** من الكود قبل التطبيق

---

## مثال على الاستخدام مع ChatGPT

```
المستخدم: [يلصق المطالبة الكاملة من الأعلى]

ChatGPT: سأقوم بتحديث الملفات المطلوبة...

[يعطي الكود المحدث]

المستخدم: رائع! الآن أنشئ لي سكريبت لتحديث المستخدمين القدامى

ChatGPT: [يعطي سكريبت التحديث]
```

---

## الخلاصة

هذه المطالبات جاهزة للاستخدام مع أي ذكاء اصطناعي لتطبيق التحديثات المطلوبة على مشروعك. اختر المطالبة المناسبة لاحتياجك:

- **المطالبة الكاملة**: للحصول على شرح تفصيلي وكود كامل
- **المطالبة المختصرة**: للحصول على تحديثات سريعة
- **مطالبات إضافية**: للسكريبتات والاختبارات والوثائق
