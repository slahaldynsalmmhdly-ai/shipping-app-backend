# ميزة تبويب "الأصدقاء" في الشورتس

## نظرة عامة

تم إضافة ميزة جديدة في صفحة الشورتس لعرض فيديوهات المتابعين بنسب مختلفة حسب التبويب:
- **تبويب الأصدقاء**: 100% من فيديوهات المتابعين
- **التبويبات الأخرى** (لك، حراج، وظائف): 10% من المتابعين + 90% من غير المتابعين

---

## التحديثات في الواجهة الخلفية ✅

### 1. Endpoint جديد: Friends Tab

**المسار**: `GET /api/v1/posts/shorts/friends`

**الوصف**: يعرض فيديوهات المتابعين فقط (100%)

**المعاملات**:
- `page` (optional): رقم الصفحة (افتراضي: 1)
- `limit` (optional): عدد الفيديوهات (افتراضي: 20)

**الاستجابة**:
```json
{
  "posts": [...],
  "page": 1,
  "limit": 20,
  "total": 50,
  "hasMore": true
}
```

**الملف**: `routes/postRoutes.js` (السطر 1299-1362)

---

### 2. Endpoint محدث: For You Tab

**المسار**: `GET /api/v1/posts/shorts/for-you`

**التغيير**: تم تعديل نسبة المتابعين من 12% إلى **10%**

**الخوارزمية**:
```javascript
const followingPercentage = 0.10; // 10% من المتابعين
const totalPosts = Math.min(allVideoPosts.length, parseInt(limit));
const followingCount = Math.floor(totalPosts * followingPercentage);
const nonFollowingCount = totalPosts - followingCount;
```

**الملف**: `routes/postRoutes.js` (السطر 1205-1297)

---

### 3. Endpoint محدث: General Posts

**المسار**: `GET /api/v1/posts`

**التغييرات**:
1. إضافة معامل `isShort` لتصفية الفيديوهات
2. إضافة منطق خلط 10% من فيديوهات المتابعين

**الاستخدام**:
```
GET /api/v1/posts?isShort=true&category=حراج&limit=50
```

**المنطق**:
- إذا كان `isShort=true` وليس `category` محدد:
  - جلب فيديوهات من غير المتابعين
  - جلب فيديوهات من المتابعين
  - خلط 10% من المتابعين + 90% من غير المتابعين

**الكود**:
```javascript
if (isShort === 'true' && !category) {
  const currentUser = await User.findById(req.user.id).select('following');
  const following = currentUser?.following || [];
  
  if (following.length > 0) {
    // جلب فيديوهات المتابعين
    const followingVideos = await Post.find({
      $and: [
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { 'media.type': 'video' },
        { user: { $in: following } }
      ]
    })
      .populate('user', 'name avatar userType companyName')
      .populate('reactions.user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // حساب 10% من المتابعين
    const totalLimit = parseInt(limit) || 50;
    const followingCount = Math.floor(totalLimit * 0.10); // 10%
    const nonFollowingCount = totalLimit - followingCount;
    
    // اختيار عشوائي من فيديوهات المتابعين
    const selectedFollowing = followingVideos
      .sort(() => Math.random() - 0.5)
      .slice(0, followingCount);
    
    // اختيار من غير المتابعين
    const selectedNonFollowing = posts.slice(0, nonFollowingCount);
    
    // دمج وخلط
    posts = [...selectedFollowing, ...selectedNonFollowing]
      .sort(() => Math.random() - 0.5);
  }
}
```

**الملف**: `routes/postRoutes.js` (السطر 138-267)

---

## جدول توزيع الفيديوهات

| التبويب | Endpoint | فيديوهات المتابعين | فيديوهات غير المتابعين | ملاحظات |
|---------|----------|---------------------|------------------------|---------|
| **لك** | `/api/v1/posts/shorts/for-you` | 10% | 90% | اكتشاف محتوى جديد |
| **الأصدقاء** | `/api/v1/posts/shorts/friends` | 100% | 0% | فيديوهات المتابعين فقط |
| **حراج** | `/api/v1/posts?isShort=true&category=حراج` | 10% | 90% | خليط مع فلترة الفئة |
| **وظائف** | `/api/v1/posts?isShort=true&category=وظائف` | 10% | 90% | خليط مع فلترة الفئة |

