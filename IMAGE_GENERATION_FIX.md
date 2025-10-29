# إصلاح مشكلة توليد صور الشاحنات بالذكاء الاصطناعي

## التاريخ
29 أكتوبر 2025

## المشكلة
كانت صور الذكاء الاصطناعي المولدة تظهر سيارات عادية بدلاً من شاحنات وقواطر ومعدات ثقيلة.

## التعديلات المطبقة

### 1. إضافة دالة `mapTruckTypeToEnglish`
تم إضافة دالة جديدة لتحويل أنواع الشاحنات العربية إلى مصطلحات إنجليزية محددة ودقيقة:

- **تريلا** → `semi-trailer truck 18-wheeler tractor-trailer`
- **دينا** → `medium duty box truck cargo truck`
- **سطحة** → `flatbed truck platform truck`
- **قلاب** → `dump truck tipper truck`
- **ثلاجة/مبرد** → `refrigerated truck reefer truck`
- **صهريج/تنكر** → `tanker truck fuel truck`
- **ونش/ونيت** → `tow truck wrecker truck`
- **قاطرة** → `tractor unit semi-truck cab`
- **مقطورة** → `trailer semi-trailer cargo trailer`
- **معدات ثقيلة** → `heavy equipment truck construction truck`

### 2. تحسين `generateTruckImagePrompt`
- استخدام الدالة الجديدة لتحويل نوع الشاحنة
- إضافة مصطلح "large commercial truck" للتأكيد
- إضافة negative prompts: `NOT a car, NOT a sedan, NOT a SUV, NOT a pickup`
- إضافة تأكيد نهائي: `must be a large truck or semi-trailer`
- تحسين القيمة الافتراضية إلى: `heavy duty commercial freight truck semi-trailer`

### 3. تحسين `generateFleetPromoteImagePrompt`
- تحديث جميع الـ compositions لتتضمن "heavy duty commercial trucks" و "semi-trailers"
- إضافة negative prompts: `NOT cars, NOT sedans, NOT SUVs`
- إضافة تأكيد نهائي: `must be large commercial trucks and semi-trailers`
- إضافة مصطلحات متخصصة: "freight transportation", "logistics industry"

### 4. تحسين البيئات والإضاءة
- إزالة بعض البيئات التي قد تسبب التباس (مثل "aerial view" التي قد تظهر سيارات صغيرة)
- التركيز على بيئات لوجستية ومهنية

## النتائج المتوقعة

بعد هذه التعديلات، يجب أن تظهر الصور المولدة:
- ✅ شاحنات ثقيلة وقواطر بشكل دقيق
- ✅ أنواع محددة من الشاحنات حسب التصنيف العربي
- ✅ معدات نقل ثقيلة احترافية
- ❌ لا سيارات عادية
- ❌ لا سيارات SUV أو سيدان

## الاختبار

للاختبار، يمكن:
1. إنشاء إعلان شاحنة فارغة جديد بواسطة الذكاء الاصطناعي
2. إنشاء منشور ترويجي للأسطول
3. التحقق من أن الصور المولدة تطابق نوع الشاحنة المحدد

## الملفات المعدلة
- `utils/imageGenerator.js`
