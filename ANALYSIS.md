# تحليل خوارزمية عرض المنشورات الحالية

## المشكلة الرئيسية

المستخدم يواجه مشكلة في عرض المنشورات في الصفحة الرئيسية حيث:

1. **المشكلة الأولى**: عند استخدام الخلط العشوائي، تظهر المنشورات ثم تختفي ثم تظهر منشورات جديدة، مما يسبب ارتباك في الواجهة الأمامية
2. **المشكلة الثانية**: عند الترتيب حسب التاريخ فقط (100%)، تظهر جميع منشورات المتابَعين في الصفحة الرئيسية
3. **الهدف المطلوب**: نظام مشابه لفيسبوك حيث تظهر منشورات المتابَعين بنسبة قليلة (15-20%) مع خلط منشورات من مستخدمين آخرين وإعلانات

## الكود الحالي (postRoutes.js - السطور 96-153)

```javascript
router.get('/', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select('following');
    const following = currentUser?.following || [];

    // Find all published posts
    const allPosts = await Post.find({ 
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
      hiddenFromHomeFeedFor: { $ne: req.user.id }
    })
      .sort({ createdAt: -1 })
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .lean();

    // Separate posts into two categories
    const followingPosts = [];
    const nonFollowingPosts = [];

    allPosts.forEach(post => {
      const isFollowing = following.some(id => id.toString() === post.user._id.toString());
      if (isFollowing) {
        followingPosts.push(post);
      } else {
        nonFollowingPosts.push(post);
      }
    });

    // Apply Facebook-style algorithm:
    // 10-15% from following, 85-90% from non-following
    const followingPercentage = 0.15; // 15% من المتابعين
    const totalPosts = Math.min(allPosts.length, 50); // حد أقصى 50 منشور
    const followingCount = Math.floor(totalPosts * followingPercentage);
    const nonFollowingCount = totalPosts - followingCount;

    // Select posts from following
    const selectedFollowingPosts = followingPosts.slice(0, followingCount);

    // Select posts from non-following
    const selectedNonFollowingPosts = nonFollowingPosts.slice(0, nonFollowingCount);

    // Merge posts (already sorted by createdAt from query)
    const finalPosts = [...selectedFollowingPosts, ...selectedNonFollowingPosts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(finalPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});
```

## تحليل المشاكل

### 1. مشكلة الترتيب النهائي
- الكود الحالي يقوم بفصل المنشورات إلى فئتين (متابَعين وغير متابَعين)
- ثم يأخذ نسبة 15% من المتابَعين و85% من غير المتابَعين
- **المشكلة**: الترتيب النهائي يعتمد على `createdAt` فقط، مما يعني أن المنشورات الأحدث من المتابَعين ستظهر دائماً في الأعلى
- **النتيجة**: إذا كان لديك 100 منشور من المتابَعين كلها حديثة، ستظهر جميعها في الأعلى قبل منشورات غير المتابَعين

### 2. عدم وجود خلط حقيقي
- الكود لا يقوم بخلط عشوائي للمنشورات
- يعتمد فقط على الترتيب الزمني
- **النتيجة**: نفس الترتيب في كل مرة يتم تحديث الصفحة

### 3. عدم دمج الإعلانات
- الكود الحالي يعرض فقط المنشورات (Posts)
- لا يتم دمج إعلانات الشحن (ShipmentAd) أو إعلانات الشاحنات الفارغة (EmptyTruckAd)
- **المطلوب**: دمج جميع أنواع المحتوى في feed واحد

### 4. مشكلة الـ Pagination
- الكود يحدد الحد الأقصى بـ 50 منشور
- لا يوجد دعم للـ pagination (صفحات)
- **النتيجة**: عند التمرير لأسفل وتحميل المزيد، قد تتغير المنشورات بسبب إعادة الحساب

## الحل المقترح

### 1. خوارزمية Facebook-Style Feed

```
1. جلب جميع المنشورات والإعلانات (Posts, ShipmentAds, EmptyTruckAds)
2. حساب نقاط (score) لكل منشور بناءً على:
   - التفاعلات (reactions, comments)
   - الوقت (recency)
   - العلاقة بالمستخدم (following/not following)
3. تطبيق نسبة 15-20% للمتابَعين
4. خلط المنشورات بطريقة ثابتة (seeded random) لتجنب التغيير عند التحديث
5. دعم pagination صحيح
```

### 2. نظام النقاط (Scoring System)

```javascript
score = (
  timeScore * 0.3 +           // الوقت (30%)
  engagementScore * 0.4 +     // التفاعلات (40%)
  relationshipScore * 0.3     // العلاقة (30%)
)

// إذا كان من المتابَعين، نضيف boost
if (isFollowing) {
  score *= 1.5
}
```

### 3. دمج الإعلانات

- إنشاء endpoint جديد `/api/v1/feed` يدمج:
  - Posts
  - ShipmentAds
  - EmptyTruckAds
- كل نوع يحصل على نقاط وفقاً للخوارزمية
- الترتيب النهائي حسب النقاط مع خلط خفيف

## الخطوات التالية

1. إنشاء خوارزمية حساب النقاط
2. إنشاء endpoint جديد للـ feed المدمج
3. تطبيق الخلط الثابت (seeded random)
4. إضافة دعم pagination
5. اختبار الحل
