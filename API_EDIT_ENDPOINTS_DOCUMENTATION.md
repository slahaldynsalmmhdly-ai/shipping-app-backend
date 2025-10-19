# توثيق API Endpoints للتعديل

تم إضافة ثلاثة endpoints جديدة لتعديل المنشورات والإعلانات في الواجهة الخلفية لتتوافق مع الواجهة الأمامية.

---

## 1. تعديل المنشورات (Posts)

### Endpoint
```
PUT /api/v1/posts/:id
```

### الوصف
تحديث منشور موجود بواسطة صاحب المنشور فقط.

### الصلاحيات
- **Private** - يتطلب تسجيل الدخول (Bearer Token)
- يجب أن يكون المستخدم هو صاحب المنشور

### المعاملات (Parameters)
- **:id** - معرف المنشور (MongoDB ObjectId)

### الجسم (Request Body)
```json
{
  "text": "نص المنشور المحدث",
  "media": [
    {
      "url": "/uploads/image.jpg",
      "type": "image"
    }
  ]
}
```

### الحقول
- **text** (String, اختياري) - نص المنشور
- **media** (Array, اختياري) - مصفوفة من الوسائط (صور/فيديوهات)
  - **url** (String) - رابط الوسائط
  - **type** (String) - نوع الوسائط: `image` أو `video`

### الاستجابة الناجحة (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "أحمد محمد",
    "avatar": "/uploads/avatar.jpg"
  },
  "text": "نص المنشور المحدث",
  "media": [
    {
      "url": "/uploads/image.jpg",
      "type": "image"
    }
  ],
  "reactions": [],
  "comments": [],
  "createdAt": "2025-10-19T10:30:00.000Z",
  "isRepost": false
}
```

### الأخطاء المحتملة
- **401 Unauthorized** - المستخدم غير مصرح له بتعديل هذا المنشور
- **404 Not Found** - المنشور غير موجود
- **400 Bad Request** - لا يمكن تعديل منشور معاد نشره (repost)
- **500 Server Error** - خطأ في الخادم

### ملاحظات
- لا يمكن تعديل المنشورات المعاد نشرها (reposts)
- يتم الحفاظ على التعليقات والتفاعلات الموجودة
- يتم إرجاع المنشور المحدث مع بيانات المستخدم المرتبطة

---

## 2. تعديل إعلانات الحمولة (Shipment Ads)

### Endpoint
```
PUT /api/v1/shipmentads/:id
```

### الوصف
تحديث إعلان حمولة موجود بواسطة صاحب الإعلان فقط.

### الصلاحيات
- **Private** - يتطلب تسجيل الدخول (Bearer Token)
- يجب أن يكون المستخدم هو صاحب الإعلان

### المعاملات (Parameters)
- **:id** - معرف الإعلان (MongoDB ObjectId)

### الجسم (Request Body)
```json
{
  "pickupLocation": "الرياض",
  "deliveryLocation": "جدة",
  "pickupDate": "2025-10-25",
  "truckType": "شاحنة كبيرة",
  "description": "نقل أثاث منزلي",
  "media": [
    {
      "url": "/uploads/cargo.jpg",
      "type": "image"
    }
  ]
}
```

### الحقول
- **pickupLocation** (String, اختياري) - مكان التحميل
- **deliveryLocation** (String, اختياري) - مكان التوصيل
- **pickupDate** (Date, اختياري) - تاريخ التحميل
- **truckType** (String, اختياري) - نوع الشاحنة المطلوبة
- **description** (String, اختياري) - وصف الحمولة
- **media** (Array, اختياري) - مصفوفة من الوسائط

### الاستجابة الناجحة (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "أحمد محمد",
    "avatar": "/uploads/avatar.jpg"
  },
  "pickupLocation": "الرياض",
  "deliveryLocation": "جدة",
  "pickupDate": "2025-10-25T00:00:00.000Z",
  "truckType": "شاحنة كبيرة",
  "description": "نقل أثاث منزلي",
  "media": [
    {
      "url": "/uploads/cargo.jpg",
      "type": "image"
    }
  ],
  "reactions": [],
  "comments": [],
  "createdAt": "2025-10-19T10:30:00.000Z"
}
```

