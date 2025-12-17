# إصلاح إشعارات الشورتس

## التاريخ
17 ديسمبر 2025

## المشكلة
عند التعليق على فيديو من الشورتس، كان يظهر في الإشعارات "أعجب بمنشورك" بدلاً من "علق على فيديوك" أو لا يظهر إشعار على الإطلاق.

## السبب
endpoint `POST /api/v1/shorts/:id/comment` في ملف `routes/shortRoutes.js` كان **لا يرسل أي إشعار** لصاحب الفيديو عند التعليق.

## التحديثات المطبقة

### 1. ملف: `routes/shortRoutes.js`

#### التعديل الأول: إضافة استيراد الدالة (السطر 8)

**قبل:**
```javascript
const { createShortLikeNotification } = require('../utils/notificationHelper');
```

**بعد:**
```javascript
const { createShortLikeNotification, createShortCommentNotification } = require('../utils/notificationHelper');
```

#### التعديل الثاني: إضافة إنشاء الإشعار (السطر 643-647)

**قبل:**
```javascript
short.comments += 1;
await short.save();

res.json({
  success: true,
  comments: short.comments
});
```

**بعد:**
```javascript
short.comments += 1;
await short.save();

// إرسال إشعار لصاحب الفيديو إذا لم يكن المستخدم هو نفسه
if (short.user.toString() !== req.user._id.toString()) {
  // نستخدم short._id كـ commentId لأن هذا endpoint لا ينشئ تعليق في ShortComment
  await createShortCommentNotification(req.user._id, short.user.toString(), short._id, short._id);
}

res.json({
  success: true,
  comments: short.comments
});
```

## النتيجة

الآن عند التعليق على فيديو من الشورتس:
- ✅ يتم إرسال إشعار من نوع `short_comment` لصاحب الفيديو
- ✅ يظهر في الإشعارات "علق على الفيديو الخاص بك" بدلاً من "أعجب بمنشورك"
- ✅ لا يتم إرسال إشعار إذا كان المستخدم يعلق على فيديو نفسه

## حالة الإشعارات الأخرى

جميع الإشعارات الأخرى للشورتس تعمل بشكل صحيح:

| الميزة | الحالة | نوع الإشعار |
|--------|--------|-------------|
| الإعجاب بالفيديو | ✅ يعمل | `short_like` |
| التعليق على الفيديو (shortCommentRoutes) | ✅ يعمل | `short_comment` |
| **التعليق على الفيديو (shortRoutes)** | ✅ **تم الإصلاح** | `short_comment` |
| الرد على التعليق | ✅ يعمل | `short_reply` |
| الإعجاب بالتعليق | ✅ يعمل | `short_comment_like` |
| الإعجاب بالرد | ✅ يعمل | `short_reply_like` |

## ملاحظات

### نظامان للتعليقات على الشورتس

يوجد حالياً نظامان للتعليقات على الشورتس:

1. **النظام القديم:** `POST /api/v1/shorts/:id/comment` في `shortRoutes.js`
   - يزيد فقط عدد التعليقات في نموذج Short
   - ✅ تم إصلاحه ليرسل إشعار

2. **النظام الجديد:** `POST /api/v1/short-comments/:shortId` في `shortCommentRoutes.js`
   - ينشئ تعليق في نموذج ShortComment
   - ✅ كان يعمل بشكل صحيح من البداية

**التوصية:** يُفضل توحيد النظام واستخدام نظام واحد فقط في المستقبل.

## الاختبار

للتأكد من أن الإصلاح يعمل:

1. قم بتسجيل الدخول بحسابين مختلفين
2. من الحساب الأول، انشر فيديو في الشورتس
3. من الحساب الثاني، علق على الفيديو
4. تحقق من إشعارات الحساب الأول
5. يجب أن يظهر إشعار "علق على الفيديو الخاص بك" ✅

## الملفات المعدلة

- `routes/shortRoutes.js`

## الملفات المضافة

- `SHORTS_NOTIFICATIONS_FIX.md` (هذا الملف)
