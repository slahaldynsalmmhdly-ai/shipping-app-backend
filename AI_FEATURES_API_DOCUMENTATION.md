# AI Features API Documentation

## Overview
هذا التوثيق يشرح واجهات برمجة التطبيقات (APIs) الخاصة بميزات الذكاء الاصطناعي في تطبيق الشحن.

## Base URL
```
https://your-api-domain.com/api/v1/ai-features
```

## Authentication
جميع الطلبات تتطلب رمز JWT في رأس التفويض:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get AI Features Settings
**الحصول على إعدادات ميزات الذكاء الاصطناعي للمستخدم**

**Endpoint:** `GET /settings`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "aiFeatures": {
    "autoPosting": false,
    "autoMessaging": false,
    "fleetPromotion": false,
    "weeklyReports": false
  }
}
```

**Response (Error - 404):**
```json
{
  "message": "المستخدم غير موجود"
}
```

---

### 2. Update AI Features Settings
**تحديث إعدادات ميزات الذكاء الاصطناعي**

**Endpoint:** `PUT /settings`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "autoPosting": true,
  "autoMessaging": false,
  "fleetPromotion": true,
  "weeklyReports": true
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تحديث إعدادات الذكاء الاصطناعي بنجاح",
  "aiFeatures": {
    "autoPosting": true,
    "autoMessaging": false,
    "fleetPromotion": true,
    "weeklyReports": true
  }
}
```

**Response (Error - 403):**
```json
{
  "message": "ميزات الذكاء الاصطناعي متاحة للشركات فقط"
}
```

**Notes:**
- هذه الميزات متاحة فقط للمستخدمين من نوع "company"
- يمكن تحديث أي حقل أو جميع الحقول في طلب واحد

---

### 3. Get Weekly Reports
**الحصول على التقارير الأسبوعية**

**Endpoint:** `GET /weekly-reports`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "reports": [
    {
      "_id": "report_id",
      "userId": "user_id",
      "reportDate": "2025-10-26T10:00:00.000Z",
      "weekStart": "2025-10-19T00:00:00.000Z",
      "weekEnd": "2025-10-26T00:00:00.000Z",
      "cityDemand": [
        {
          "city": "الرياض",
          "demandLevel": "high",
          "shipmentCount": 15,
          "averagePrice": 5000
        },
        {
          "city": "جدة",
          "demandLevel": "medium",
          "shipmentCount": 8,
          "averagePrice": 4500
        }
      ],
      "insights": "تحليل الاتجاهات والتوصيات...",
      "recommendations": [
        "ركز على المدن ذات الطلب العالي: الرياض، جدة",
        "متوسط عدد الشحنات الأسبوعية: 23 شحنة يومياً"
      ],
      "read": false,
      "createdAt": "2025-10-26T10:00:00.000Z",
      "updatedAt": "2025-10-26T10:00:00.000Z"
    }
  ]
}
```

**Notes:**
- يتم إرجاع آخر 10 تقارير فقط
- التقارير مرتبة حسب التاريخ (الأحدث أولاً)

---

### 4. Mark Weekly Report as Read
**تحديد التقرير الأسبوعي كمقروء**

**Endpoint:** `PUT /weekly-reports/:reportId/read`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "تم تحديث حالة التقرير"
}
```

**Response (Error - 404):**
```json
{
  "message": "التقرير غير موجود"
}
```

---

## AI Features Description

### 1. Auto Posting (النشر التلقائي)
- **الوصف:** يقوم الذكاء الاصطناعي بإنشاء منشورات تلقائياً للشاحنات الفارغة المتاحة
- **المتطلبات:** 
  - يجب أن يكون لدى المستخدم شاحنات متاحة في الأسطول
  - حالة الشاحنة يجب أن تكون "متاح"
- **التنفيذ:** يتم إنشاء منشور باستخدام DeepSeek AI يحتوي على معلومات الشاحنة

### 2. Auto Messaging (المراسلة التلقائية)
- **الوصف:** يقوم الذكاء الاصطناعي بإرسال رسائل تلقائية لأصحاب إعلانات الشحن
- **المتطلبات:**
  - يجب أن يكون لدى المستخدم شاحنات متاحة
  - وجود إعلانات شحن نشطة في النظام
- **التنفيذ:** يتم إنشاء رسالة مخصصة باستخدام DeepSeek AI وإرسالها للعملاء المحتملين

