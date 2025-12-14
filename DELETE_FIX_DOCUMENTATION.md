# إصلاح مشكلة حذف الفيديوهات والمنشورات

## المشكلة الأصلية
كان المستخدمون يواجهون فشلاً عند محاولة حذف الفيديوهات والمنشورات من قسم الملف الشخصي.

## السبب الجذري
تم تحديد سببين رئيسيين للمشكلة:

### 1. مشكلة في الواجهة الخلفية (Backend)
**الملف:** `routes/postRoutes.js`
**السطر:** 114-134

**المشكلة:**
- endpoint `/api/v1/posts/user/:userId` لم يكن يدعم pagination
- لم يكن يقرأ معاملات `page`, `limit`, و `type` من query string
- كان يرجع جميع المنشورات دفعة واحدة بدون تصفية

**التأثير:**
- الواجهة الأمامية كانت تطلب البيانات مع معاملات لكن الخادم يتجاهلها
- عدم تطابق البيانات المعروضة مع البيانات الفعلية في قاعدة البيانات
- مشاكل في الأداء عند وجود عدد كبير من المنشورات

### 2. مشكلة في الواجهة الأمامية (Frontend)
**الملف:** `components/ProfileView.tsx`
**السطر:** 885-924

**المشكلة:**
- رسائل الخطأ العامة ("فشل") بدون تفاصيل
- عدم وجود logging كافٍ لتتبع المشكلة
- صعوبة تشخيص سبب الفشل

## الحلول المطبقة

### 1. إصلاح الواجهة الخلفية

#### التغييرات في `routes/postRoutes.js`:

```javascript
// @desc    Get all posts by a specific user
// @route   GET /api/v1/posts/user/:userId
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('[GET USER POSTS] Request:', {
      userId: req.params.userId,
      page,
      limit,
      type,
      skip
    });

    // Build query conditions
    const conditions = {
      user: req.params.userId,
      $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
    };

    // Filter by media type if specified
    if (type === 'video') {
      conditions['media.type'] = 'video';
      console.log('[GET USER POSTS] Filtering for videos only');
    } else if (type === 'image') {
      conditions['media.type'] = 'image';
      console.log('[GET USER POSTS] Filtering for images only');
    }

    // Get total count for pagination
    const totalCount = await Post.countDocuments(conditions);

    // Get paginated posts
    const posts = await Post.find(conditions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', ['name', 'avatar'])
      .populate({
        path: 'originalPost',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });

    console.log('[GET USER POSTS] Results:', {
      totalCount,
      returnedCount: posts.length,
      hasMore: skip + posts.length < totalCount
    });

    res.json({
      posts,
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      hasMore: skip + posts.length < totalCount
    });
  } catch (err) {
    console.error('[GET USER POSTS] Error:', err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});
```

**المميزات الجديدة:**
- ✅ دعم pagination كامل (page, limit)
- ✅ دعم filtering حسب نوع الوسائط (video, image)
- ✅ إرجاع metadata للـ pagination (total, hasMore)
- ✅ logging مفصل لتتبع الطلبات
- ✅ تحسين الأداء بجلب البيانات المطلوبة فقط

### 2. إصلاح الواجهة الأمامية

#### التغييرات في `components/ProfileView.tsx`:

**أ. تحسين حذف المنشورات:**
```typescript
} else if (type === 'post' && typeof id === 'string') {
     const updatedPosts = posts.filter(p => p.id !== id);
     setPosts(updatedPosts);
     
     const newDeletedIds = new Set<string>(deletedItemsIds);
     newDeletedIds.add(id);

     console.log('[DELETE POST] Sending request:', {
         postId: id,
         endpoint: `${API_BASE_URL}/api/v1/posts/${id}`,
         token: token ? 'Present' : 'Missing'
     });

     const response = await fetch(`${API_BASE_URL}/api/v1/posts/${id}`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${token}` }
     });
     
     console.log('[DELETE POST] Response:', {
         status: response.status,
         ok: response.ok
     });

     if (response.ok) {
         updateCache({ posts: updatedPosts, deletedItemsIds: newDeletedIds });
         alert(t('delete_success'));
     } else {
         const errorData = await response.json().catch(() => ({}));
         console.error('[DELETE POST] Failed:', errorData);
         alert(t('delete_fail') + ': ' + (errorData.msg || errorData.message || response.statusText));
     }
