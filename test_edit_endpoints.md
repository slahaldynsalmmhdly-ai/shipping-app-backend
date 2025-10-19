# دليل اختبار API Endpoints للتعديل

هذا الدليل يوضح كيفية اختبار الـ endpoints الجديدة باستخدام أدوات مثل Postman أو curl.

---

## المتطلبات الأساسية

1. **تشغيل الخادم**
   ```bash
   npm start
   ```

2. **الحصول على Token**
   - يجب تسجيل الدخول أولاً للحصول على Bearer Token
   - استخدم endpoint تسجيل الدخول: `POST /api/v1/auth/login`

3. **إنشاء عنصر للاختبار**
   - قم بإنشاء منشور أو إعلان أولاً لتتمكن من تعديله

---

## 1. اختبار تعديل المنشورات

### الخطوة 1: إنشاء منشور جديد
```bash
curl -X POST http://localhost:5000/api/v1/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "text": "هذا منشور للاختبار",
    "media": []
  }'
```

احفظ الـ `_id` من الاستجابة.

### الخطوة 2: تعديل المنشور
```bash
curl -X PUT http://localhost:5000/api/v1/posts/POST_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "text": "هذا منشور معدل",
    "media": []
  }'
```

### الخطوة 3: التحقق من النتيجة
- يجب أن ترجع الاستجابة المنشور المحدث
- تحقق من أن النص قد تم تحديثه
- تحقق من أن `user` و `createdAt` لم يتغيرا

### اختبارات إضافية:
1. **محاولة تعديل منشور لمستخدم آخر** (يجب أن يفشل مع 401)
2. **محاولة تعديل منشور غير موجود** (يجب أن يفشل مع 404)
3. **تعديل الوسائط فقط** (إرسال media فقط دون text)
4. **تعديل النص فقط** (إرسال text فقط دون media)

---

## 2. اختبار تعديل إعلانات الحمولة

### الخطوة 1: إنشاء إعلان حمولة جديد
```bash
curl -X POST http://localhost:5000/api/v1/shipmentads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "pickupLocation": "الرياض",
    "deliveryLocation": "جدة",
    "pickupDate": "2025-10-25",
    "truckType": "شاحنة كبيرة",
    "description": "نقل أثاث",
    "media": []
  }'
```

احفظ الـ `_id` من الاستجابة.

### الخطوة 2: تعديل الإعلان
```bash
curl -X PUT http://localhost:5000/api/v1/shipmentads/AD_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "pickupLocation": "الدمام",
    "deliveryLocation": "مكة",
    "truckType": "شاحنة متوسطة",
    "description": "نقل أثاث منزلي كامل"
  }'
```

### الخطوة 3: التحقق من النتيجة
- تحقق من تحديث الحقول المرسلة
- تحقق من أن الحقول غير المرسلة بقيت كما هي

### اختبارات إضافية:
1. **تعديل حقل واحد فقط**
2. **تعديل التاريخ**
3. **تعديل الوسائط**
4. **محاولة تعديل إعلان لمستخدم آخر** (يجب أن يفشل)

---

## 3. اختبار تعديل إعلانات الشاحنات الفارغة

### الخطوة 1: إنشاء إعلان شاحنة فارغة
```bash
curl -X POST http://localhost:5000/api/v1/emptytruckads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "currentLocation": "الدمام",
    "preferredDestination": "الرياض",
    "availabilityDate": "2025-10-26",
    "truckType": "شاحنة كبيرة",
    "additionalNotes": "متاح للنقل الفوري",
    "media": []
  }'
```

### الخطوة 2: تعديل الإعلان
```bash
curl -X PUT http://localhost:5000/api/v1/emptytruckads/AD_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "currentLocation": "جدة",
    "preferredDestination": "الطائف",
    "additionalNotes": "السائق متاح للمساعدة في التحميل"
  }'
```

### الخطوة 3: التحقق من النتيجة
- تحقق من تحديث الحقول
- تحقق من وجود `updatedAt` في الاستجابة (EmptyTruckAd يستخدم timestamps)

---

## 4. اختبارات الأمان

### اختبار 1: محاولة التعديل بدون Token
```bash
curl -X PUT http://localhost:5000/api/v1/posts/POST_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "text": "محاولة تعديل بدون مصادقة"
  }'
```
**النتيجة المتوقعة:** 401 Unauthorized

### اختبار 2: محاولة تعديل منشور لمستخدم آخر
```bash
# استخدم token لمستخدم مختلف عن صاحب المنشور
curl -X PUT http://localhost:5000/api/v1/posts/POST_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DIFFERENT_USER_TOKEN" \
  -d '{
    "text": "محاولة تعديل منشور شخص آخر"
  }'
```
**النتيجة المتوقعة:** 401 User not authorized

### اختبار 3: محاولة تعديل عنصر غير موجود
```bash
curl -X PUT http://localhost:5000/api/v1/posts/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "text": "تعديل منشور غير موجود"
  }'
```
**النتيجة المتوقعة:** 404 Not found

---

## 5. اختبارات التوافق مع الواجهة الأمامية

### اختبار البيانات المرسلة من الواجهة الأمامية

#### تعديل منشور مع وسائط
```json
{
  "text": "نص المنشور المحدث",
  "media": [
    {
      "url": "/uploads/1634567890-image.jpg",
      "type": "image"
    }
  ]
}
```

#### تعديل إعلان حمولة
```json
{
  "pickupLocation": "الرياض",
  "deliveryLocation": "جدة",
  "pickupDate": "2025-10-25",
  "truckType": "شاحنة كبيرة",
  "description": "نقل أثاث منزلي",
  "media": [
    {
      "url": "/uploads/1634567890-cargo.jpg",
      "type": "image"
    }
  ]
}
```

#### تعديل إعلان شاحنة فارغة
```json
{
  "currentLocation": "الدمام",
  "preferredDestination": "الرياض",
  "availabilityDate": "2025-10-26",
  "truckType": "شاحنة متوسطة",
  "additionalNotes": "السائق متاح للمساعدة",
  "media": [
    {
      "url": "/uploads/1634567890-truck.jpg",
      "type": "image"
    }
  ]
}
```

---

## 6. قائمة التحقق النهائية

- [ ] جميع الـ endpoints تستجيب بشكل صحيح
- [ ] التحقق من الصلاحيات يعمل بشكل صحيح
- [ ] لا يمكن للمستخدمين تعديل محتوى الآخرين
- [ ] الحقول الاختيارية تعمل بشكل صحيح
- [ ] البيانات المرتبطة (user, comments) يتم إرجاعها بشكل صحيح
- [ ] رسائل الأخطاء واضحة ومفيدة
- [ ] التوافق مع الواجهة الأمامية 100%

---

## ملاحظات

- تأكد من أن قاعدة البيانات MongoDB تعمل
- تأكد من أن جميع المتغيرات البيئية محددة بشكل صحيح
- استخدم أدوات مثل Postman أو Insomnia لسهولة الاختبار
- يمكنك استخدام MongoDB Compass لمراقبة التغييرات في قاعدة البيانات

