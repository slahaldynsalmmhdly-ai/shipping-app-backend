# إعداد توليد الصور بالذكاء الاصطناعي

## المتطلبات

### 1. الحصول على Hugging Face API Token

1. اذهب إلى https://huggingface.co/
2. سجل الدخول أو أنشئ حساب جديد (مجاني)
3. اذهب إلى Settings → Access Tokens
4. اضغط "Create new token"
5. اختر "Read" permissions
6. انسخ الـ Token

### 2. إضافة الـ Token إلى Render

1. اذهب إلى Render Dashboard
2. اختر مشروع `shipping-app-backend`
3. اذهب إلى **Environment** من القائمة اليسرى
4. اضغط **"Add Environment Variable"**
5. أضف:
   - **Key:** `HUGGINGFACE_API_TOKEN`
   - **Value:** (الصق الـ Token الذي نسخته)
6. احفظ التغييرات

### 3. إعادة نشر التطبيق

بعد إضافة الـ Token، Render سيعيد نشر التطبيق تلقائياً.

---

## كيف يعمل

### 1. الترويج للأسطول (Fleet Promotion)

عندما يعمل الـ AI Scheduler:
1. ✅ DeepSeek يكتب النص الترويجي
2. ✅ يُنشئ مطالبة خرافية لتوليد صورة أسطول
3. ✅ Stable Diffusion يولد صورة واقعية للشاحنات
4. ✅ ينشر المنشور مع الصورة المولدة

**مثال على المطالبات المتنوعة:**
- "ultra realistic, lineup of modern cargo trucks, front three-quarter view, on a modern highway at golden hour..."
- "professional corporate photography, fleet of trucks parked in organized rows, aerial drone photography..."
- "cinematic wide angle shot, convoy of trucks on highway, during golden hour with warm lighting..."

### 2. النشر التلقائي للشاحنات الفارغة (Auto Posting)

عندما يعمل الـ AI Scheduler:
1. ✅ DeepSeek يكتب وصف الشاحنة
2. ✅ يُنشئ مطالبة لتوليد صورة الشاحنة
3. ✅ Stable Diffusion يولد صورة واقعية
4. ✅ ينشر المنشور مع الصورة

**مثال على المطالبات المتنوعة:**
- "ultra realistic, modern cargo truck, side profile view, in an industrial logistics center..."
- "professional photography, truck, low angle dramatic view, on a desert road at sunset..."
- "high detail 8K resolution, cargo truck, aerial view from above, at a truck stop during blue hour..."

---

## التنويع في الصور

### كل يوم صور مختلفة!

**الزوايا (Perspectives):**
- Front three-quarter view
- Side profile view
- Rear three-quarter view
- Aerial view from above
- Low angle dramatic view

**البيئات (Environments):**
- Modern highway at golden hour
- Industrial logistics center
- Desert road at sunset
- Busy city street
- Mountain road with scenic background
- Truck stop during blue hour
- Coastal highway with ocean view

**الإضاءة (Lighting):**
- Dramatic golden hour lighting
- Bright daylight with clear sky
- Soft morning light
- Sunset warm glow
- Professional studio lighting
- Natural overcast lighting

---

## الحماية من البشر

**Negative Prompt:**
```
people, humans, faces, person, man, woman, child, body, hands, fingers, text, watermark, blurry, low quality
```

هذا يضمن عدم ظهور أي بشر في الصور المولدة!

---

## Fallback (الاحتياطي)

إذا فشل توليد الصورة بالـ AI:
- ✅ يستخدم الصور المخزنة في الشركة (الاحتياطي)
- ✅ لا يتوقف النشر
- ✅ يسجل الخطأ في logs

---

## التكلفة

**Hugging Face Inference API:**
- ✅ **مجاني تماماً** للاستخدام المعقول
- ✅ حد معين من الطلبات شهرياً (كافي للاستخدام العادي)
- ✅ إذا تجاوزت الحد، يمكنك الترقية أو استخدام الاحتياطي

---

## اختبار الميزة

### 1. تأكد من إضافة الـ Token
```bash
# في Render Environment Variables
HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
```

### 2. راقب الـ Logs
في Render Dashboard → Logs، ابحث عن:
```
🎨 Generating AI image for fleet promotion...
📝 Image prompt: ultra realistic, lineup of modern cargo trucks...
✅ Image generated successfully
💾 Image saved to: /path/to/image.png
✅ AI-generated image added to post
```

### 3. إذا فشل
ابحث عن:
```
❌ Error generating image: ...
⚠️ Failed to generate AI image, falling back to stored images
```

---

## ملاحظات مهمة

1. **الصور تُحفظ محلياً** في `/uploads/ai-generated/`
2. **يمكن رفعها لـ Cloud** (S3, Cloudinary) لاحقاً
3. **كل صورة فريدة** - لا تكرار
4. **جودة عالية** - 1024x768 pixels
5. **واقعية 100%** - Stable Diffusion 3.5

---

**الميزة جاهزة! فقط أضف الـ Token وستعمل تلقائياً! 🎉**

