# إصلاح مشكلة عدم ظهور محادثات الأسطول

## التاريخ
9 نوفمبر 2025

## المشكلة
عند الدخول إلى صفحة إدارة الأسطول، لا تظهر قوائم الأساطير (السائقين) والمحادثات، مع ظهور الأخطاء التالية في الكونسول:

1. `Error: "Uncaught Error: Cannot read properties of null (reading 'addEventListener')"`
2. `Error: "Error loading fleet conversations:" "Failed to fetch fleet conversations"`

## السبب الجذري

### 1. Endpoint مفقود في الواجهة الخلفية
- الواجهة الأمامية تحاول الوصول إلى: `GET /api/v1/chat/conversations/fleet`
- هذا الـ endpoint **لم يكن موجوداً** في ملف `routes/chatRoutes.js`
- كان هناك فقط endpoint عام: `GET /api/v1/chat/conversations`

### 2. عدم وجود آلية لتصفية محادثات السائقين
- لم يكن هناك طريقة لجلب محادثات السائقين فقط
- كان يتم جلب جميع المحادثات بدون تمييز

## الحل المطبق

### التعديل على الواجهة الخلفية

تم إضافة endpoint جديد في ملف `routes/chatRoutes.js`:

```javascript
// @desc    Get fleet conversations only (drivers)
// @route   GET /api/v1/chat/conversations/fleet
// @access  Private
router.get("/conversations/fleet", protectUnified, async (req, res) => {
  try {
    const Vehicle = require("../models/Vehicle");
    const User = require("../models/User");
    
    const isValidObjectId = (id) => {
      if (!id) return false;
      const idStr = typeof id === 'string' ? id : id.toString();
      return /^[0-9a-fA-F]{24}$/.test(idStr);
    };

    // Get all conversations for the current user
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate({
        path: "lastMessage",
        select: "content messageType mediaUrl createdAt sender",
      })
      .sort({ lastMessageTime: -1 })
      .lean();

    // Get other participants
    const otherParticipantIds = conversations.map(conv => 
      conv.participants.find(p => p.toString() !== req.user.id)
    ).filter(id => id);

    // Separate valid ObjectIds (Users) from fleetAccountIds (Vehicles)
    const userIds = otherParticipantIds.filter(id => isValidObjectId(id));

    // Fetch User details and filter only drivers
    const users = await User.find({ 
      _id: { $in: userIds },
      userType: 'driver' // Only get drivers
    }).select("name avatar userType isOnline lastSeen").lean();
    
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Fetch Vehicle details for drivers
    const driverUserIds = users.map(u => u._id.toString());
    const vehicles = await Vehicle.find({ 
      driverUser: { $in: driverUserIds },
      lastLogin: { $exists: true, $ne: null },
      isAccountActive: true
    }).select("fleetAccountId driverName imageUrls driverUser").populate("driverUser", "_id name avatar isOnline lastSeen").lean();
    
    const vehicleMap = new Map(vehicles.map(vehicle => [vehicle.driverUser?._id?.toString(), vehicle]));

    // Format conversations for frontend - only include driver conversations
    const formattedConversations = conversations.map((conv) => {
      const otherParticipantId = conv.participants.find(p => p.toString() !== req.user.id);
      let otherParticipant = null;

      if (isValidObjectId(otherParticipantId)) {
        // Check if this is a driver
        otherParticipant = userMap.get(otherParticipantId.toString());
        
        if (otherParticipant) {
          // Get vehicle info if available
          const vehicle = vehicleMap.get(otherParticipantId.toString());
          if (vehicle) {
            otherParticipant = {
              _id: otherParticipant._id,
              name: otherParticipant.name || vehicle.driverName,
              avatar: otherParticipant.avatar || vehicle.imageUrls?.[0] || null,
              userType: 'driver',
              isOnline: otherParticipant.isOnline || false,
              lastSeen: otherParticipant.lastSeen || new Date(),
            };
          }
        }
      }

      // Skip if not a driver conversation
      if (!otherParticipant) {
        return null;
      }

      return {
        _id: conv._id,
        participant: {
          _id: otherParticipant._id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
          userType: otherParticipant.userType,
          isOnline: otherParticipant.isOnline || false,
          lastSeen: otherParticipant.lastSeen,
        },
        lastMessage: conv.lastMessage
          ? {
              content: conv.lastMessage.content,
              messageType: conv.lastMessage.messageType,
              mediaUrl: conv.lastMessage.mediaUrl,
              createdAt: conv.lastMessage.createdAt,
              isSender: conv.lastMessage.sender.toString() === req.user.id,
            }
          : null,
        unreadCount: conv.unreadCount?.[req.user.id] || 0,
        lastMessageTime: conv.lastMessageTime,
      };
    }).filter(conv => conv !== null);

    res.json(formattedConversations);
  } catch (err) {
    console.error("Error in GET /conversations/fleet:", err);
    res.status(500).json({ msg: "Server Error", details: err.message });
  }
});
```

## مميزات الحل

1. **تصفية دقيقة**: يجلب فقط المحادثات مع المستخدمين من نوع `driver`
2. **دمج بيانات المركبات**: يدمج معلومات السائق مع معلومات المركبة (الصورة، الاسم)
3. **معالجة الأخطاء**: يتعامل مع الحالات الاستثنائية بشكل صحيح
4. **الأداء**: يستخدم `lean()` لتحسين الأداء
5. **التوافقية**: يعمل مع الهيكل الحالي للواجهة الأمامية

## الواجهة الأمامية

الواجهة الأمامية لا تحتاج إلى تعديل، لأنها كانت تستخدم بالفعل الدالة الصحيحة:

```typescript
const fleetConversations = await fetchFleetConversations();
```

والتي تستدعي:
```typescript
export async function fetchFleetConversations() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const response = await fetch(`${API_BASE_URL}/chat/conversations/fleet`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch fleet conversations');
    return response.json();
}
```

## الاختبار

للتأكد من نجاح الإصلاح:

1. تسجيل الدخول كمدير أسطول
2. الانتقال إلى تبويب "الأسطول" (Status Tab)
3. التحقق من ظهور قائمة السائقين
4. التحقق من عدم وجود أخطاء في الكونسول
5. اختبار النقر على محادثة سائق والتأكد من فتحها بشكل صحيح

## الملفات المعدلة

- `routes/chatRoutes.js`: إضافة endpoint جديد `/conversations/fleet`

## ملاحظات إضافية

- الـ endpoint الجديد يستخدم نفس آلية المصادقة `protectUnified`
- يتم فلترة المحادثات على مستوى قاعدة البيانات لتحسين الأداء
- يتم التحقق من أن السائق قد سجل الدخول مرة واحدة على الأقل (`lastLogin` موجود)
- يتم التحقق من أن الحساب نشط (`isAccountActive: true`)
