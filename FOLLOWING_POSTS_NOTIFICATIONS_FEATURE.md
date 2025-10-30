# ميزة إشعارات منشورات المتابعين

## نظرة عامة

تم تطبيق ميزة جديدة مشابهة لنظام فيسبوك حيث يتم عرض **15% فقط** من منشورات المستخدمين المتابَعين في الصفحة الرئيسية، بينما يتم إرسال **85%** الباقية كإشعارات يمكن للمستخدم الاطلاع عليها في صفحة الإشعارات.

## التغييرات في Backend

### 1. تحديث نموذج المستخدم (User Model)

تم إضافة حقول جديدة في نموذج الإشعارات:

```javascript
notifications: [
  {
    type: "new_following_post",  // نوع جديد للإشعارات
    sender: ObjectId,
    post: ObjectId,              // للمنشورات العادية
    shipmentAd: ObjectId,        // لإعلانات الشحن
    emptyTruckAd: ObjectId,      // لإعلانات الشاحنات الفارغة
    itemType: String,            // نوع المحتوى: post, shipmentAd, emptyTruckAd
    read: Boolean,
    createdAt: Date
  }
]
```

### 2. Notification Helper

تم إنشاء ملف `utils/notificationHelper.js` يحتوي على:

#### `createFollowingPostNotifications(userId, itemId, itemType, feedPercentage)`

- يقوم بإنشاء إشعارات لجميع متابعي المستخدم
- يحدد عشوائياً 15% من المتابعين سيرون المنشور في الخلاصة
- الباقي (85%) سيحصلون على إشعار فقط

**المعاملات:**
- `userId`: معرف المستخدم الذي نشر المحتوى
- `itemId`: معرف المنشور/الإعلان
- `itemType`: نوع المحتوى ('post', 'shipmentAd', 'emptyTruckAd')
- `feedPercentage`: نسبة المتابعين الذين سيرون المحتوى في الخلاصة (افتراضياً 0.15)

### 3. تحديث Routes

تم تحديث الملفات التالية لاستخدام نظام الإشعارات الجديد:

#### `routes/postRoutes.js`
- عند إنشاء منشور جديد، يتم استدعاء `createFollowingPostNotifications`
- يتم إرسال الإشعارات فقط للمنشورات المنشورة فوراً (وليس المجدولة)

#### `routes/shipmentAdRoutes.js`
- نفس النظام لإعلانات الشحن

#### `routes/emptyTruckAdRoutes.js`
- نفس النظام لإعلانات الشاحنات الفارغة

#### `routes/userRoutes.js`
تم إضافة endpoints جديدة:

**1. جلب منشورات المتابعين من الإشعارات:**
```
GET /api/v1/users/me/notifications/following-posts
```

**Query Parameters:**
- `page`: رقم الصفحة (افتراضياً 1)
- `limit`: عدد العناصر في الصفحة (افتراضياً 20)

**Response:**
```json
{
  "notifications": [
    {
      "_id": "notification_id",
      "type": "new_following_post",
      "itemType": "post",
      "sender": { "name": "...", "avatar": "..." },
      "item": { /* بيانات المنشور/الإعلان */ },
      "read": false,
      "createdAt": "2025-10-30T..."
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalItems": 50,
    "totalPages": 3,
    "itemsPerPage": 20,
    "hasMore": true
  }
}
```

**2. عدد المنشورات غير المقروءة:**
```
GET /api/v1/users/me/notifications/following-posts/unread-count
```

**Response:**
```json
{
  "unreadCount": 12
}
```

### 4. تحديث Content Scheduler

تم تحديث `utils/contentScheduler.js` لإرسال إشعارات عند نشر المحتوى المجدول:
- عند نشر منشور/إعلان مجدول، يتم إرسال إشعارات للمتابعين تلقائياً
- يتم تطبيق نفس نسبة 15% للخلاصة و85% للإشعارات

## كيفية العمل

### عند إنشاء منشور جديد:

1. المستخدم ينشر منشوراً جديداً
2. النظام يجلب قائمة متابعي المستخدم
3. يتم اختيار 15% من المتابعين عشوائياً
4. هؤلاء الـ 15% سيرون المنشور في الخلاصة الرئيسية
5. الـ 85% الباقية يحصلون على إشعار من نوع `new_following_post`
6. يمكن للمستخدمين الاطلاع على هذه المنشورات من خلال صفحة الإشعارات

### في الخلاصة الرئيسية (Feed):

- نظام الخلاصة الحالي في `routes/feedRoutes.js` يعمل بشكل طبيعي
- يعرض 15% من منشورات المتابَعين مع 85% من المحتوى الآخر
- يتم الترتيب حسب نقاط التفاعل والوقت

## التكامل مع Frontend

### المطلوب في الواجهة الأمامية:

1. **إضافة قسم في صفحة الإشعارات:**
   - عرض منشورات المتابعين التي لم تظهر في الخلاصة
   - استخدام endpoint: `GET /api/v1/users/me/notifications/following-posts`

2. **عرض badge للمنشورات غير المقروءة:**
   - استخدام endpoint: `GET /api/v1/users/me/notifications/following-posts/unread-count`
   - عرض العدد بجانب أيقونة الإشعارات

3. **تحديث حالة القراءة:**
   - عند فتح المنشور من الإشعارات، استخدام endpoint الموجود:
   - `PUT /api/v1/users/me/notifications/:id/read`

## ملاحظات مهمة

- النسبة الحالية هي 15% ويمكن تعديلها بسهولة في الكود
- الإشعارات لا تُنشأ للمنشورات المجدولة حتى يتم نشرها فعلياً
- النظام يعمل مع جميع أنواع المحتوى: المنشورات العادية، إعلانات الشحن، إعلانات الشاحنات الفارغة
- تم مراعاة الأداء بحيث لا يتأثر وقت إنشاء المنشور

## الاختبار

### اختبار إنشاء منشور:
```bash
POST /api/v1/posts
{
  "text": "منشور تجريبي",
  "media": []
}
```

### اختبار جلب الإشعارات:
```bash
GET /api/v1/users/me/notifications/following-posts?page=1&limit=20
```

### اختبار عدد الإشعارات غير المقروءة:
```bash
GET /api/v1/users/me/notifications/following-posts/unread-count
```

## الخلاصة

تم تطبيق الميزة بنجاح في الخادم الخلفي، والآن يمكن للواجهة الأمامية استخدام الـ APIs الجديدة لعرض منشورات المتابعين في صفحة الإشعارات.
