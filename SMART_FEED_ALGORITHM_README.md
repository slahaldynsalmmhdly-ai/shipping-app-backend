# خوارزمية توزيع المنشورات الذكية

## نظرة عامة

تم تصميم هذه الخوارزمية لتوزيع المنشورات بشكل ذكي على الصفحة الرئيسية (Home Feed) باستخدام **الذكاء الاصطناعي** في 80% من عملية التوصية، مع الاعتماد على قواعد أساسية بسيطة في 20% المتبقية لضمان استقرار النظام.

## المبادئ الأساسية

### 1. التوزيع التدريجي (Progressive Distribution)

كل منشور جديد يمر بمراحل متعددة من التوزيع:

- **مرحلة الاختبار (Testing)**: عرض المنشور على 50 مستخدم نشط
- **مرحلة التوسع (Expanding)**: إذا تجاوز معدل التفاعل 15%، يتم عرضه على 200 مستخدم
- **مرحلة الانتشار (Viral)**: إذا تجاوز معدل التفاعل 20%، يتم عرضه على 1000+ مستخدم
- **مرحلة التشبع (Saturated)**: وصل المنشور للحد الأقصى من المستخدمين

### 2. معدل التفاعل (Engagement Rate)

يتم حساب معدل التفاعل باستخدام المعادلة التالية:

```
معدل التفاعل = (الإعجابات + التعليقات×2 + المشاركات×3 + مشاهدات الفيديو الكاملة×1.5) / عدد المشاهدات
```

### 3. عتبات التفاعل (Engagement Thresholds)

- **15%**: الحد الأدنى للانتقال من الاختبار إلى التوسع
- **20%**: الحد الأدنى للانتقال من التوسع إلى الانتشار
- **10%**: الحد الأدنى لاستمرار النشر

### 4. استخدام الذكاء الاصطناعي (80%)

#### أ. استخراج الوسوم والفئات
يستخدم DeepSeek Chat لتحليل نص المنشور واستخراج:- الوسوم (Tags)
- الفئات (Categories)
- المواضيع (Topics)

#### ب. تحليل تفضيلات المستخدم
يقوم النظام بتحليل سجل تفاعلات المستخدم لتحديد:
- الاهتمامات (Interests)
- أنواع المحتوى المفضلة (Preferred Content Types)
- أنماط التفاعل (Engagement Patterns)

#### ج. حساب درجة التوافق
يستخدم DeepSeek AI لحساب درجة التوافق بين المنشور وتفضيلات المستخدم (0-100).

### 5. القواعد الأساسية (20%)

- **منشور واحد لكل حساب**: في التحميل الأول، يعرض منشور واحد فقط من كل مستخدم
- **حد أقصى 10 منشورات**: في كل تحميل للصفحة الرئيسية
- **عدم تكرار المنشورات**: لا يتم عرض نفس المنشور للمستخدمين الذين شاهدوه ولم يتفاعلوا معه خلال 7 أيام

## حساب نقاط المنشور

يتم حساب نقاط كل منشور بناءً على:

1. **نقاط التفاعل (20%)**: معدل التفاعل × 100 × 0.2
2. **نقاط الوقت (10%)**: المنشورات الأحدث تحصل على نقاط أعلى
3. **نقاط التوافق مع الذكاء الاصطناعي (50%)**: درجة التوافق × 0.5
4. **نقاط العلاقة (20%)**: إذا كان المستخدم يتابع صاحب المنشور

## الوظائف الرئيسية

### `applySmartFeedAlgorithm(posts, currentUser, userHistory)`
الوظيفة الرئيسية لتطبيق الخوارزمية الذكية على المنشورات.

**المدخلات:**
- `posts`: مصفوفة جميع المنشورات
- `currentUser`: المستخدم الحالي
- `userHistory`: سجل تفاعلات المستخدم (اختياري)

**المخرجات:**
- مصفوفة المنشورات المرتبة حسب الأولوية

### `calculateEngagementRate(post)`
حساب معدل التفاعل للمنشور.

### `extractTagsAndCategories(text)`
استخراج الوسوم والفئات باستخدام الذكاء الاصطناعي.