### 3. Fleet Promotion (الترويج للأسطول)
- **الوصف:** يقوم الذكاء الاصطناعي بإنشاء منشورات ترويجية للأسطول
- **المتطلبات:**
  - يجب أن يكون لدى المستخدم أسطول مسجل
- **التنفيذ:** يتم إنشاء منشور ترويجي جذاب باستخدام DeepSeek AI مع صور الأسطول

### 4. Weekly Reports (التقارير الأسبوعية)
- **الوصف:** يقوم الذكاء الاصطناعي بإنشاء تقارير أسبوعية عن الطلب على الشحن في المدن المختلفة
- **المتطلبات:** لا توجد متطلبات خاصة
- **التنفيذ:** يتم تحليل بيانات الشحنات الأسبوعية وإنشاء تقرير مفصل باستخدام DeepSeek AI

---

## Database Models

### User Model (تحديث)
تم إضافة حقل `aiFeatures` إلى نموذج المستخدم:

```javascript
aiFeatures: {
  autoPosting: {
    type: Boolean,
    default: false,
  },
  autoMessaging: {
    type: Boolean,
    default: false,
  },
  fleetPromotion: {
    type: Boolean,
    default: false,
  },
  weeklyReports: {
    type: Boolean,
    default: false,
  },
}
```

### WeeklyReport Model (جديد)
نموذج جديد لحفظ التقارير الأسبوعية:

```javascript
{
  userId: ObjectId,
  reportDate: Date,
  weekStart: Date,
  weekEnd: Date,
  cityDemand: [
    {
      city: String,
      demandLevel: String, // 'low', 'medium', 'high', 'very_high'
      shipmentCount: Number,
      averagePrice: Number,
    }
  ],
  insights: String,
  recommendations: [String],
  read: Boolean,
  timestamps: true
}
```

### Post Model (تحديث)
تم إضافة حقول AI إلى نموذج المنشورات:

```javascript
generatedByAI: {
  type: Boolean,
  default: false,
},
aiFeatureType: {
  type: String,
  enum: ['auto_posting', 'fleet_promotion', null],
  default: null,
}
```

### Message Model (تحديث)
تم إضافة حقل AI إلى نموذج الرسائل:

```javascript
generatedByAI: {
  type: Boolean,
  default: false,
}
```

---

## Environment Variables

يجب إضافة متغير البيئة التالي في ملف `.env`:

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

للحصول على مفتاح API من DeepSeek، قم بزيارة: https://platform.deepseek.com/

---

## Error Handling

جميع الأخطاء يتم إرجاعها بالتنسيق التالي:

```json
{
  "message": "رسالة الخطأ باللغة العربية",
  "error": "تفاصيل الخطأ التقنية (في بيئة التطوير فقط)"
}
```

**أكواد الحالة الشائعة:**
- `200` - نجاح العملية
- `400` - طلب غير صحيح
- `401` - غير مصرح
- `403` - ممنوع (مثل: المستخدم ليس شركة)
- `404` - غير موجود
- `500` - خطأ في الخادم

---

## Usage Examples

### Example 1: تفعيل النشر التلقائي

```javascript
const token = localStorage.getItem('token');

const response = await fetch('https://api.example.com/api/v1/ai-features/settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    autoPosting: true
  })
});

const data = await response.json();
console.log(data);
```

### Example 2: الحصول على التقارير الأسبوعية

```javascript
const token = localStorage.getItem('token');

const response = await fetch('https://api.example.com/api/v1/ai-features/weekly-reports', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.reports);
```

---

## Notes

1. **الأمان:** جميع الطلبات تتطلب مصادقة JWT صالحة
2. **الصلاحيات:** ميزات الذكاء الاصطناعي متاحة فقط للمستخدمين من نوع "company"
3. **معدل الطلبات:** لا يوجد حد لمعدل الطلبات حالياً، لكن يُنصح بعدم الإفراط في الاستخدام
4. **تكلفة API:** استخدام DeepSeek API قد يكون له تكلفة، تأكد من مراقبة الاستخدام
5. **التنفيذ التلقائي:** يمكن إعداد مهام مجدولة (cron jobs) لتنفيذ ميزات الذكاء الاصطناعي بشكل دوري

---

## Future Improvements

- إضافة إحصائيات استخدام ميزات الذكاء الاصطناعي
- إضافة خيارات تخصيص لكل ميزة
- إضافة إشعارات عند إنشاء تقارير جديدة
- إضافة واجهة لعرض المنشورات والرسائل المُنشأة بواسطة الذكاء الاصطناعي
- إضافة تحليلات متقدمة للتقارير الأسبوعية

