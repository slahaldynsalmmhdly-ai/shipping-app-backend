# تحليل مشكلة توليد الصور بواسطة الذكاء الاصطناعي

## المشكلة
عند نشر إعلانات بواسطة الذكاء الاصطناعي، تظهر صور سيارات عادية بدلاً من صور شاحنات وقواطر ومعدات ثقيلة.

## السبب الجذري

بعد مراجعة الكود في ملف `utils/imageGenerator.js`، تم تحديد المشكلة في السطر 80:

```javascript
const prompt = `${quality}, ${truckType || 'modern cargo truck'}, ${perspective}, ${environment}, ${lighting}, professional commercial photography, sharp focus, detailed, no people, no humans, clean and polished, automotive photography`;
```

### المشاكل المحددة:

1. **استخدام مصطلحات عامة باللغة الإنجليزية**: الـ prompt يستخدم مصطلحات عامة مثل "modern cargo truck" و "automotive photography" التي قد تولد صور سيارات عادية.

2. **عدم التحديد الدقيق لنوع المركبة**: عندما يكون `truckType` فارغاً أو غير محدد، يتم استخدام "modern cargo truck" كقيمة افتراضية، وهذا غير دقيق.

3. **عدم استخدام مصطلحات متخصصة**: لا يوجد تأكيد على أن الصورة يجب أن تكون لشاحنة ثقيلة أو قاطرة أو دينا وليس سيارة عادية.

4. **نفس المشكلة في `generateFleetPromoteImagePrompt`**: في السطر 120، نفس المشكلة موجودة مع عدم التحديد الدقيق.

## الحل المقترح

تحسين الـ prompts لتكون أكثر تحديداً ودقة:

1. **إضافة مصطلحات متخصصة**: استخدام مصطلحات مثل "heavy duty truck", "semi-trailer truck", "commercial freight truck", "18-wheeler" لضمان توليد صور شاحنات ثقيلة.

2. **استبعاد السيارات العادية**: إضافة negative prompts مثل "not a car, not a sedan, not a SUV" لمنع توليد صور سيارات.

3. **تحسين القيمة الافتراضية**: تغيير القيمة الافتراضية من "modern cargo truck" إلى مصطلحات أكثر تحديداً.

4. **إضافة سياق عربي**: إضافة مصطلحات عربية في الـ prompt لتحسين الدقة للسوق العربي.

5. **تحسين prompts الأسطول**: تحسين prompts الترويج للأسطول لتكون أكثر تحديداً.

## الملفات المتأثرة

- `utils/imageGenerator.js`: الملف الرئيسي الذي يحتاج إلى تعديل
