# تحديث عرض أنواع الإشعارات للمحتوى من المتابعين

## المشكلة

عند عرض الإشعارات في الواجهة الأمامية، كانت تظهر بنص عام "إشعار جديد" بدلاً من نص واضح يوضح نوع المحتوى:
- "نشر منشوراً جديداً" ← للمنشورات العادية
- "نشر إعلان شحن" ← لإعلانات الشحن
- "نشر إعلان شاحنة فارغة" ← لإعلانات الشاحنات الفارغة

## السبب

endpoint الإشعارات الرئيسي `GET /api/v1/users/me/notifications` كان:
- ✅ يُحمّل `notifications.post` فقط
- ❌ لا يُحمّل `notifications.shipmentAd`
- ❌ لا يُحمّل `notifications.emptyTruckAd`

## الحل المطبق

### تحديث `routes/userRoutes.js`

تم تحديث endpoint `GET /api/v1/users/me/notifications` لتحميل جميع أنواع المحتوى:

```javascript
.populate({
  path: "notifications.post",
  select: "text originalPost originalPostType media",
}).populate({
  path: "notifications.shipmentAd",
  select: "pickupLocation deliveryLocation description media",
}).populate({
  path: "notifications.emptyTruckAd",
  select: "currentLocation preferredDestination additionalNotes media",
})
```

## النتيجة

الآن عند جلب الإشعارات:
1. ✅ يتم تحميل بيانات `post` للمنشورات العادية
2. ✅ يتم تحميل بيانات `shipmentAd` لإعلانات الشحن
3. ✅ يتم تحميل بيانات `emptyTruckAd` لإعلانات الشاحنات الفارغة
4. ✅ حقل `itemType` موجود في الإشعار لتمييز النوع
5. ✅ حقل `message` موجود ويحتوي على النص الصحيح من الباك إند

## التكامل مع الواجهة الأمامية

الواجهة الأمامية تحتاج تحديث في ملفين:

### 1. `App.tsx` - تحديث نوع Notification:

```typescript
export interface Notification {
    _id: string;
    type: 'like' | 'comment' | 'reply' | 'comment_like' | 'reply_like' | 'new_post' 
        | 'new_following_post' | 'new_following_shipment_ad' | 'new_following_empty_truck_ad';
    sender: {
      _id: string;
      name: string;
      avatar?: string;
    };
    post?: {
      _id: string;
      text: string;
      media?: any[];
    };
    shipmentAd?: {
      _id: string;
      pickupLocation: string;
      deliveryLocation: string;
      description?: string;
      media?: any[];
    };
    emptyTruckAd?: {
      _id: string;
      currentLocation: string;
      preferredDestination: string;
      additionalNotes?: string;
      media?: any[];
    };
    itemType?: 'post' | 'shipmentAd' | 'emptyTruckAd';
    comment?: {
      _id: string;
      text: string;
    };
    reply?: {
      _id: string;
      text: string;
    };
    read: boolean;
    createdAt: string;
    message?: string;
}
```

### 2. `components/notifications/NotificationsScreen.tsx`:

#### أ. تحديث `NotificationIcon`:

```typescript
const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
  switch (type) {
    case 'new_post':
    case 'new_following_post':
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
              <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
            </svg>
        );
    case 'new_following_shipment_ad':
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
              <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
              <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
            </svg>
        );
    case 'new_following_empty_truck_ad':
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0112 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 017.5 5.455V5.25zm7.5 0v.09a49.488 49.488 0 00-6 0v-.09a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5zm-3 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              <path d="M3 18.4v-2.796a4.3 4.3 0 00.713.31A26.226 26.226 0 0012 17.25c2.892 0 5.68-.468 8.287-1.335.252-.084.49-.189.713-.311V18.4c0 1.452-1.047 2.728-2.523 2.923-2.12.282-4.282.427-6.477.427a49.19 49.19 0 01-6.477-.427C4.047 21.128 3 19.852 3 18.4z" />
            </svg>
        );
    // ... باقي الأيقونات
  }
};
```

#### ب. تحديث `renderNotificationText`:

```typescript
const renderNotificationText = (notif: Notification) => {
    switch (notif.type) {
        case 'new_post':
        case 'new_following_post':
            const postPreview = notif.post?.text?.substring(0, 50) || '';
            return (
                <>
                    <p className="notification-description">
                        <strong>{notif.sender.name}</strong>
                        <span> نشر منشوراً جديداً</span>
                    </p>
                    {postPreview && <p className="notification-preview">{postPreview}{postPreview.length >= 50 ? '...' : ''}</p>}
                </>
            );
        case 'new_following_shipment_ad':
            const shipmentPreview = notif.shipmentAd?.description?.substring(0, 50) || 
                                   `${notif.shipmentAd?.pickupLocation || ''} → ${notif.shipmentAd?.deliveryLocation || ''}`;
            return (
                <>
                    <p className="notification-description">
                        <strong>{notif.sender.name}</strong>
                        <span> نشر إعلان شحن</span>
                    </p>
                    {shipmentPreview && <p className="notification-preview">{shipmentPreview}</p>}
                </>
            );
        case 'new_following_empty_truck_ad':
            const truckPreview = notif.emptyTruckAd?.additionalNotes?.substring(0, 50) || 
                                `${notif.emptyTruckAd?.currentLocation || ''} → ${notif.emptyTruckAd?.preferredDestination || ''}`;
            return (
                <>
                    <p className="notification-description">
                        <strong>{notif.sender.name}</strong>
                        <span> نشر إعلان شاحنة فارغة</span>
                    </p>
                    {truckPreview && <p className="notification-preview">{truckPreview}</p>}
                </>
            );
        // ... باقي الحالات
    }
}
```

#### ج. تحديث `handleNotificationClick`:

```typescript
const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
        setNotifications(prev => {
            if (!prev) return null;
            return prev.map(n => (n._id === notification._id ? { ...n, read: true } : n))
        });

        try {
          await fetch(`${API_BASE_URL}/api/v1/users/me/notifications/${notification._id}/read`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
        } catch (error) {
          console.error("Failed to mark notification as read:", error);
        }
    }
    
    // Get the content based on type
    let content = null;
    if (notification.post) content = notification.post;
    else if (notification.shipmentAd) content = notification.shipmentAd;
    else if (notification.emptyTruckAd) content = notification.emptyTruckAd;
    
    if (!content) return;

    // Handle different notification types
    switch (notification.type) {
        case 'new_post':
        case 'new_following_post':
        case 'new_following_shipment_ad':
        case 'new_following_empty_truck_ad':
        case 'like':
        case 'comment_like':
        case 'reply_like':
            onOpenNotificationDetail(content);
            break;
        case 'comment':
        case 'reply':
            onOpenCommentSheet(content);
            break;
        default:
            onOpenNotificationDetail(content);
            break;
    }
};
```

## التاريخ

**2025-10-31**: إضافة تحميل `shipmentAd` و `emptyTruckAd` في endpoint الإشعارات الرئيسي
