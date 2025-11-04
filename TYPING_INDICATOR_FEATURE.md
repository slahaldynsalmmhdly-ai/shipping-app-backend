# ميزة "يكتب الآن..." (Typing Indicator)

## نظرة عامة

تم إضافة ميزة "يكتب الآن..." لتحسين تجربة المستخدم في نظام الدردشة. هذه الميزة تعرض للمستخدم عندما يكون الطرف الآخر يكتب رسالة.

## التحديثات على الخادم (Backend)

### 1. ملف جديد: `routes/typingIndicator.js`

تم إنشاء ملف جديد يحتوي على endpoints لإدارة حالة الكتابة:

#### Endpoints:

##### POST `/api/v1/chat/conversations/:conversationId/typing`
**الوصف**: تحديث حالة الكتابة للمستخدم الحالي

**Body Parameters**:
```json
{
  "isTyping": true  // أو false
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
// عند بدء الكتابة
fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/typing`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ isTyping: true })
});

// عند التوقف عن الكتابة
fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/typing`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ isTyping: false })
});
```

##### GET `/api/v1/chat/conversations/:conversationId/typing`
**الوصف**: الحصول على حالة الكتابة للمحادثة

**Response**:
```json
{
  "isTyping": true,
  "typingUsers": ["userId1", "userId2"]
}
```

**مثال على الاستخدام**:
```javascript
// التحقق من حالة الكتابة
const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/typing`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
if (data.isTyping) {
  // عرض "يكتب الآن..."
}
```

### 2. التحديثات على `server.js`

تم إضافة السطور التالية:

```javascript
// في قسم require
const typingIndicatorRoutes = require("./routes/typingIndicator");

// في قسم app.use
app.use("/api/v1/chat", typingIndicatorRoutes);
```

## آلية العمل

### 1. التخزين المؤقت (In-Memory Storage)
- يتم تخزين حالة الكتابة في الذاكرة (RAM) لسرعة الوصول
- البنية: `{ conversationId: { userId: timestamp } }`
- يتم حذف الحالات القديمة تلقائياً (أكثر من 5 ثواني)

### 2. التنظيف التلقائي (Auto Cleanup)
- يتم تشغيل عملية تنظيف كل ثانيتين
- تحذف أي حالة كتابة أقدم من 5 ثواني
- يحذف المحادثات الفارغة من الذاكرة

### 3. الأمان
- جميع الـ endpoints محمية بـ `protect` middleware
- يتطلب token صالح للوصول
- المستخدم لا يرى حالة كتابته الخاصة

## التكامل مع الواجهة الأمامية

### المتطلبات:

1. **إرسال حالة الكتابة**:
   - عند بدء الكتابة في حقل الإدخال
   - عند التوقف عن الكتابة (بعد 2-3 ثواني من عدم النشاط)
   - عند إرسال الرسالة

2. **استقبال حالة الكتابة**:
   - استخدام polling كل 1-2 ثانية
   - أو استخدام WebSocket (تحديث مستقبلي)

3. **عرض المؤشر**:
   - عرض "يكتب الآن..." في header المحادثة
   - أو عرض نقاط متحركة (...) في منطقة الرسائل

### مثال على التكامل:

```typescript
// في ChatScreen.tsx

const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// مراقبة حالة الكتابة للطرف الآخر
useEffect(() => {
  if (!chatTarget?.conversationId) return;

  const checkTypingStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/v1/chat/conversations/${chatTarget.conversationId}/typing`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setIsOtherUserTyping(data.isTyping);
    } catch (error) {
      console.error('Error checking typing status:', error);
    }
  };

  const interval = setInterval(checkTypingStatus, 1500);
  return () => clearInterval(interval);
}, [chatTarget?.conversationId]);

// إرسال حالة الكتابة
const handleTyping = async (isTyping: boolean) => {
  if (!chatTarget?.conversationId) return;
  
  try {
    const token = localStorage.getItem('authToken');
    await fetch(
      `${API_BASE_URL}/api/v1/chat/conversations/${chatTarget.conversationId}/typing`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isTyping })
      }
    );
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
};

// في onChange للـ textarea
const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setNewMessage(e.target.value);
  
  // إرسال "يكتب الآن"
  handleTyping(true);
  
  // إلغاء المؤقت السابق
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }
  
  // تعيين مؤقت جديد للتوقف عن الكتابة
  typingTimeoutRef.current = setTimeout(() => {
    handleTyping(false);
  }, 2000);
};

// عند إرسال الرسالة
const handleSend = async () => {
  // ... كود الإرسال
  handleTyping(false); // إيقاف حالة الكتابة
};

// في الـ JSX
<div className="chat-header-info">
  <img src={getFullImageUrl(chatTarget.participant.avatar)} />
  <div>
    <h3>{chatTarget.participant.name}</h3>
    {isOtherUserTyping && <span className="typing-indicator">يكتب الآن...</span>}
  </div>
</div>
```

## حل مشكلة التأخير في الرسائل

### التحليل:
المشكلة الحالية في الكود:
```typescript
const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
```

### الحلول:

#### 1. تقليل فترة الـ Polling (حل سريع)
```typescript
const interval = setInterval(fetchMessages, 1000); // Poll every 1 second
```

**الإيجابيات**:
- حل سريع وسهل
- لا يتطلب تغييرات كبيرة

**السلبيات**:
- زيادة الحمل على الخادم
- استهلاك أكبر للبيانات

#### 2. استخدام Long Polling
```typescript
const fetchMessagesLongPolling = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
      `${API_BASE_URL}/api/v1/chat/conversations/${chatTarget.conversationId}/messages?longPoll=true`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      }
    );
    const data = await response.json();
    setMessages(data.messages || []);
    // استدعاء نفسه مرة أخرى
    fetchMessagesLongPolling();
  } catch (error) {
    console.error(error);
    // إعادة المحاولة بعد ثانية
    setTimeout(fetchMessagesLongPolling, 1000);
  }
};
```

#### 3. استخدام WebSocket (الحل الأمثل - تحديث مستقبلي)
```typescript
// سيتطلب تحديث الخادم لدعم WebSocket
const ws = new WebSocket(`ws://your-server/chat/${conversationId}`);

ws.onmessage = (event) => {
  const newMessage = JSON.parse(event.data);
  setMessages(prev => [...prev, newMessage]);
};
```

### التوصية الحالية:
**تقليل فترة الـ Polling إلى 1 ثانية** كحل مؤقت حتى يتم تطبيق WebSocket في المستقبل.

## الاختبار

### 1. اختبار إرسال حالة الكتابة:
```bash
curl -X POST http://localhost:5000/api/v1/chat/conversations/CONVERSATION_ID/typing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"isTyping": true}'
```

### 2. اختبار الحصول على حالة الكتابة:
```bash
curl http://localhost:5000/api/v1/chat/conversations/CONVERSATION_ID/typing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## الملاحظات

1. **الأداء**: النظام الحالي يستخدم in-memory storage، وهو مناسب للتطبيقات الصغيرة والمتوسطة
2. **التوسع**: للتطبيقات الكبيرة، يُنصح باستخدام Redis لتخزين حالة الكتابة
3. **WebSocket**: في المستقبل، يُنصح بالانتقال إلى WebSocket لتحسين الأداء وتقليل الحمل على الخادم

## التحديثات المستقبلية

- [ ] إضافة دعم WebSocket
- [ ] استخدام Redis للتخزين
- [ ] إضافة مؤشر "متصل/غير متصل"
- [ ] إضافة "آخر ظهور"
- [ ] دعم الإشعارات الفورية (Push Notifications)
