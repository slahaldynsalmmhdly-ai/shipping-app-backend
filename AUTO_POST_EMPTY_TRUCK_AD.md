# ميزة النشر التلقائي لإعلانات الشاحنات الفارغة

## الوصف

تم تحديث ميزة **النشر التلقائي** لتُنشئ **إعلان شاحنة فارغة (EmptyTruckAd)** بدلاً من منشور عادي.

### كيف تعمل:

1. ✅ **عند تحويل حالة الأسطول من "في العمل" إلى "متاح"**
2. ✅ **الذكاء الاصطناعي ينشئ إعلان شاحنة فارغة تلقائياً**
3. ✅ **النشر فوري (بدون توقيت)**
4. ✅ **يستخدم بيانات الأسطول والموقع**
5. ✅ **يولد محتوى متنوع ومبتكر**
6. ✅ **يولد صورة بالذكاء الاصطناعي**
7. ✅ **ينشئ إشعارات للمتابعين (نظام 15%)**

---

## الشروط المطلوبة

### لكي تعمل الميزة، يجب:

1. ✅ **المستخدم شركة** (`userType === 'company'`)
2. ✅ **ميزة النشر التلقائي مفعلة** (`user.aiFeatures.autoPosting === true`)
3. ✅ **الأسطول يحتوي على بيانات أساسية** (اسم، رقم لوحة)
4. ✅ **لم يتم النشر خلال الساعة الأخيرة** (لتجنب التكرار)

---

## الآلية التقنية

### 1️⃣ Hook في نموذج Vehicle

في ملف `models/Vehicle.js`:

```javascript
// Hook للنشر التلقائي عند تغيير حالة المركبة إلى "متاح"
VehicleSchema.post('save', async function(doc) {
  if (doc.status === "متاح") {
    const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
    setImmediate(async () => {
      await autoPostSingleEmptyTruck(doc._id);
    });
  }
});

VehicleSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === "متاح") {
    const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
    setImmediate(async () => {
      await autoPostSingleEmptyTruck(doc._id);
    });
  }
});
```

### 2️⃣ دالة النشر التلقائي

في ملف `utils/autoPostEmptyTruck.js`:

```javascript
async function autoPostSingleEmptyTruck(vehicleId) {
  // 1. جلب بيانات الأسطول والمستخدم
  const vehicle = await Vehicle.findById(vehicleId).populate('user');
  
  // 2. التحقق من الشروط
  if (!vehicle || vehicle.status !== "متاح") return;
  if (user.userType !== 'company') return;
  if (!user.aiFeatures?.autoPosting) return;
  
  // 3. التحقق من عدم التكرار (ساعة واحدة)
  if (vehicle.lastAutoPostedAt) {
    const hoursSinceLastPost = (Date.now() - vehicle.lastAutoPostedAt) / 3600000;
    if (hoursSinceLastPost < 1) return;
  }
  
  // 4. توليد محتوى بالذكاء الاصطناعي
  const additionalNotes = await callDeepSeek([...]);
  
  // 5. توليد صورة بالذكاء الاصطناعي
  const imageUrl = generateImageUrl(imagePrompt);
  
  // 6. إنشاء إعلان الشاحنة الفارغة
  const emptyTruckAd = await EmptyTruckAd.create({
    user: user._id,
    currentLocation: vehicle.currentLocation || user.city,
    preferredDestination: 'أي وجهة', // ذكي
    availabilityDate: new Date(), // الآن
    truckType: vehicle.vehicleType,
    additionalNotes: additionalNotes,
    media: [{ url: imageUrl, type: 'image' }],
    isPublished: true,
    scheduledTime: null, // نشر فوري
  });
  
  // 7. إنشاء إشعارات للمتابعين (15%)
  await createFollowingNotifications(
    user._id,
    'new_following_empty_truck_ad',
    null, null, emptyTruckAd._id
  );
  
  // 8. تحديث معلومات النشر
  vehicle.lastAutoPostedAt = new Date();
  vehicle.autoPostCount += 1;
  await vehicle.save();
}
```

---

## بنية إعلان الشاحنة الفارغة

### الحقول المطلوبة:

```javascript
{
  user: ObjectId,                    // الشركة المالكة
  currentLocation: String,           // الموقع الحالي
  preferredDestination: String,      // الوجهة المفضلة
  availabilityDate: Date,            // تاريخ التوفر
  truckType: String,                 // نوع الشاحنة
  additionalNotes: String,           // ملاحظات إضافية (من AI)
  media: [{ url, type }],           // صور (من AI)
  isPublished: Boolean,              // منشور فوراً
  scheduledTime: null,               // بدون توقيت
}
```

