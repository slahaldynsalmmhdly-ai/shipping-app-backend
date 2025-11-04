# ميزة "متصل الآن" (Online Status)

## نظرة عامة

تم إضافة ميزة "متصل الآن" (Online Status) لتحسين تجربة المستخدم في نظام الدردشة. هذه الميزة تعرض للمستخدم حالة اتصال الطرف الآخر (متصل الآن / غير متصل / آخر ظهور).

## التحديثات على الخادم (Backend)

### 1. ملف جديد: `routes/onlineStatus.js`

تم إنشاء ملف جديد يحتوي على endpoints لإدارة حالة الاتصال:

#### Endpoints:

##### POST `/api/v1/users/online-status`
**الوصف**: تحديث حالة اتصال المستخدم (Heartbeat)

**الاستخدام**: يجب استدعاء هذا الـ endpoint بشكل دوري (كل 15-20 ثانية) للحفاظ على حالة "متصل الآن"

**Headers**:
```json
{
  "Authorization": "Bearer YOUR_TOKEN"
}
```

**Response**:
```json
{
  "success": true
}
```

**مثال على الاستخدام**:
```javascript
// إرسال heartbeat كل 15 ثانية
setInterval(async () => {
  const token = localStorage.getItem('authToken');
  await fetch(`${API_BASE_URL}/api/v1/users/online-status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}, 15000);
```

##### GET `/api/v1/users/:userId/online-status`
**الوصف**: الحصول على حالة اتصال مستخدم معين

**Parameters**:
- `userId`: معرف المستخدم

**Response**:
```json
{
  "isOnline": true,
  "lastSeen": 1699012345678
}
```

**مثال على الاستخدام**:
```javascript
// التحقق من حالة اتصال مستخدم
const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/online-status`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
if (data.isOnline) {
  // عرض "متصل الآن"
} else if (data.lastSeen) {
  // عرض "آخر ظهور: منذ X دقيقة"
}
```

##### POST `/api/v1/users/online-status/batch`
**الوصف**: الحصول على حالة اتصال عدة مستخدمين دفعة واحدة

**Body Parameters**:
```json
{
  "userIds": ["userId1", "userId2", "userId3"]
}
```

**Response**:
```json
{
  "userId1": {
    "isOnline": true,
    "lastSeen": 1699012345678
  },
  "userId2": {
    "isOnline": false,
    "lastSeen": 1699012300000
  },
  "userId3": {
    "isOnline": false,
    "lastSeen": null
  }
}
```

**مثال على الاستخدام**:
```javascript
// الحصول على حالة اتصال عدة مستخدمين (مثلاً في قائمة المحادثات)
const response = await fetch(`${API_BASE_URL}/api/v1/users/online-status/batch`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    userIds: ['user1', 'user2', 'user3']
  })
});
const statuses = await response.json();
```

### 2. التحديثات على `server.js`

تم إضافة السطور التالية:

```javascript
// في قسم require
const onlineStatusRoutes = require("./routes/onlineStatus");

// في قسم app.use
app.use("/api/v1", onlineStatusRoutes);
```

## آلية العمل

### 1. التخزين المؤقت (In-Memory Storage)
- يتم تخزين حالة الاتصال في الذاكرة (RAM) لسرعة الوصول
- البنية: `{ userId: { lastSeen: timestamp, isOnline: boolean } }`
- يتم تحديث `lastSeen` عند كل heartbeat

### 2. Heartbeat System
- يجب على الواجهة الأمامية إرسال heartbeat كل 15-20 ثانية
- إذا لم يتم استلام heartbeat لمدة 30 ثانية، يُعتبر المستخدم غير متصل

### 3. التنظيف التلقائي (Auto Cleanup)
- يتم تشغيل عملية تنظيف كل 10 ثوانٍ
- تحديث حالة المستخدمين الذين لم يرسلوا heartbeat لأكثر من 30 ثانية إلى "غير متصل"

### 4. الأمان
- جميع الـ endpoints محمية بـ `protect` middleware
- يتطلب token صالح للوصول

## التكامل مع الواجهة الأمامية

### المتطلبات:

#### 1. إرسال Heartbeat بشكل دوري

يجب إضافة هذا الكود في المكون الرئيسي للتطبيق (مثل `App.tsx`):

```typescript
// في App.tsx
useEffect(() => {
  if (!user) return; // فقط إذا كان المستخدم مسجل دخول

  const sendHeartbeat = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/v1/users/online-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  };

  // إرسال heartbeat فوراً
  sendHeartbeat();

  // ثم إرسال heartbeat كل 15 ثانية
  const heartbeatInterval = setInterval(sendHeartbeat, 15000);

  return () => clearInterval(heartbeatInterval);
}, [user]);
```

#### 2. عرض حالة الاتصال في ChatScreen

```typescript
// في ChatScreen.tsx

const [isParticipantOnline, setIsParticipantOnline] = useState(false);
const [participantLastSeen, setParticipantLastSeen] = useState<number | null>(null);

// مراقبة حالة اتصال المشارك
useEffect(() => {
  if (!chatTarget?.participant?._id) return;

  const checkOnlineStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/${chatTarget.participant._id}/online-status`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setIsParticipantOnline(data.isOnline);
      setParticipantLastSeen(data.lastSeen);
    } catch (error) {
      console.error('Error checking online status:', error);
    }
  };

  // التحقق فوراً
  checkOnlineStatus();

  // ثم التحقق كل 10 ثوانٍ
  const interval = setInterval(checkOnlineStatus, 10000);
  return () => clearInterval(interval);
}, [chatTarget?.participant?._id]);

