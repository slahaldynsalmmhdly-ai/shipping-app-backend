# دليل تحليل الصور والتسعير الذكي

## نظرة عامة

تم إضافة ميزة تحليل الصور باستخدام الذكاء الاصطناعي لتحديد نوع الحمولة تلقائياً، مع نظام تسعير ذكي يعتمد على نوع الحمولة والمسافة والمعاملات الخاصة.

## المكونات الرئيسية

### 1. تحليل الصور (Image Analysis)

يستخدم نموذجين خفيفين من الذكاء الاصطناعي:

- **CLIP (OpenAI CLIP ViT-B/32)**: للتعرف على محتوى الصورة وتصنيفها
- **BLIP (Salesforce BLIP)**: لإنتاج وصف نصي تفصيلي للصورة

### 2. قاموس الحمولات

ملف JSON شامل يحتوي على أكثر من 1000 كلمة مفتاحية لـ 10 أنواع من الحمولات:

1. كراتين
2. رمل
3. حديد
4. أثاث
5. مواد غذائية
6. معدات نقل
7. مقطورة
8. أسمنت
9. شحن دولي
10. بضائع عامة

### 3. نظام التسعير الذكي

يحسب السعر بناءً على:
- نوع الحمولة
- المسافة (كم)
- فئة الوزن (خفيف، متوسط، ثقيل، ثقيل جداً)
- معاملات خاصة (هش، مبرد، خطر، كبير الحجم، سريع)
- خصومات تلقائية بناءً على المسافة

## API Endpoints

### 1. تحليل الصورة (رفع ملف)

```http
POST /api/v1/analyze-image
Content-Type: multipart/form-data

Body:
- image: [ملف الصورة]
```

**الاستجابة:**
```json
{
  "success": true,
  "cargo_type": "كراتين",
  "description": "a stack of cardboard boxes on a pallet",
  "clip_tags": ["cardboard boxes", "shipping container", "general cargo"],
  "confidence": 0.85,
  "cargo_info": {
    "type": "كراتين",
    "description": "صناديق كرتونية للتغليف والشحن",
    "base_price_factor": 1.0,
    "discount_eligible": true
  },
  "all_scores": { ... }
}
```

### 2. تحليل الصورة (Base64)

```http
POST /api/v1/analyze-image/base64
Content-Type: application/json

Body:
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### 3. حساب السعر

```http
POST /api/v1/pricing/calculate
Content-Type: application/json