---

## توليد المحتوى بالذكاء الاصطناعي

### 1️⃣ الملاحظات الإضافية:

```javascript
const prompt = `أنت مساعد ذكي متخصص في كتابة إعلانات متنوعة. 
قم بإنشاء ملاحظات إضافية (لا تزيد عن 80 كلمة) للإعلان عن شاحنة فارغة.

معلومات الشاحنة:
- النوع: ${vehicle.vehicleType}
- رقم اللوحة: ${vehicle.licensePlate}
- الموقع الحالي: ${vehicle.currentLocation}
- اسم الشركة: ${user.companyName}

متطلبات الملاحظات:
- استخدم أسلوب مبتكر ومختلف
- ركز على مميزات الشاحنة والخدمة
- باللغة العربية`;

const additionalNotes = await callDeepSeek([...]);
```

### 2️⃣ الصورة:

```javascript
const imagePrompt = generateTruckImagePrompt(
  vehicle.vehicleType,
  vehicle.currentLocation,
  'realistic'
);

const imageUrl = generateImageUrl(imagePrompt);
```

---

## الوجهة المفضلة الذكية

الكود يحدد الوجهة المفضلة بذكاء بناءً على الموقع الحالي:

```javascript
const preferredDestination = vehicle.currentLocation ? 
  (vehicle.currentLocation.includes('الرياض') ? 'جدة' : 
   vehicle.currentLocation.includes('جدة') ? 'الرياض' : 
   vehicle.currentLocation.includes('الدمام') ? 'الرياض' : 
   'أي وجهة') : 'أي وجهة';
```

### أمثلة:

| الموقع الحالي | الوجهة المفضلة |
|---------------|----------------|
| الرياض | جدة |
| جدة | الرياض |
| الدمام | الرياض |
| أي مدينة أخرى | أي وجهة |

---

## نظام الإشعارات

### إنشاء إشعارات للمتابعين:

```javascript
await createFollowingNotifications(
  user._id,                          // الشركة
  'new_following_empty_truck_ad',    // نوع الإشعار
  null,                              // post
  null,                              // shipmentAd
  emptyTruckAd._id                   // emptyTruckAd
);
```

### نظام 15%:

- ✅ **15% من المتابعين** يرون الإعلان في الصفحة الرئيسية
- ✅ **85% الباقية** يرون الإعلان في صفحة الإشعارات فقط
- ✅ **نفس نظام فيسبوك**

---

## منع التكرار

### الآلية:

```javascript
// التحقق من عدم النشر خلال الساعة الأخيرة
if (vehicle.lastAutoPostedAt) {
  const hoursSinceLastPost = (Date.now() - vehicle.lastAutoPostedAt) / 3600000;
  if (hoursSinceLastPost < 1) {
    return { success: false, message: "Already posted recently" };
  }
}

// بعد النشر، تحديث الوقت
vehicle.lastAutoPostedAt = new Date();
vehicle.autoPostCount += 1;
await vehicle.save();
```

### الفائدة:

- ✅ يمنع النشر المتكرر عند تحديث الأسطول عدة مرات
- ✅ يحافظ على جودة المحتوى
- ✅ لا يزعج المتابعين

---

## السيناريو الكامل

### مثال عملي:

```
الوقت: 10:00 صباحاً
الشركة: شركة النقل السريع
الأسطول: شاحنة نقل ثقيل - رقم اللوحة: ABC-1234

1️⃣ الشاحنة تنتهي من رحلة في جدة
2️⃣ الشركة تحول حالة الأسطول من "في العمل" إلى "متاح"
3️⃣ Hook يُشغّل دالة autoPostSingleEmptyTruck
4️⃣ الدالة تتحقق من الشروط ✅
5️⃣ الذكاء الاصطناعي يولد ملاحظات:
    "🚚 شاحنة نقل ثقيل متاحة الآن في جدة!
    نوفر خدمة نقل موثوقة وسريعة إلى جميع أنحاء المملكة.
    الشاحنة جاهزة للانطلاق فوراً. اتصل الآن!"
6️⃣ الذكاء الاصطناعي يولد صورة للشاحنة
7️⃣ يُنشأ إعلان شاحنة فارغة:
    - الموقع الحالي: جدة
    - الوجهة المفضلة: الرياض (ذكي)
    - تاريخ التوفر: الآن
    - نوع الشاحنة: شاحنة نقل ثقيل
8️⃣ يُنشأ إشعارات لـ 15% من المتابعين
9️⃣ يُحدّث lastAutoPostedAt و autoPostCount
🔟 ✅ تم النشر بنجاح!
```

