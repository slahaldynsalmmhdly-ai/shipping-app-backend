# مطالبة كتابية شاملة للواجهة الأمامية: دمج ميزة "يكتب الآن" و "متصل الآن"

## الهدف

مرحباً، لقد قمنا بتحديث الخادم (backend) لدعم ميزتين جديدتين لتحسين تجربة المستخدم في نظام الدردشة:

1.  **مؤشر الكتابة (Typing Indicator):** يعرض "يكتب الآن..." عندما يكتب الطرف الآخر.
2.  **حالة الاتصال (Online Status):** يعرض "متصل الآن" أو "آخر ظهور" للمستخدمين.

المطلوب هو دمج هاتين الميزتين في الواجهة الأمامية لتطبيق React.

---

## نظرة عامة على الـ API

### 1. مؤشر الكتابة (Typing Indicator)

*   `POST /api/v1/chat/conversations/:conversationId/typing`
    *   **الوصف:** إرسال حالة الكتابة (عندما تبدأ أو تتوقف).
    *   **Body:** `{ "isTyping": true }` أو `{ "isTyping": false }`
*   `GET /api/v1/chat/conversations/:conversationId/typing`
    *   **الوصف:** الحصول على حالة كتابة الطرف الآخر.
    *   **Response:** `{ "isTyping": true, "typingUsers": ["userId1"] }`

### 2. حالة الاتصال (Online Status)

*   `POST /api/v1/users/online-status`
    *   **الوصف:** إرسال "نبضة" (heartbeat) لإعلام الخادم بأنك متصل.
*   `GET /api/v1/users/:userId/online-status`
    *   **الوصف:** الحصول على حالة اتصال مستخدم معين.
    *   **Response:** `{ "isOnline": true, "lastSeen": 1699012345678 }`
*   `POST /api/v1/users/online-status/batch`
    *   **الوصف:** الحصول على حالة اتصال عدة مستخدمين دفعة واحدة (مثالي لقائمة المحادثات).
    *   **Body:** `{ "userIds": ["userId1", "userId2"] }`
    *   **Response:** `{ "userId1": { "isOnline": true, ... }, "userId2": { ... } }`

---

## خطوات التكامل المطلوبة

### الخطوة 1: تطبيق نظام الـ Heartbeat (في `App.tsx`)

**الهدف:** إعلام الخادم بأن المستخدم الحالي متصل بشكل دوري.

1.  أضف `useEffect` جديد في `App.tsx`.
2.  هذا الـ `useEffect` يجب أن يعمل فقط عندما يكون المستخدم مسجلاً دخوله (`user` is not null).
3.  قم باستدعاء `POST /api/v1/users/online-status` فوراً عند تسجيل الدخول، ثم كل 15 ثانية باستخدام `setInterval`.

**الكود المقترح لـ `App.tsx`:**

```typescript
// في App.tsx
useEffect(() => {
  if (!user) return; // فقط إذا كان المستخدم مسجل دخول

  const sendHeartbeat = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`${API_BASE_URL}/api/v1/users/online-status`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  };

  // إرسال heartbeat فوراً عند تحميل التطبيق
  sendHeartbeat();

  // ثم إرسال heartbeat كل 15 ثانية
  const heartbeatInterval = setInterval(sendHeartbeat, 15000);

  return () => clearInterval(heartbeatInterval);
}, [user]); // يعتمد على وجود المستخدم
```

### الخطوة 2: عرض مؤشر الاتصال في قائمة المحادثات (في `ChatListScreen.tsx`)

**الهدف:** عرض نقطة خضراء بجانب صورة المستخدمين المتصلين في قائمة المحادثات.

1.  أضف `useState` جديد لتخزين حالة اتصال المستخدمين: `const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});`
2.  أضف `useEffect` جديد يعتمد على `conversations`.
3.  داخل الـ `useEffect`، قم باستدعاء `POST /api/v1/users/online-status/batch` لجلب حالة جميع المستخدمين في القائمة.
4.  استخدم `setInterval` لتحديث الحالات كل 20 ثانية.
5.  في JSX، قم بعرض عنصر `<span className="online-indicator"></span>` إذا كان المستخدم متصلاً.

**الكود المقترح لـ `ChatListScreen.tsx`:**

```typescript
// في ChatListScreen.tsx

const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

useEffect(() => {
  if (!conversations || conversations.length === 0) return;

  const checkOnlineStatuses = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const userIds = conversations.map((conv) => conv.participant._id);

      const response = await fetch(`${API_BASE_URL}/api/v1/users/online-status/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });

      const statuses = await response.json();
      const onlineMap: Record<string, boolean> = {};

      Object.keys(statuses).forEach((userId) => {
        onlineMap[userId] = statuses[userId].isOnline;
      });

      setOnlineStatuses(onlineMap);
    } catch (error) {
      console.error("Error checking batch online statuses:", error);
    }
  };

  checkOnlineStatuses(); // التحقق فوراً
  const interval = setInterval(checkOnlineStatuses, 20000); // ثم كل 20 ثانية

  return () => clearInterval(interval);
}, [conversations]);

// في JSX داخل الـ map
<div className="chat-item-avatar-wrapper">
  {chat.participant.avatar ? (
    <img src={getFullImageUrl(chat.participant.avatar)} alt={chat.participant.name} />
  ) : (
    <PlaceholderAvatar name={chat.participant.name} />
  )}
  {onlineStatuses[chat.participant._id] && <span className="online-indicator"></span>}