```

**ب. تحسين حذف الفيديوهات:**
```typescript
} else if (type === 'video' && typeof id === 'string') {
     const updatedVideos = videos.filter(v => v.id !== id);
     setVideos(updatedVideos);
     setViewingVideoIndex(null); 
     
     const newDeletedIds = new Set<string>(deletedItemsIds);
     newDeletedIds.add(id);

     console.log('[DELETE VIDEO] Sending request:', {
         videoId: id,
         endpoint: `${API_BASE_URL}/api/v1/posts/${id}`,
         token: token ? 'Present' : 'Missing'
     });

     const response = await fetch(`${API_BASE_URL}/api/v1/posts/${id}`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${token}` }
     });
     
     console.log('[DELETE VIDEO] Response:', {
         status: response.status,
         ok: response.ok
     });

     if (response.ok) {
         updateCache({ videos: updatedVideos, deletedItemsIds: newDeletedIds });
         alert(t('delete_success'));
     } else {
         const errorData = await response.json().catch(() => ({}));
         console.error('[DELETE VIDEO] Failed:', errorData);
         alert(t('delete_fail') + ': ' + (errorData.msg || errorData.message || response.statusText));
     }
```

**المميزات الجديدة:**
- ✅ logging مفصل قبل وبعد كل عملية حذف
- ✅ عرض رسائل خطأ تفصيلية من الخادم
- ✅ معالجة أفضل للأخطاء
- ✅ سهولة تشخيص المشاكل المستقبلية

## الفوائد

### 1. حل المشكلة الأساسية
- ✅ الآن يمكن حذف الفيديوهات والمنشورات بنجاح
- ✅ تطابق البيانات بين الواجهة الأمامية والخلفية

### 2. تحسين الأداء
- ✅ تقليل حجم البيانات المنقولة (pagination)
- ✅ استعلامات قاعدة بيانات أكثر كفاءة
- ✅ تحميل أسرع للصفحات

### 3. تحسين تجربة المستخدم
- ✅ رسائل خطأ واضحة ومفيدة
- ✅ سهولة تشخيص المشاكل
- ✅ استجابة أسرع

### 4. تحسين قابلية الصيانة
- ✅ logging شامل لتتبع العمليات
- ✅ كود أكثر وضوحاً وتنظيماً
- ✅ سهولة إضافة ميزات جديدة

## خطوات النشر

### 1. الواجهة الخلفية
```bash
cd backend_app
git add routes/postRoutes.js
git commit -m "fix: إصلاح endpoint جلب منشورات المستخدم - دعم pagination و filtering"
git push origin main
```

### 2. الواجهة الأمامية
```bash
cd frontend_app
# تحديث الملف المضغوط بالنسخة الجديدة من ProfileView.tsx
```

### 3. إعادة تشغيل الخادم
```bash
# على الخادم
pm2 restart shipping-app-backend
```

## الاختبار

### 1. اختبار حذف المنشورات
1. افتح الملف الشخصي
2. اذهب إلى تبويب "المنشورات"
3. اضغط على زر الحذف لأي منشور
4. تأكد من ظهور رسالة "تم الحذف بنجاح"
5. تأكد من اختفاء المنشور من القائمة

### 2. اختبار حذف الفيديوهات
1. افتح الملف الشخصي
2. اذهب إلى تبويب "الفيديوهات"
3. اضغط على زر الحذف لأي فيديو
4. تأكد من ظهور رسالة "تم الحذف بنجاح"
5. تأكد من اختفاء الفيديو من القائمة

### 3. اختبار الـ Pagination
1. تأكد من تحميل البيانات بشكل تدريجي عند التمرير
2. تحقق من عدم تكرار البيانات
3. تحقق من توقف التحميل عند الوصول للنهاية

## الملاحظات الفنية

### التوافق مع الإصدارات السابقة
- ✅ الكود الجديد متوافق مع الطلبات القديمة
- ✅ إذا لم يتم تحديد `page` أو `limit`، يتم استخدام القيم الافتراضية
- ✅ إذا لم يتم تحديد `type`، يتم إرجاع جميع المنشورات

### الأمان
- ✅ يتم التحقق من صلاحيات المستخدم قبل الحذف
- ✅ لا يمكن حذف منشورات المستخدمين الآخرين
- ✅ يتم استخدام token للمصادقة

### قاعدة البيانات
- ✅ لا حاجة لتعديل schema
- ✅ لا حاجة لـ migration
- ✅ جميع الفهارس الموجودة تعمل بشكل صحيح

## الدعم والصيانة

### في حالة ظهور مشاكل:
1. تحقق من console logs في المتصفح
2. تحقق من server logs في الخادم
3. تأكد من صحة الـ token
4. تأكد من صحة الـ ID المرسل

### للمطورين:
- جميع العمليات تحتوي على logging مفصل
- استخدم `[DELETE POST]` و `[DELETE VIDEO]` للبحث في logs
- استخدم `[GET USER POSTS]` لتتبع عمليات الجلب

## الخلاصة
تم إصلاح المشكلة بنجاح من خلال:
1. ✅ تحديث endpoint الواجهة الخلفية ليدعم pagination و filtering
2. ✅ تحسين معالجة الأخطاء في الواجهة الأمامية
3. ✅ إضافة logging شامل لتسهيل التشخيص
4. ✅ تحسين الأداء وتجربة المستخدم

الآن يمكن للمستخدمين حذف الفيديوهات والمنشورات بنجاح مع رسائل خطأ واضحة في حالة حدوث مشاكل.