Body:
{
  "cargoType": "كراتين",
  "distance": 250,
  "weightCategory": "medium",
  "isFragile": false,
  "isRefrigerated": false,
  "isHazardous": false,
  "isOversized": false,
  "isExpress": false
}
```

**الاستجابة:**
```json
{
  "success": true,
  "pricing": {
    "cargo_type": "كراتين",
    "distance": 250,
    "weight_category": "medium",
    "base_price": 1250.00,
    "cargo_factor": 1.0,
    "weight_multiplier": 1.3,
    "special_handling_factor": 1.0,
    "applied_special_handling": [],
    "subtotal": 1625.00,
    "discount_eligible": true,
    "discount_percentage": 10.00,
    "discount_amount": 162.50,
    "final_price": 1462.50,
    "currency": "ريال سعودي"
  },
  "discount_recommendations": {
    "eligible": true,
    "current_distance": 250,
    "recommendations": [
      {
        "threshold": 300,
        "discount": "15%",
        "additional_distance": 50
      },
      {
        "threshold": 500,
        "discount": "20%",
        "additional_distance": 250
      }
    ]
  }
}
```

### 4. توصيات الخصم

```http
GET /api/v1/pricing/recommendations/:cargoType/:distance
```

مثال:
```http
GET /api/v1/pricing/recommendations/كراتين/150
```

## استهلاك الذاكرة

النماذج المستخدمة خفيفة الوزن:
- **CLIP ViT-B/32**: ~350MB
- **BLIP base**: ~450MB
- **إجمالي الذاكرة المتوقعة**: أقل من 1GB عند التحميل الأول

تحسينات الأداء:
- النماذج تعمل على CPU فقط
- الصور المؤقتة تُحذف تلقائياً بعد التحليل
- لا يتم تخزين أي صور على الخادم

## قواعد التسعير

### السعر الأساسي
- 5 ريال سعودي لكل كيلومتر

### معاملات الوزن
- خفيف: 1.0x
- متوسط: 1.3x
- ثقيل: 1.8x
- ثقيل جداً: 2.5x

### معاملات المعالجة الخاصة
- هش: 1.2x
- مبرد: 1.5x
- خطر: 2.0x
- كبير الحجم: 1.8x
- سريع: 1.6x

### مستويات الخصم
- 50+ كم: 5%
- 150+ كم: 10%
- 300+ كم: 15%
- 500+ كم: 20%

**ملاحظة**: الخصومات متاحة فقط للحمولات المؤهلة (كراتين، أثاث، مواد غذائية، معدات نقل، بضائع عامة)

## التثبيت والإعداد

### المتطلبات

```bash
# تثبيت مكتبات Python
sudo pip3 install torch torchvision transformers pillow
```

### الملفات المضافة

```
shipping-app-backend/
├── data/
│   └── cargo_keywords.json          # قاموس الحمولات (1000+ كلمة)
├── scripts/
│   └── analyze_image.py             # سكريبت تحليل الصور
├── services/
│   ├── imageAnalysisService.js      # خدمة تحليل الصور
│   └── pricingService.js            # خدمة التسعير
├── routes/
│   ├── imageAnalysisRoutes.js       # مسارات تحليل الصور
│   └── pricingRoutes.js             # مسارات التسعير
└── temp/                            # مجلد مؤقت للصور (يُحذف تلقائياً)
```

## الأمان والخصوصية

- **لا يتم تخزين الصور**: جميع الصور تُحذف فوراً بعد التحليل
- **حد أقصى لحجم الصورة**: 10MB
- **أنواع الصور المدعومة**: JPEG, PNG, WebP
- **التحقق من النوع**: يتم التحقق من نوع الملف قبل المعالجة

## أمثلة الاستخدام

### مثال 1: تحليل صورة وحساب السعر

```javascript
// 1. رفع الصورة للتحليل
const formData = new FormData();
formData.append('image', imageFile);

const analysisResponse = await fetch('/api/v1/analyze-image', {
  method: 'POST',
  body: formData
});

const analysisData = await analysisResponse.json();

// 2. حساب السعر بناءً على النتيجة
const pricingResponse = await fetch('/api/v1/pricing/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cargoType: analysisData.cargo_type,
    distance: 200,
    weightCategory: 'medium'
  })
});

const pricingData = await pricingResponse.json();
console.log('السعر النهائي:', pricingData.pricing.final_price);
```

### مثال 2: استخدام Base64

```javascript
// تحويل الصورة إلى Base64
const reader = new FileReader();
reader.onloadend = async () => {
  const base64Image = reader.result;
  
  const response = await fetch('/api/v1/analyze-image/base64', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image })
  });
  
  const data = await response.json();
  console.log('نوع الحمولة:', data.cargo_type);
};
reader.readAsDataURL(imageFile);
```

## استكشاف الأخطاء

### خطأ: "فشل تحميل النماذج"
- تأكد من تثبيت المكتبات المطلوبة
- تحقق من اتصال الإنترنت (للتحميل الأول)

### خطأ: "استهلاك ذاكرة مرتفع"
- النماذج تُحمّل مرة واحدة عند أول استخدام
- استخدم مراقبة الذاكرة: `free -h`

### خطأ: "نوع الحمولة غير معروف"
- تحقق من تطابق الاسم مع الأنواع المعرفة في `cargo_keywords.json`

## الترخيص

هذه الميزة تستخدم نماذج مفتوحة المصدر:
- CLIP: MIT License
- BLIP: BSD-3-Clause License