---

## التحديثات المطلوبة في الواجهة الأمامية ⚠️

### الملف: `components/ShortsView.tsx`

#### 1. تحديث Types

**السطر 55**:
```typescript
initialCategory?: 'forYou' | 'friends' | 'haraj' | 'jobs';
```

**السطر 69**:
```typescript
const [activeTab, setActiveTab] = useState<'forYou' | 'friends' | 'haraj' | 'jobs'>(initialCategory);
```

#### 2. تحديث fetchShorts

**السطر 133-136**:
```typescript
let url = `${API_BASE_URL}/api/v1/posts/shorts/for-you`;
if (activeTab === 'friends') {
   url = `${API_BASE_URL}/api/v1/posts/shorts/friends`;
} else if (activeTab === 'haraj' || activeTab === 'jobs') {
   url = `${API_BASE_URL}/api/v1/posts?isShort=true&limit=50`;
}
```

#### 3. إضافة زر "الأصدقاء" في UI

**Import الأيقونة**:
```typescript
import { 
  Heart, MessageCircle, Share2, Music, UserPlus, Users, // ← أضف Users
  Download, Link, Repeat, Send, X,
  Play, Loader2, Flag, ArrowRight, ChevronDown, Trash2, Copy, Check, CheckCircle,
  Store, Briefcase, Camera
} from 'lucide-react';
```

**إضافة الزر**:
```tsx
<button
  onClick={() => setActiveTab('friends')}
  className={activeTab === 'friends' ? 'active' : ''}
>
  <Users />
  <span>{t('friends') || 'الأصدقاء'}</span>
</button>
```

---

## الاختبار

### سيناريو 1: تبويب الأصدقاء
1. افتح صفحة الشورتس
2. اضغط على تبويب "الأصدقاء"
3. **النتيجة المتوقعة**: تظهر فيديوهات المتابعين فقط

### سيناريو 2: تبويب لك
1. افتح صفحة الشورتس
2. اضغط على تبويب "لك"
3. **النتيجة المتوقعة**: تظهر خليط من الفيديوهات (10% متابعين + 90% غير متابعين)

### سيناريو 3: تبويب حراج
1. افتح صفحة الشورتس
2. اضغط على تبويب "حراج"
3. **النتيجة المتوقعة**: تظهر فيديوهات حراج فقط مع خليط (10% متابعين + 90% غير متابعين)

### سيناريو 4: تبويب وظائف
1. افتح صفحة الشورتس
2. اضغط على تبويب "وظائف"
3. **النتيجة المتوقعة**: تظهر فيديوهات وظائف فقط مع خليط (10% متابعين + 90% غير متابعين)

---

## الفوائد

1. **تجربة مستخدم أفضل**: المستخدمون يمكنهم رؤية فيديوهات أصدقائهم بسهولة
2. **اكتشاف محتوى جديد**: 90% من الفيديوهات في التبويبات الأخرى من غير المتابعين
3. **توازن**: 10% من فيديوهات المتابعين في كل التبويبات لضمان عدم فقدان محتوى الأصدقاء
4. **مرونة**: المستخدم يختار ما يريد رؤيته

---

## الملفات المعدلة

| الملف | التغييرات | الحالة |
|------|-----------|--------|
| `routes/postRoutes.js` | إضافة endpoint friends، تعديل for-you، إضافة منطق isShort | ✅ تم |
| `components/ShortsView.tsx` | إضافة تبويب الأصدقاء، تحديث types، تحديث fetchShorts | ⚠️ مطلوب |

---

## Commit Info

- **Commit**: `1663d43`
- **التاريخ**: ديسمبر 2025
- **المستودع**: https://github.com/slahaldynsalmmhdly-ai/shipping-app-backend
- **الفرع**: main

---

## ملاحظات

- ✅ الواجهة الخلفية جاهزة ومرفوعة على GitHub
- ⚠️ الواجهة الأمامية تحتاج تحديث (استخدم المطالبة المرفقة)
- ✅ النسبة 10% قابلة للتعديل في الكود إذا احتجت
- ✅ الخوارزمية تستخدم اختيار عشوائي لضمان تنوع المحتوى