// دالة لتنسيق "آخر ظهور"
const formatLastSeen = (timestamp: number | null) => {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'منذ لحظات';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
};

// في الـ JSX
<div className="chat-header-info">
  <img src={getFullImageUrl(chatTarget.participant.avatar)} />
  <div>
    <h3>{chatTarget.participant.name}</h3>
    {isParticipantOnline ? (
      <span className="online-status">متصل الآن</span>
    ) : participantLastSeen ? (
      <span className="last-seen">آخر ظهور {formatLastSeen(participantLastSeen)}</span>
    ) : null}
  </div>
</div>
```

#### 3. عرض حالة الاتصال في ChatListScreen

```typescript
// في ChatListScreen.tsx

const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

// جلب حالة اتصال جميع المشاركين في المحادثات
useEffect(() => {
  if (!conversations || conversations.length === 0) return;

  const checkOnlineStatuses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userIds = conversations.map(conv => conv.participant._id);
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/online-status/batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userIds })
        }
      );
      
      const statuses = await response.json();
      const onlineMap: Record<string, boolean> = {};
      
      Object.keys(statuses).forEach(userId => {
        onlineMap[userId] = statuses[userId].isOnline;
      });
      
      setOnlineStatuses(onlineMap);
    } catch (error) {
      console.error('Error checking online statuses:', error);
    }
  };

  // التحقق فوراً
  checkOnlineStatuses();

  // ثم التحقق كل 15 ثانية
  const interval = setInterval(checkOnlineStatuses, 15000);
  return () => clearInterval(interval);
}, [conversations]);

// في الـ JSX
<div className="chat-list">
  {conversations.map(chat => (
    <div key={chat._id} className="chat-list-item">
      <div className="chat-item-avatar-wrapper">
        <img src={getFullImageUrl(chat.participant.avatar)} />
        {onlineStatuses[chat.participant._id] && (
          <span className="online-indicator"></span>
        )}
      </div>
      {/* ... بقية الكود */}
    </div>
  ))}
</div>
```

### CSS المقترح

```css
/* في ChatScreen.css */
.online-status {
  font-size: 12px;
  color: #10b981;
  font-weight: 500;
}

.last-seen {
  font-size: 12px;
  color: #6b7280;
}

/* في ChatListScreen.css */
.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}
```

## دمج ميزة "يكتب الآن" مع "متصل الآن"

يمكن عرض كلا الميزتين معاً في header المحادثة:

```typescript
<div className="chat-header-info">
  <img src={getFullImageUrl(chatTarget.participant.avatar)} />
  <div>
    <h3>{chatTarget.participant.name}</h3>
    {isOtherUserTyping ? (
      <span className="typing-indicator">يكتب الآن...</span>
    ) : isParticipantOnline ? (
      <span className="online-status">متصل الآن</span>
    ) : participantLastSeen ? (
      <span className="last-seen">آخر ظهور {formatLastSeen(participantLastSeen)}</span>
    ) : null}
  </div>
</div>
```

**الأولوية:**
1. إذا كان يكتب → عرض "يكتب الآن..."
2. إذا كان متصل → عرض "متصل الآن"
3. إذا كان غير متصل → عرض "آخر ظهور"

## الاختبار

### 1. اختبار إرسال Heartbeat:
```bash
curl -X POST http://localhost:5000/api/v1/users/online-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. اختبار الحصول على حالة اتصال مستخدم:
```bash
curl http://localhost:5000/api/v1/users/USER_ID/online-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. اختبار الحصول على حالة اتصال عدة مستخدمين:
```bash
curl -X POST http://localhost:5000/api/v1/users/online-status/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userIds": ["user1", "user2"]}'
```

## الملاحظات

1. **الأداء**: النظام الحالي يستخدم in-memory storage، وهو مناسب للتطبيقات الصغيرة والمتوسطة
2. **التوسع**: للتطبيقات الكبيرة، يُنصح باستخدام Redis لتخزين حالة الاتصال
3. **Heartbeat Interval**: يمكن تعديل فترة الـ heartbeat حسب احتياجات التطبيق (15-30 ثانية)
4. **Offline Timeout**: يمكن تعديل مدة الانتظار قبل اعتبار المستخدم غير متصل (حالياً 30 ثانية)

## التحديثات المستقبلية

- [ ] إضافة دعم WebSocket للتحديثات الفورية
- [ ] استخدام Redis للتخزين في بيئة الإنتاج
- [ ] إضافة إشعارات عند اتصال/قطع اتصال المستخدمين
- [ ] تحسين الأداء باستخدام caching
- [ ] إضافة تحليلات لوقت الاتصال

## الخلاصة

تم إضافة ميزة "متصل الآن" بنجاح إلى الخادم. الميزة تعمل بنظام Heartbeat بسيط وفعال، وتوفر 3 endpoints رئيسية:
1. إرسال heartbeat (POST)
2. الحصول على حالة مستخدم واحد (GET)
3. الحصول على حالة عدة مستخدمين (POST batch)

يمكن دمج هذه الميزة مع ميزة "يكتب الآن" الموجودة مسبقاً لتوفير تجربة مستخدم متكاملة في نظام الدردشة.