---

## الفرق بين القديم والجديد

| الميزة | القديم | الجديد |
|--------|--------|--------|
| نوع المحتوى | منشور عادي (Post) | إعلان شاحنة فارغة (EmptyTruckAd) |
| الحقول | text, media | currentLocation, preferredDestination, availabilityDate, truckType, additionalNotes, media |
| الوجهة | غير محددة | ذكية بناءً على الموقع |
| التوقيت | فوري | فوري (بدون scheduledTime) |
| الإشعارات | لا يوجد | نظام 15% للمتابعين |
| النوع | generatedByAI: true | إعلان شاحنة فارغة كامل |

---

## الاختبار

### خطوات الاختبار:

1. **تأكد من تفعيل الميزة:**
   ```javascript
   user.aiFeatures.autoPosting = true;
   await user.save();
   ```

2. **أضف أسطول جديد:**
   ```javascript
   const vehicle = await Vehicle.create({
     user: companyId,
     driverName: "أحمد محمد",
     vehicleName: "شاحنة نقل ثقيل",
     licensePlate: "ABC-1234",
     vehicleType: "شاحنة نقل ثقيل",
     currentLocation: "جدة",
     status: "في العمل", // ابدأ بـ "في العمل"
   });
   ```

3. **حول الحالة إلى "متاح":**
   ```javascript
   vehicle.status = "متاح";
   await vehicle.save();
   ```

4. **تحقق من النتيجة:**
   ```javascript
   // يجب أن يُنشأ إعلان شاحنة فارغة تلقائياً
   const ads = await EmptyTruckAd.find({ user: companyId });
   console.log(ads); // يجب أن يحتوي على إعلان جديد
   ```

---

## السجلات (Logs)

### عند النجاح:

```
🚀 Auto posting empty truck ad for: شاحنة نقل ثقيل (ABC-1234)
🎨 Generating AI image for empty truck...
📝 Image prompt: A realistic image of a شاحنة نقل ثقيل in جدة...
✅ AI-generated image URL added to ad: https://...
✅ Following notifications created for empty truck ad
✅ Successfully posted empty truck ad for: شاحنة نقل ثقيل
```

### عند الفشل:

```
❌ Vehicle not found: 123456789
ℹ️ Vehicle is not available, skipping auto post
ℹ️ User is not a company, skipping auto post
ℹ️ Auto posting is not enabled for this company
ℹ️ Already posted within the last hour, skipping
⚠️ Missing basic vehicle information, skipping auto post
❌ Error calling DeepSeek AI: ...
❌ Error in AI image generation: ...
```

---

## الملفات المعدلة

1. ✅ `utils/autoPostEmptyTruck.js` - تحديث كامل للدالة
2. ✅ `models/Vehicle.js` - Hooks موجودة مسبقاً (لا تحتاج تعديل)

---

## التوافق

هذه الميزة تعمل بالتوازي مع:
- ✅ نظام الفلترة 15% للمتابعين
- ✅ نظام الإشعارات
- ✅ الإخفاء الذكي للمنشورات (5 دقائق)
- ✅ جميع ميزات الذكاء الاصطناعي الأخرى

---

## الواجهة الأمامية

### هل تحتاج تعديل؟

**لا تحتاج تعديل!** ✅

الواجهة الأمامية تستدعي endpoint جلب إعلانات الشاحنات الفارغة:

```javascript
GET /api/v1/emptytruckads
```

الإعلانات المُنشأة تلقائياً ستظهر تلقائياً في الصفحة الرئيسية.

---

## ملاحظات مهمة

### ⚠️ تأكد من:

1. **تفعيل الميزة للشركة:**
   ```javascript
   user.aiFeatures = {
     autoPosting: true,
     // ... ميزات أخرى
   };
   ```

2. **إعادة تشغيل الخادم** بعد التحديث

3. **مراقبة السجلات** للتأكد من عمل الميزة

---

## التاريخ

**2025-10-31**: تحديث ميزة النشر التلقائي لإنشاء إعلانات شاحنات فارغة بدلاً من منشورات عادية
