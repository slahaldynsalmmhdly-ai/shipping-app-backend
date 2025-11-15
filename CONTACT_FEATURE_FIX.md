# إصلاح ميزة التواصل في المنشورات

## المشكلة
كانت الواجهة الأمامية ترسل بيانات التواصل (contactPhone, contactEmail, contactMethods) عند إنشاء منشور جديد، لكن الواجهة الخلفية لم تكن تحفظ هذه البيانات في قاعدة البيانات، مما أدى إلى عدم ظهور زر "اتصال" في المنشورات.

## الحل المطبق

### 1. تعديل نموذج Post (models/Post.js)
تم إضافة الحقول التالية لدعم بيانات التواصل:

```javascript
// Contact fields for frontend compatibility
contactPhone: {
  type: String,
  default: '',
},
contactEmail: {
  type: String,
  default: '',
},
contactMethods: [{
  type: String,
  enum: ['واتساب', 'اتصال', 'بريد إلكتروني', 'الكل'],
}],
```

### 2. تعديل endpoint إنشاء المنشور (routes/postRoutes.js)
تم تعديل `POST /api/v1/posts` لاستخراج وحفظ بيانات التواصل:

```javascript
// استخراج الحقول من الطلب
const { text, media, scheduledTime, hashtags, mentions, category, postType, scope, contactPhone, contactEmail, contactMethods } = req.body;

// حفظها في المنشور الجديد
const newPost = new Post({
  user: req.user.id,
  text,
  media: media || [],
  scheduledTime: scheduledTime || null,
  isPublished: scheduledTime ? false : true,
  hashtags: finalHashtags,
  mentions: finalMentions,
  category: category || null,
  postType: postType || null,
  scope: scope || 'global',
  contactPhone: contactPhone || '',
  contactEmail: contactEmail || '',
  contactMethods: contactMethods || []
});
```

### 3. تعديل endpoint تحديث المنشور (routes/postRoutes.js)
تم تعديل `PUT /api/v1/posts/:id` لدعم تحديث بيانات التواصل:

```javascript
const { text, media, contactPhone, contactEmail, contactMethods } = req.body;

// Update fields
if (text !== undefined) {
  post.text = text;
}
if (media !== undefined) {
  post.media = media;
}
if (contactPhone !== undefined) {
  post.contactPhone = contactPhone;
}
if (contactEmail !== undefined) {
  post.contactEmail = contactEmail;
}
if (contactMethods !== undefined) {
  post.contactMethods = contactMethods;
}
```

## كيفية الاستخدام

### من الواجهة الأمامية:
1. عند إنشاء منشور جديد، انتقل إلى الخطوة الثانية (إعدادات النشر)
2. أدخل معلومات التواصل:
   - رقم الهاتف (للواتساب والاتصال)
   - البريد الإلكتروني
3. اختر طرق التواصل المفضلة:
   - واتساب
   - اتصال
   - بريد إلكتروني
   - الكل (لتفعيل جميع الطرق)
4. انشر المنشور

### عرض المنشور:
- سيظهر زر "اتصال" بجانب "عالمي/محلي" في سطر المعلومات
- عند الضغط على زر "اتصال"، ستفتح حاوية منبثقة تحتوي على خيارات التواصل المفعلة
- كل خيار سيفتح التطبيق المناسب:
  - واتساب: يفتح محادثة واتساب
  - اتصال: يبدأ مكالمة هاتفية
  - بريد إلكتروني: يفتح تطبيق البريد

## الملفات المعدلة

1. `/models/Post.js` - إضافة حقول التواصل
2. `/routes/postRoutes.js` - تعديل endpoints الإنشاء والتحديث

## ملاحظات مهمة

- الواجهة الأمامية لم تحتاج أي تعديلات - كانت جاهزة بالفعل
- زر "اتصال" يظهر فقط إذا كان `contactMethods` يحتوي على عناصر
- الحاوية المنبثقة تعرض فقط الخيارات المفعلة والتي لها بيانات صحيحة
- إذا اختار المستخدم "الكل"، ستظهر جميع الخيارات المتاحة

## الاختبار

للتأكد من عمل الميزة:
1. أنشئ منشور جديد مع معلومات تواصل
2. تحقق من ظهور زر "اتصال" في المنشور
3. اضغط على زر "اتصال" وتأكد من ظهور الحاوية المنبثقة
4. جرب كل خيار تواصل للتأكد من عمله

## التاريخ
- **التاريخ**: 15 نوفمبر 2025
- **الإصدار**: 1.0
- **المطور**: Manus AI Agent
