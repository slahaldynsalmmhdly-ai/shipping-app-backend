# تحديث: إضافة Logging مفصل لـ Hooks النشر التلقائي

## التحديث

أضفنا logging مفصل في Hooks نموذج Vehicle لتتبع عملية النشر التلقائي.

---

## الملفات المعدلة

### 1. `models/Vehicle.js`

#### Hook `post('save')`:

```javascript
VehicleSchema.post('save', async function(doc) {
  try {
    console.log(`🔍 [Vehicle Hook - save] Vehicle ${doc._id} status: ${doc.status}`);
    
    if (doc.status === "متاح") {
      console.log(`✅ [Vehicle Hook - save] Vehicle ${doc._id} is available, triggering auto post...`);
      
      const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
      
      setImmediate(async () => {
        try {
          await autoPostSingleEmptyTruck(doc._id);
        } catch (error) {
          console.error('❌ Error in post-save auto posting:', error);
        }
      });
    } else {
      console.log(`ℹ️ [Vehicle Hook - save] Vehicle ${doc._id} status is not "متاح", skipping auto post`);
    }
  } catch (error) {
    console.error('❌ Error in Vehicle post-save hook:', error);
  }
});
```

#### Hook `post('findOneAndUpdate')`:

```javascript
VehicleSchema.post('findOneAndUpdate', async function(doc) {
  try {
    console.log(`🔍 [Vehicle Hook - findOneAndUpdate] Document:`, doc ? `ID: ${doc._id}, status: ${doc.status}` : 'null');
    
    if (doc && doc.status === "متاح") {
      console.log(`✅ [Vehicle Hook - findOneAndUpdate] Vehicle ${doc._id} is available, triggering auto post...`);
      
      const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
      
      setImmediate(async () => {
        try {
          await autoPostSingleEmptyTruck(doc._id);
        } catch (error) {
          console.error('❌ Error in post-update auto posting:', error);
        }
      });
    } else {
      console.log(`ℹ️ [Vehicle Hook - findOneAndUpdate] Vehicle status is not "متاح" or doc is null, skipping auto post`);
    }
  } catch (error) {
    console.error('❌ Error in Vehicle post-findOneAndUpdate hook:', error);
  }
});
```

---

## السجلات المتوقعة

### عند تحديث حالة الأسطول إلى "متاح":

```
🔍 [Vehicle Hook - save] Vehicle 673abc123def456 status: متاح
✅ [Vehicle Hook - save] Vehicle 673abc123def456 is available, triggering auto post...
🚀 Auto posting empty truck ad for: شاحنة نقل ثقيل (ABC-1234)
🎨 Generating AI image for empty truck...
📝 Image prompt: A realistic image of a شاحنة نقل ثقيل in جدة...
✅ AI-generated image URL added to ad
✅ Following notifications created for empty truck ad
✅ Successfully posted empty truck ad for: شاحنة نقل ثقيل
```

### عند تحديث حالة الأسطول إلى "في العمل":

```
🔍 [Vehicle Hook - save] Vehicle 673abc123def456 status: في العمل
ℹ️ [Vehicle Hook - save] Vehicle 673abc123def456 status is not "متاح", skipping auto post
```

### إذا لم يتم تفعيل الميزة:

```
🔍 [Vehicle Hook - save] Vehicle 673abc123def456 status: متاح
✅ [Vehicle Hook - save] Vehicle 673abc123def456 is available, triggering auto post...
🚀 Auto posting empty truck ad for: شاحنة نقل ثقيل (ABC-1234)
ℹ️ Auto posting is not enabled for this company
```

### إذا تم النشر مؤخراً:

```
🔍 [Vehicle Hook - save] Vehicle 673abc123def456 status: متاح
✅ [Vehicle Hook - save] Vehicle 673abc123def456 is available, triggering auto post...
🚀 Auto posting empty truck ad for: شاحنة نقل ثقيل (ABC-1234)
ℹ️ Already posted within the last hour, skipping
```

---

## كيفية الاختبار

### 1. أعد تشغيل الخادم

```bash
pm2 restart app
# أو
npm restart
```

### 2. تأكد من تفعيل الميزة

من الواجهة الأمامية:
- افتح **الإعدادات** → **توظيف AI**
- فعّل **النشر التلقائي**

أو من API:
```bash
curl -X PUT http://localhost:5000/api/v1/ai-features/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoPosting": true}'
```

### 3. حول حالة الأسطول

من الواجهة الأمامية:
- افتح **الأسطول**
- اختر شاحنة
- حول الحالة من **"في العمل"** إلى **"متاح"**

### 4. راقب السجلات

```bash
pm2 logs app
# أو
tail -f logs/app.log
```

يجب أن ترى السجلات المذكورة أعلاه.

---

## استكشاف الأخطاء

### المشكلة: لا يظهر أي سجل

**السبب:** Hook لا يعمل  
**الحل:** تأكد من أن الكود يستخدم `vehicle.save()` وليس `findOneAndUpdate()` مباشرة

### المشكلة: يظهر "Auto posting is not enabled"

**السبب:** الميزة غير مفعلة  
**الحل:** فعّل الميزة من الإعدادات

### المشكلة: يظهر "Already posted within the last hour"

**السبب:** تم النشر مؤخراً  
**الحل:** انتظر ساعة أو امسح حقل `lastAutoPostedAt` من قاعدة البيانات

### المشكلة: يظهر "User is not a company"

**السبب:** المستخدم ليس شركة  
**الحل:** تأكد من أن `user.userType === 'company'`

### المشكلة: يظهر "Missing basic vehicle information"

**السبب:** الأسطول لا يحتوي على اسم أو رقم لوحة  
**الحل:** أضف اسم ورقم لوحة للأسطول

---

## الفحص اليدوي

### التحقق من تفعيل الميزة:

```javascript
// في MongoDB shell أو Compass
db.users.findOne({ _id: ObjectId("YOUR_USER_ID") }, { aiFeatures: 1 })

// يجب أن يكون:
{
  aiFeatures: {
    autoPosting: true,
    // ...
  }
}
```

### التحقق من بيانات الأسطول:

```javascript
db.vehicles.findOne({ _id: ObjectId("YOUR_VEHICLE_ID") })

// يجب أن يحتوي على:
{
  vehicleName: "شاحنة نقل ثقيل",
  licensePlate: "ABC-1234",
  status: "متاح",
  currentLocation: "جدة",
  // ...
}
```

### التحقق من الإعلانات المنشأة:

```javascript
db.emptytruckads.find({ user: ObjectId("YOUR_USER_ID") }).sort({ createdAt: -1 }).limit(1)

// يجب أن يحتوي على إعلان حديث
```

---

## الخلاصة

- ✅ أضفنا logging مفصل لتتبع عملية النشر التلقائي
- ✅ Hook `post('save')` يعمل عند استخدام `vehicle.save()`
- ✅ Hook `post('findOneAndUpdate')` يعمل عند استخدام `findOneAndUpdate()`
- ✅ السجلات تساعد في تحديد المشكلة بسرعة

---

## التاريخ

**2025-10-31**: إضافة logging مفصل لـ Hooks النشر التلقائي
