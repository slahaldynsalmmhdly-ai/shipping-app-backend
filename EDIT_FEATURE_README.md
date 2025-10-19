# ميزة تعديل المنشورات والإعلانات

## نظرة عامة

تم إضافة ميزة تعديل المنشورات والإعلانات إلى الواجهة الخلفية لتطبيق الشحن لتتوافق مع الواجهة الأمامية. هذه الميزة تسمح للمستخدمين بتعديل المحتوى الخاص بهم بعد نشره.

## الملفات المعدلة

### 1. `routes/postRoutes.js`
- **التعديل:** إضافة endpoint جديد `PUT /api/v1/posts/:id`
- **الوظيفة:** تعديل المنشورات
- **السطور المضافة:** 564-616

### 2. `routes/shipmentAdRoutes.js`
- **التعديل:** إضافة endpoint جديد `PUT /api/v1/shipmentads/:id`
- **الوظيفة:** تعديل إعلانات الحمولة
- **السطور المضافة:** 495-562

### 3. `routes/emptyTruckAdRoutes.js`
- **التعديل:** إضافة endpoint جديد `PUT /api/v1/emptytruckads/:id`
- **الوظيفة:** تعديل إعلانات الشاحنات الفارغة
- **السطور المضافة:** 471-538

## الميزات الرئيسية

### 1. الأمان
- ✅ جميع الـ endpoints محمية بـ middleware المصادقة (`protect`)
- ✅ التحقق من أن المستخدم هو صاحب المحتوى قبل السماح بالتعديل
- ✅ لا يمكن للمستخدمين تعديل محتوى الآخرين
- ✅ لا يمكن تعديل المنشورات المعاد نشرها (reposts)

### 2. المرونة
- ✅ جميع الحقول اختيارية في عملية التعديل
- ✅ يتم تحديث الحقول المرسلة فقط
- ✅ الحقول غير المرسلة تبقى كما هي
- ✅ الحفاظ على التعليقات والتفاعلات الموجودة

### 3. التوافق
- ✅ متوافق 100% مع الواجهة الأمامية
- ✅ يستخدم نفس البنية والتنسيق
- ✅ يرجع البيانات المحدثة مع العلاقات المرتبطة

## كيفية الاستخدام

### مثال 1: تعديل منشور

```javascript
// Frontend code (from App.tsx)
const handlePublishPost = async (postData) => {
  const isEditMode = !!itemToEdit;
  
  const endpoint = isEditMode 
    ? `${API_BASE_URL}/api/v1/posts/${itemToEdit._id}` 
    : `${API_BASE_URL}/api/v1/posts`;
  
  const method = isEditMode ? 'PUT' : 'POST';
  
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      text: postData.text,
      media: mediaPayload
    })
  });
  
  const updatedPost = await response.json();
};
```

### مثال 2: تعديل إعلان حمولة

```javascript
// Frontend code (from App.tsx)
const handlePublishCargoAd = async (adData) => {
  const isEditMode = !!itemToEdit;
  
  const endpoint = isEditMode 
    ? `${API_BASE_URL}/api/v1/shipmentads/${itemToEdit._id}` 
    : `${API_BASE_URL}/api/v1/shipmentads`;
  
  const method = isEditMode ? 'PUT' : 'POST';
  
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(adData)
  });
  
  const updatedAd = await response.json();
};
```

### مثال 3: تعديل إعلان شاحنة فارغة

```javascript
// Frontend code (from App.tsx)
const handlePublishEmptyTruckAd = async (adData) => {
  const isEditMode = !!itemToEdit;
  
  const endpoint = isEditMode 
    ? `${API_BASE_URL}/api/v1/emptytruckads/${itemToEdit._id}` 
    : `${API_BASE_URL}/api/v1/emptytruckads`;
  
  const method = isEditMode ? 'PUT' : 'POST';
  
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(adData)
  });
  
  const updatedAd = await response.json();
};
```

## آلية العمل

### 1. تعديل المنشورات (Posts)

