# دليل تكامل الواجهة الأمامية مع نظام التقسيم الجديد

## نظرة عامة

تم تحديث الخادم ليدعم نظام تقسيم ذكي (Smart Pagination) يجلب **3 عناصر فقط** في كل طلب، موزعة بشكل متوازن بين:
- منشورات عادية (Posts)
- إعلانات شاحنات فارغة (Empty Truck Ads)
- إعلانات حمولة (Shipment Ads)

## استراتيجية التوزيع

### الطلب الأول (page=1)
يجلب 3 عناصر بالترتيب التالي:
1. منشور عادي واحد
2. إعلان شاحنة فارغة واحد
3. إعلان حمولة واحد

### إذا لم توجد إعلانات
إذا لم تتوفر إعلانات شاحنات فارغة أو إعلانات حمولة، سيتم استبدالها بمنشورات عادية تلقائياً.

### عند الضغط على "تحميل المزيد"
يجلب 3 عناصر إضافية بنفس المنطق (page=2, page=3, إلخ)

## تحديثات الواجهة الأمامية المطلوبة

### 1. تحديث استدعاء API

#### قبل التحديث (الطريقة القديمة):
```javascript
// كان يجلب جميع البيانات دفعة واحدة
const response = await axios.get('/api/v1/feed', {
  headers: { Authorization: `Bearer ${token}` }
});
const allItems = response.data.items;
```

#### بعد التحديث (الطريقة الجديدة):
```javascript
// يجلب 3 عناصر فقط في كل طلب
const [page, setPage] = useState(1);
const [items, setItems] = useState([]);
const [hasMore, setHasMore] = useState(true);

const fetchFeed = async (pageNumber = 1) => {
  try {
    const response = await axios.get(`/api/v1/feed?page=${pageNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { items: newItems, pagination } = response.data;
    
    if (pageNumber === 1) {
      // الطلب الأول: استبدال البيانات
      setItems(newItems);
    } else {
      // الطلبات التالية: إضافة البيانات
      setItems(prevItems => [...prevItems, ...newItems]);
    }
    
    setHasMore(pagination.hasMore);
    setPage(pageNumber);
  } catch (error) {
    console.error('خطأ في جلب البيانات:', error);
  }
};

// استدعاء عند تحميل الصفحة
useEffect(() => {
  fetchFeed(1);
}, []);

// استدعاء عند الضغط على "تحميل المزيد"
const loadMore = () => {
  if (hasMore) {
    fetchFeed(page + 1);
  }
};
```

### 2. إضافة زر "تحميل المزيد"

```jsx
<div className="feed-container">
  {items.map((item, index) => (
    <FeedItem key={`${item.itemType}-${item._id}`} item={item} />
  ))}
  
  {hasMore && (
    <button 
      onClick={loadMore} 
      className="load-more-button"
      disabled={loading}
    >
      {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
    </button>
  )}
  
  {!hasMore && items.length > 0 && (
    <p className="end-of-feed">لا توجد منشورات إضافية</p>
  )}
</div>
```

### 3. التمرير اللانهائي (Infinite Scroll) - اختياري

إذا كنت تريد تحميل المزيد تلقائياً عند الوصول لنهاية الصفحة:

```javascript
import { useEffect, useRef } from 'react';

const observerRef = useRef();

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    },
    { threshold: 1.0 }
  );

  if (observerRef.current) {
    observer.observe(observerRef.current);
  }

  return () => {
    if (observerRef.current) {
      observer.unobserve(observerRef.current);
    }
  };
}, [hasMore, loading]);

// في JSX:
<div ref={observerRef} className="scroll-trigger" />
```

## هيكل الاستجابة من API

```json
{
  "items": [
    {
      "_id": "...",
      "itemType": "post",
      "user": { "name": "...", "avatar": "..." },
      "text": "...",
      "createdAt": "..."
    },
    {
      "_id": "...",
      "itemType": "emptyTruckAd",
      "user": { "name": "...", "avatar": "..." },
      "currentLocation": "...",
      "preferredDestination": "...",
      "createdAt": "..."
    },
    {
      "_id": "...",
      "itemType": "shipmentAd",
      "user": { "name": "...", "avatar": "..." },
      "pickupLocation": "...",
      "deliveryLocation": "...",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalItems": 150,
    "totalPages": 50,
    "itemsPerPage": 3,
    "hasMore": true
  }
}
```

## أنواع العناصر (itemType)

- `post`: منشور عادي
- `emptyTruckAd`: إعلان شاحنة فارغة
- `shipmentAd`: إعلان حمولة

## ملاحظات مهمة

1. **حجم الصفحة ثابت**: الخادم يرسل دائماً 3 عناصر كحد أقصى في كل طلب (لا يمكن تغييره من الواجهة الأمامية)
2. **التوزيع الذكي**: الخادم يوزع العناصر بشكل متوازن تلقائياً
3. **الأداء**: هذا النظام يحسن الأداء بشكل كبير، خاصة عند بدء التطبيق
4. **التوافق**: يعمل مع خوارزمية التوزيع الذكية (Smart Feed Algorithm) الموجودة

## اختبار التكامل

### اختبار الطلب الأول:
```bash
curl -X GET "http://localhost:5000/api/v1/feed?page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### اختبار الطلب الثاني:
```bash
curl -X GET "http://localhost:5000/api/v1/feed?page=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## مثال كامل مع React

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeedScreen = () => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchFeed = async (pageNumber) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/feed?page=${pageNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { items: newItems, pagination } = response.data;
      
      if (pageNumber === 1) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      
      setHasMore(pagination.hasMore);
      setPage(pageNumber);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(1);
  }, []);

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchFeed(page + 1);
    }
  };

  return (
    <div className="feed-screen">
      <h1>الصفحة الرئيسية</h1>
      
      <div className="feed-items">
        {items.map((item, index) => (
          <div key={`${item.itemType}-${item._id}`} className="feed-item">
            {item.itemType === 'post' && <PostCard post={item} />}
            {item.itemType === 'emptyTruckAd' && <EmptyTruckAdCard ad={item} />}
            {item.itemType === 'shipmentAd' && <ShipmentAdCard ad={item} />}
          </div>
        ))}
      </div>
      
      {hasMore && (
        <button 
          onClick={loadMore} 
          disabled={loading}
          className="load-more-btn"
        >
          {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
        </button>
      )}
      
      {!hasMore && items.length > 0 && (
        <p className="end-message">لا توجد منشورات إضافية</p>
      )}
      
      {items.length === 0 && !loading && (
        <p className="empty-message">لا توجد منشورات حالياً</p>
      )}
    </div>
  );
};

export default FeedScreen;
```

## الفوائد الرئيسية

1. **سرعة التحميل الأولي**: يتم تحميل 3 عناصر فقط عند بدء التطبيق
2. **توفير البيانات**: تقليل استهلاك البيانات للمستخدمين
3. **تجربة مستخدم أفضل**: عرض المحتوى بسرعة دون انتظار
4. **قابلية التوسع**: يدعم آلاف المنشورات دون مشاكل في الأداء

## الدعم والمساعدة

إذا واجهت أي مشاكل في التكامل، يرجى التحقق من:
- صحة التوكن (Token)
- رقم الصفحة (page) يجب أن يكون >= 1
- استجابة الخادم تحتوي على `items` و `pagination`