### الأخطاء المحتملة
- **401 Unauthorized** - المستخدم غير مصرح له بتعديل هذا الإعلان
- **404 Not Found** - الإعلان غير موجود
- **500 Server Error** - خطأ في الخادم

---

## 3. تعديل إعلانات الشاحنات الفارغة (Empty Truck Ads)

### Endpoint
```
PUT /api/v1/emptytruckads/:id
```

### الوصف
تحديث إعلان شاحنة فارغة موجود بواسطة صاحب الإعلان فقط.

### الصلاحيات
- **Private** - يتطلب تسجيل الدخول (Bearer Token)
- يجب أن يكون المستخدم هو صاحب الإعلان

### المعاملات (Parameters)
- **:id** - معرف الإعلان (MongoDB ObjectId)

### الجسم (Request Body)
```json
{
  "currentLocation": "الدمام",
  "preferredDestination": "الرياض",
  "availabilityDate": "2025-10-26",
  "truckType": "شاحنة متوسطة",
  "additionalNotes": "السائق متاح للمساعدة",
  "media": [
    {
      "url": "/uploads/truck.jpg",
      "type": "image"
    }
  ]
}
```

### الحقول
- **currentLocation** (String, اختياري) - الموقع الحالي للشاحنة
- **preferredDestination** (String, اختياري) - الوجهة المفضلة
- **availabilityDate** (Date, اختياري) - تاريخ التوفر
- **truckType** (String, اختياري) - نوع الشاحنة
- **additionalNotes** (String, اختياري) - ملاحظات إضافية
- **media** (Array, اختياري) - مصفوفة من الوسائط

### الاستجابة الناجحة (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "أحمد محمد",
    "avatar": "/uploads/avatar.jpg"
  },
  "currentLocation": "الدمام",
  "preferredDestination": "الرياض",
  "availabilityDate": "2025-10-26T00:00:00.000Z",
  "truckType": "شاحنة متوسطة",
  "additionalNotes": "السائق متاح للمساعدة",
  "media": [
    {
      "url": "/uploads/truck.jpg",
      "type": "image"
    }
  ],
  "reactions": [],
  "comments": [],
  "createdAt": "2025-10-19T10:30:00.000Z",
  "updatedAt": "2025-10-19T11:00:00.000Z"
}
```

### الأخطاء المحتملة
- **401 Unauthorized** - المستخدم غير مصرح له بتعديل هذا الإعلان
- **404 Not Found** - الإعلان غير موجود
- **500 Server Error** - خطأ في الخادم

---

## ملاحظات عامة

### التوافق مع الواجهة الأمامية
جميع الـ endpoints تتوافق تماماً مع متطلبات الواجهة الأمامية:
- تستخدم HTTP Method: **PUT**
- تتطلب Bearer Token للمصادقة
- تتحقق من صلاحية المستخدم (يجب أن يكون صاحب المنشور/الإعلان)
- تقبل نفس البيانات التي ترسلها الواجهة الأمامية
- ترجع البيانات المحدثة مع العلاقات المرتبطة (populated)

### الأمان
- جميع الـ endpoints محمية بـ middleware المصادقة (`protect`)
- يتم التحقق من أن المستخدم هو صاحب العنصر قبل السماح بالتعديل
- لا يمكن للمستخدمين تعديل محتوى الآخرين

### التحديث الجزئي
- جميع الحقول اختيارية في عملية التعديل
- يتم تحديث الحقول المرسلة فقط
- الحقول غير المرسلة تبقى كما هي

### الاستجابة
- يتم إرجاع العنصر المحدث كاملاً مع البيانات المرتبطة
- يتم استخدام `.populate()` لإرجاع بيانات المستخدم والتعليقات

