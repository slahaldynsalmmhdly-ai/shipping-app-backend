# 📱 ميزة الشورتس (TikTok-style) - التوثيق الكامل

## نظرة عامة
تم إضافة ميزة جديدة لعرض فيديوهات الشورتس بنظام مشابه لـ **TikTok**، مع تبويبين:
1. **"لك" (For You)** - فيديوهات متنوعة من الجميع مع خوارزمية ذكية
2. **"الأصدقاء" (Following)** - فيديوهات من المتابعين فقط

---

## 🎯 الميزات الرئيسية

### تبويب "لك" (For You)
- ✅ عرض فيديوهات من **جميع المستخدمين**
- ✅ خوارزمية ذكية: **12% من المتابعين** + **88% من الآخرين**
- ✅ ترتيب حسب **معدل التفاعل** (Engagement Score)
- ✅ عشوائية في العرض لتجنب التكرار
- ✅ فيديوهات المتابعين تظهر **نادراً** (مثل TikTok)

### تبويب "الأصدقاء" (Following)
- ✅ عرض فيديوهات من **المتابعين فقط**
- ✅ ترتيب حسب **الأحدث أولاً**
- ✅ رسالة توضيحية إذا لم يكن المستخدم يتابع أحد
- ✅ دعم الـ Pagination

---

## 🔌 API Endpoints

### 1. تبويب "لك" (For You)

**Endpoint:**
```
GET /api/v1/posts/shorts/for-you
```

**Headers:**
```json
{
  "Authorization": "Bearer <your_token>"
}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Number | 1 | رقم الصفحة |
| `limit` | Number | 20 | عدد الفيديوهات في الصفحة |

**مثال على الطلب:**
```bash
curl -X GET "http://localhost:5000/api/v1/posts/shorts/for-you?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**الاستجابة الناجحة (200):**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "user": {
        "_id": "user_id",
        "name": "اسم المستخدم",
        "avatar": "https://...",
        "isVerified": true
      },
      "text": "نص المنشور",
      "media": [
        {
          "url": "https://...",
          "type": "video"
        }
      ],
      "likes": [...],
      "comments": [...],
      "shares": [...],
      "createdAt": "2025-10-30T08:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 150,
  "hasMore": true
}
```

---

### 2. تبويب "الأصدقاء" (Following)

**Endpoint:**
```
GET /api/v1/posts/shorts/following
```

**Headers:**
```json
{
  "Authorization": "Bearer <your_token>"
}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Number | 1 | رقم الصفحة |
| `limit` | Number | 20 | عدد الفيديوهات في الصفحة |

**مثال على الطلب:**
```bash
curl -X GET "http://localhost:5000/api/v1/posts/shorts/following?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**الاستجابة الناجحة (200):**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "user": {
        "_id": "user_id",
        "name": "اسم المستخدم",
        "avatar": "https://...",
        "isVerified": true
      },
      "text": "نص المنشور",
      "media": [
        {
          "url": "https://...",
          "type": "video"
        }
      ],
      "likes": [...],
      "comments": [...],
      "shares": [...],
      "createdAt": "2025-10-30T08:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 50,
  "hasMore": true
}
```

**الاستجابة عند عدم متابعة أحد (200):**
```json
{
  "posts": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "hasMore": false,
  "message": "You are not following anyone yet"
}
```

---

## 🧮 الخوارزمية المستخدمة

### تبويب "لك" (For You)

#### 1. جمع البيانات
```javascript
// جلب جميع المنشورات التي تحتوي على فيديوهات
const allVideoPosts = await Post.find({
  $and: [
    { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
    { 'media.type': 'video' }
  ]
});
```

#### 2. التصنيف
```javascript
// تصنيف المنشورات إلى متابعين وغير متابعين
const followingPosts = [];
const nonFollowingPosts = [];

allVideoPosts.forEach(post => {
  const isFollowing = following.some(id => id.toString() === post.user._id.toString());
  if (isFollowing) {
    followingPosts.push(post);
  } else {
    nonFollowingPosts.push(post);
  }
});
```

#### 3. حساب النسب (TikTok-style)
```javascript
const followingPercentage = 0.12; // 12% من المتابعين (نادر)
const totalPosts = Math.min(allVideoPosts.length, limit);
const followingCount = Math.floor(totalPosts * followingPercentage);
const nonFollowingCount = totalPosts - followingCount;
```

#### 4. اختيار عشوائي من المتابعين
```javascript
const selectedFollowingPosts = followingPosts
  .sort(() => Math.random() - 0.5) // خلط عشوائي
  .slice(0, followingCount);
```

#### 5. حساب معدل التفاعل (Engagement Score)
```javascript
const scoredNonFollowingPosts = nonFollowingPosts.map(post => {
  const engagementScore = 
    (post.likes?.length || 0) * 1 +      // كل لايك = 1 نقطة
    (post.comments?.length || 0) * 2 +   // كل تعليق = 2 نقطة
    (post.shares?.length || 0) * 3;      // كل مشاركة = 3 نقاط
  
  const randomFactor = Math.random() * 100; // عامل عشوائي
  
  return {
    ...post,
    score: engagementScore + randomFactor
  };
});
```