```
PUT /api/v1/posts/:id
```

**Request Body:**
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

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "أحمد محمد",
    "avatar": "/uploads/avatar.jpg"
  },
  "text": "نص المنشور المحدث",
  "media": [...],
  "reactions": [...],
  "comments": [...],
  "createdAt": "2025-10-19T10:30:00.000Z"
}
```

### 2. تعديل إعلانات الحمولة (Shipment Ads)

```
PUT /api/v1/shipmentads/:id
```

**Request Body:**
```json
{
  "pickupLocation": "الرياض",
  "deliveryLocation": "جدة",
  "pickupDate": "2025-10-25",
  "truckType": "شاحنة كبيرة",
  "description": "نقل أثاث منزلي",
  "media": [...]
}
```

### 3. تعديل إعلانات الشاحنات الفارغة (Empty Truck Ads)

```
PUT /api/v1/emptytruckads/:id
```

**Request Body:**
```json
{
  "currentLocation": "الدمام",
  "preferredDestination": "الرياض",
  "availabilityDate": "2025-10-26",
  "truckType": "شاحنة متوسطة",
  "additionalNotes": "السائق متاح للمساعدة",
  "media": [...]
}
```

## معالجة الأخطاء

### 401 Unauthorized
```json
{
  "msg": "User not authorized"
}
```
- **السبب:** المستخدم ليس صاحب المحتوى
- **الحل:** تأكد من أن المستخدم المسجل هو صاحب المحتوى

### 404 Not Found
```json
{
  "msg": "Post not found"
}
```
- **السبب:** المحتوى غير موجود أو تم حذفه
- **الحل:** تحقق من صحة الـ ID

### 400 Bad Request
```json
{
  "msg": "Cannot edit a repost"
}
```
- **السبب:** محاولة تعديل منشور معاد نشره
- **الحل:** لا يمكن تعديل المنشورات المعاد نشرها

### 500 Server Error
```json
{
  "message": "Server Error",
  "error": "..."
}
```
- **السبب:** خطأ في الخادم أو قاعدة البيانات
- **الحل:** راجع سجلات الخادم

## الاختبار

راجع ملف `test_edit_endpoints.md` للحصول على دليل شامل لاختبار الـ endpoints الجديدة.

### اختبار سريع

```bash
# 1. إنشاء منشور
curl -X POST http://localhost:5000/api/v1/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text": "منشور للاختبار", "media": []}'

# 2. تعديل المنشور
curl -X PUT http://localhost:5000/api/v1/posts/POST_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text": "منشور معدل", "media": []}'
```

## التوثيق

راجع ملف `API_EDIT_ENDPOINTS_DOCUMENTATION.md` للحصول على توثيق شامل للـ API.

## الملاحظات

- ✅ جميع التعديلات متوافقة مع الكود الموجود
- ✅ لا توجد تغييرات في قاعدة البيانات (Models)
- ✅ لا توجد تغييرات في middleware المصادقة
- ✅ يتم الحفاظ على جميع الوظائف الموجودة
- ✅ الكود يتبع نفس النمط والأسلوب المستخدم في الملفات الأخرى

## الخطوات التالية

1. ✅ اختبار الـ endpoints محلياً
2. ✅ التأكد من التوافق مع الواجهة الأمامية
3. ✅ رفع التعديلات إلى GitHub
4. ⏳ نشر التحديثات على الخادم الإنتاجي
5. ⏳ مراقبة الأداء والأخطاء

## المساهمون

- تم تطوير هذه الميزة بناءً على متطلبات الواجهة الأمامية
- التاريخ: 19 أكتوبر 2025
- الإصدار: 1.0.0

## الدعم

في حالة وجود أي مشاكل أو استفسارات، يرجى:
1. مراجعة ملف التوثيق `API_EDIT_ENDPOINTS_DOCUMENTATION.md`
2. مراجعة ملف الاختبار `test_edit_endpoints.md`
3. التحقق من سجلات الخادم للأخطاء
4. فتح issue في GitHub repository