### `analyzeUserPreferences(user, userHistory)`
تحليل تفضيلات المستخدم بناءً على سجل تفاعلاته.

### `calculateAIMatchScore(post, userPreferences)`
حساب درجة التوافق بين المنشور وتفضيلات المستخدم.

### `recordImpression(postId, userId)`
تسجيل عرض المنشور للمستخدم.

### `recordInteraction(postId, userId, interactionType)`
تسجيل تفاعل المستخدم مع المنشور.

## التكامل مع النظام

### تحديث postRoutes.js

استبدل استيراد الخوارزميات القديمة:

```javascript
// القديم
const { applyFeedAlgorithm } = require('../utils/feedAlgorithm');
const { advancedDiversityAlgorithm } = require('../utils/advancedDiversity');

// الجديد
const { applySmartFeedAlgorithm, recordImpression } = require('../utils/smartFeedAlgorithm');
```

استبدل منطق الترتيب في endpoint الحصول على المنشورات:

```javascript
// القديم
const sortedPosts = applyFeedAlgorithm(filteredPosts, following, req.user.id, 0.10);
const finalPosts = advancedDiversityAlgorithm(sortedPosts, {...});

// الجديد
const finalPosts = await applySmartFeedAlgorithm(filteredPosts, currentUser, []);
```

### تحديث نموذج Post

أضف الحقول التالية إلى نموذج Post:

```javascript
{
  impressions: { type: Number, default: 0 },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  videoCompletions: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  tags: [String],
  categories: [String],
  topics: [String],
  distributionStage: { 
    type: String, 
    enum: ['testing', 'expanding', 'viral', 'saturated'],
    default: 'testing'
  }
}
```

### تحديث نموذج User

أضف حقل التفضيلات:

```javascript
{
  preferences: {
    interests: [String],
    preferredContentTypes: [String],
    engagementPatterns: String
  },
  lastActive: { type: Date, default: Date.now }
}
```

## مقاييس الأداء (KPIs)

يجب تتبع المقاييس التالية:

1. **معدل التفاعل الإجمالي**: متوسط معدل التفاعل لجميع المنشورات
2. **عدد المستخدمين النشطين**: المستخدمين الذين تفاعلوا خلال آخر 24 ساعة
3. **عدد المنشورات الموسعة**: المنشورات التي انتقلت من مرحلة لأخرى
4. **وقت التوسع**: متوسط الوقت اللازم للانتقال بين المراحل
5. **متوسط المشاهدات لكل منشور**: إجمالي المشاهدات / عدد المنشورات

## التحسينات المستقبلية

1. **تخزين مؤقت للتفضيلات**: حفظ تفضيلات المستخدمين في Redis لتحسين الأداء
2. **معالجة دفعية**: معالجة تحليل التفضيلات بشكل دفعي في الخلفية
3. **تعلم آلي متقدم**: استخدام نماذج تعلم آلي مخصصة بدلاً من GPT
4. **اختبار A/B**: اختبار نسخ مختلفة من الخوارزمية
5. **تحليلات متقدمة**: لوحة تحكم لمراقبة أداء الخوارزمية

## المتطلبات

- Node.js 14+
- MongoDB
- DeepSeek API Key (محمل في متغيرات البيئة)
- Redis (اختياري، للتخزين المؤقت)

## الاستخدام

```javascript
const { applySmartFeedAlgorithm } = require('./utils/smartFeedAlgorithm');

// في endpoint الحصول على المنشورات
const finalPosts = await applySmartFeedAlgorithm(
  allPosts,
  currentUser,
  userHistory
);
```

## الملاحظات المهمة

- الخوارزمية تستخدم DeepSeek API، لذا تأكد من وجود `DEEPSEEK_API_KEY` في متغيرات البيئة
- يُنصح بتخزين تفضيلات المستخدمين مسبقاً لتقليل عدد استدعاءات API
- يمكن تعديل العتبات والنسب حسب احتياجات التطبيق
- يجب مراقبة استهلاك API لتجنب التكاليف الزائدة

## الدعم

للمزيد من المعلومات أو الإبلاغ عن مشاكل، يرجى فتح issue في المستودع.