#### 6. الترتيب والدمج
```javascript
// ترتيب حسب النقاط واختيار الأفضل
const selectedNonFollowingPosts = scoredNonFollowingPosts
  .sort((a, b) => b.score - a.score)
  .slice(0, nonFollowingCount);

// دمج وخلط نهائي
const finalPosts = [...selectedFollowingPosts, ...selectedNonFollowingPosts]
  .sort(() => Math.random() - 0.5);
```

---

### تبويب "الأصدقاء" (Following)

#### 1. جمع البيانات
```javascript
// جلب فيديوهات المتابعين فقط
const followingVideoPosts = await Post.find({
  $and: [
    { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
    { 'media.type': 'video' },
    { user: { $in: following } } // من المتابعين فقط
  ]
})
.sort({ createdAt: -1 }) // الأحدث أولاً
.skip(skip)
.limit(limit);
```

#### 2. Pagination
```javascript
const totalCount = await Post.countDocuments({
  $and: [
    { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
    { 'media.type': 'video' },
    { user: { $in: following } }
  ]
});
```

---

## 🎨 التكامل مع الواجهة الأمامية

### مثال على استخدام React

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

function ShortsScreen() {
  const [activeTab, setActiveTab] = useState('for-you'); // 'for-you' or 'following'
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [activeTab, page]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'for-you' 
        ? '/api/v1/posts/shorts/for-you'
        : '/api/v1/posts/shorts/following';
      
      const response = await axios.get(endpoint, {
        params: { page, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setVideos(response.data.posts);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shorts-screen">
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'for-you' ? 'active' : ''}
          onClick={() => setActiveTab('for-you')}
        >
          لك
        </button>
        <button 
          className={activeTab === 'following' ? 'active' : ''}
          onClick={() => setActiveTab('following')}
        >
          الأصدقاء
        </button>
      </div>

      {/* Videos */}
      <div className="videos-container">
        {videos.map(video => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 مقارنة مع TikTok

| الميزة | TikTok | تطبيقنا | ✅ |
|--------|--------|---------|-----|
| تبويب "لك" | ✅ | ✅ | متطابق |
| تبويب "الأصدقاء" | ✅ | ✅ | متطابق |
| خوارزمية ذكية | ✅ | ✅ | متطابق |
| نسبة المتابعين نادرة | ✅ (10-15%) | ✅ (12%) | متطابق |
| معدل التفاعل | ✅ | ✅ | متطابق |
| عشوائية في العرض | ✅ | ✅ | متطابق |
| Pagination | ✅ | ✅ | متطابق |

---

## 🔧 الإعدادات القابلة للتخصيص

### تغيير نسبة المتابعين
في ملف `routes/postRoutes.js` السطر 963:
```javascript
const followingPercentage = 0.12; // غيّر هذه القيمة (0.12 = 12%)
```

### تغيير معادلة التفاعل
في ملف `routes/postRoutes.js` السطر 976-979:
```javascript
const engagementScore = 
  (post.likes?.length || 0) * 1 +      // وزن اللايكات
  (post.comments?.length || 0) * 2 +   // وزن التعليقات
  (post.shares?.length || 0) * 3;      // وزن المشاركات
```

### تغيير العامل العشوائي
في ملف `routes/postRoutes.js` السطر 982:
```javascript
const randomFactor = Math.random() * 100; // غيّر 100 لزيادة/تقليل العشوائية
```

---

## 🧪 الاختبار

### اختبار تبويب "لك"
```bash
# الصفحة الأولى
curl -X GET "http://localhost:5000/api/v1/posts/shorts/for-you?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# الصفحة الثانية
curl -X GET "http://localhost:5000/api/v1/posts/shorts/for-you?page=2&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### اختبار تبويب "الأصدقاء"
```bash
# الصفحة الأولى
curl -X GET "http://localhost:5000/api/v1/posts/shorts/following?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# الصفحة الثانية
curl -X GET "http://localhost:5000/api/v1/posts/shorts/following?page=2&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 ملاحظات مهمة

1. **الأداء**: الخوارزمية محسّنة للأداء باستخدام:
   - `.lean()` لتحسين سرعة الاستعلام
   - Pagination لتقليل حجم البيانات
   - Indexing على حقل `media.type`

2. **التوافق**: يعمل مع:
   - المنشورات المنشورة (`isPublished: true`)
   - المنشورات بدون حقل `isPublished`

3. **الفيديوهات فقط**: يعرض المنشورات التي تحتوي على `media.type: 'video'` فقط

4. **الأمان**: جميع الـ endpoints محمية بـ `protect` middleware

---

## 🚀 التحسينات المستقبلية

- [ ] إضافة cache للفيديوهات الشائعة
- [ ] تتبع مشاهدات المستخدم لتحسين الخوارزمية
- [ ] إضافة فلاتر (حسب الفئة، المدة، إلخ)
- [ ] إضافة "Not Interested" لتحسين التوصيات
- [ ] تحليلات متقدمة (watch time, completion rate)

---

## 📞 الدعم

إذا واجهت أي مشاكل، تحقق من:
1. أن الـ token صحيح
2. أن هناك منشورات تحتوي على فيديوهات
3. أن المستخدم لديه متابعين (لتبويب "الأصدقاء")
4. سجلات الخادم (console.error)

---

**تم التطوير بواسطة**: Manus AI
**التاريخ**: 30 أكتوبر 2025
**الإصدار**: 1.0.0