</div>
```

### الخطوة 3: دمج "يكتب الآن" و "متصل الآن" (في `ChatScreen.tsx`)

**الهدف:** عرض حالة الطرف الآخر في رأس المحادثة (Header) بالأولوية التالية: يكتب الآن > متصل الآن > آخر ظهور.

1.  **إضافة States جديدة:**

    ```typescript
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [isParticipantOnline, setIsParticipantOnline] = useState(false);
    const [participantLastSeen, setParticipantLastSeen] = useState<number | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    ```

2.  **إضافة `useEffect` لمراقبة حالة الكتابة:**

    ```typescript
    useEffect(() => {
      if (!chatTarget?.conversationId) return;

      const checkTypingStatus = async () => {
        try {
          const token = localStorage.getItem("authToken");
          const response = await fetch(
            `${API_BASE_URL}/api/v1/chat/conversations/${chatTarget.conversationId}/typing`,
            { headers: { "Authorization": `Bearer ${token}` } }
          );
          const data = await response.json();
          setIsOtherUserTyping(data.isTyping);
        } catch (error) {
          console.error("Error checking typing status:", error);
        }
      };

      const interval = setInterval(checkTypingStatus, 2000); // كل ثانيتين
      return () => clearInterval(interval);
    }, [chatTarget?.conversationId]);
    ```

3.  **إضافة `useEffect` لمراقبة حالة الاتصال:**

    ```typescript
    useEffect(() => {
      if (!chatTarget?.participant?._id) return;

      const checkOnlineStatus = async () => {
        try {
          const token = localStorage.getItem("authToken");
          const response = await fetch(
            `${API_BASE_URL}/api/v1/users/${chatTarget.participant._id}/online-status`,
            { headers: { "Authorization": `Bearer ${token}` } }
          );
          const data = await response.json();
          setIsParticipantOnline(data.isOnline);
          setParticipantLastSeen(data.lastSeen);
        } catch (error) {
          console.error("Error checking online status:", error);
        }
      };

      checkOnlineStatus(); // التحقق فوراً
      const interval = setInterval(checkOnlineStatus, 10000); // ثم كل 10 ثوانٍ
      return () => clearInterval(interval);
    }, [chatTarget?.participant?._id]);
    ```

4.  **إضافة دوال لإرسال حالة الكتابة:**

    ```typescript
    const handleTyping = async (isTyping: boolean) => {
      if (!chatTarget?.conversationId) return;
      try {
        const token = localStorage.getItem("authToken");
        await fetch(
          `${API_BASE_URL}/api/v1/chat/conversations/${chatTarget.conversationId}/typing`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ isTyping }),
          }
        );
      } catch (error) {
        console.error("Error updating typing status:", error);
      }
    };
    ```

5.  **تعديل `onChange` و `onSend`:**

    ```typescript
    // تعديل onChange للـ textarea
    onChange={(e) => {
      setNewMessage(e.target.value);
      handleTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 2000);
    }}

    // تعديل handleSend
    const handleSend = async () => {
      // ... (الكود الحالي)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      handleTyping(false);
      // ... (الكود الحالي)
    };
    ```

6.  **تحديث الـ JSX لعرض الحالة:**

    ```typescript
    // دالة مساعدة لتنسيق الوقت
    const formatLastSeen = (timestamp: number | null) => {
      if (!timestamp) return "";
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 1000 / 60);
      if (minutes < 1) return "منذ لحظات";
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `منذ ${hours} ساعة`;
      const days = Math.floor(hours / 24);
      return `منذ ${days} يوم`;
    };

    // في JSX داخل header المحادثة
    <div className="chat-header-info">
      {chatTarget.participant.avatar ? (
        <img src={getFullImageUrl(chatTarget.participant.avatar)} alt={chatTarget.participant.name} />
      ) : (
        <PlaceholderAvatar name={chatTarget.participant.name} />
      )}
      <div className="chat-header-text">
        <h3>{chatTarget.participant.name}</h3>
        <div className="chat-header-status">
          {isOtherUserTyping ? (
            <span className="typing-indicator">يكتب الآن...</span>
          ) : isParticipantOnline ? (
            <span className="online-status">متصل الآن</span>
          ) : participantLastSeen ? (
            <span className="last-seen">آخر ظهور {formatLastSeen(participantLastSeen)}</span>
          ) : null}
        </div>
      </div>
    </div>
    ```

---

## CSS المقترح

أضف الأنماط التالية إلى ملفات الـ CSS المناسبة (`ChatScreen.css` و `ChatListScreen.css`):

```css
/* === في ChatScreen.css === */

.chat-header-text {
  display: flex;
  flex-direction: column;
}

.chat-header-status {
  height: 16px; /* حجز مساحة لمنع القفز */
  line-height: 1;
}

.typing-indicator,
.online-status {
  font-size: 12px;
  color: #10b981; /* أخضر */
  font-weight: 500;
  animation: fadeIn 0.3s ease-in-out;
}

.last-seen {
  font-size: 12px;
  color: #6b7280; /* رمادي */
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* === في ChatListScreen.css === */

.chat-item-avatar-wrapper {
  position: relative;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: #10b981; /* أخضر */
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0,0,0,0.2);
}
```

---

## الخلاصة

بتطبيق هذه الخطوات، سيتم دمج ميزتي "يكتب الآن" و "متصل الآن" بشكل كامل في الواجهة الأمامية، مما يوفر تجربة محادثة غنية وتفاعلية للمستخدمين. الرجاء اتباع الخطوات بعناية واختبار كل جزء على حدة.

بالتوفيق!
