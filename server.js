const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes"); // Added vehicleRoutes
const uploadRoutes = require("./routes/uploadRoutes"); // Added uploadRoutes
const postRoutes = require("./routes/postRoutes"); // Added postRoutes
const shipmentAdRoutes = require("./routes/shipmentAdRoutes"); // Added shipmentAdRoutes
const emptyTruckAdRoutes = require("./routes/emptyTruckAdRoutes"); // Added emptyTruckAdRoutes
const userRoutes = require("./routes/userRoutes"); // Added userRoutes
const exploreRoutes = require("./routes/exploreRoutes"); // Added exploreRoutes
const chatRoutes = require("./routes/chatRoutes"); // Added chatRoutes
const typingIndicatorRoutes = require("./routes/typingIndicator"); // Added typingIndicator
const onlineStatusRoutes = require("./routes/onlineStatus"); // Added onlineStatus
const searchRoutes = require("./routes/searchRoutes"); // Added searchRoutes
const callLogRoutes = require("./routes/callLogRoutes"); // Added callLogRoutes
const reportRoutes = require("./routes/reportRoutes"); // Added reportRoutes
const adminAuthRoutes = require("./routes/adminAuthRoutes"); // Added adminAuthRoutes
const followRoutes = require("./routes/followRoutes"); // Added followRoutes
const feedRoutes = require("./routes/feedRoutes"); // Added feedRoutes
const hashtagRoutes = require("./routes/hashtagRoutes"); // Added hashtagRoutes
const mentionRoutes = require("./routes/mentionRoutes"); // Added mentionRoutes
const storyRoutes = require("./routes/storyRoutes"); // Added storyRoutes
const pricingRoutes = require("./routes/pricingRoutes"); // Added pricingRoutes
const distanceRoutes = require("./routes/distanceRoutes"); // Added distanceRoutes
const chatProfileRoutes = require("./routes/chatProfileRoutes"); // Added chatProfileRoutes
const phoneVerificationRoutes = require("./routes/phoneVerificationRoutes"); // Added phoneVerificationRoutes
const passport = require("passport");
const cookieSession = require("cookie-session");
const path = require("path"); // Added path module
const cors = require("cors");

// Load env vars
dotenv.config();

// Passport config
require("./config/passport");

// Connect to database
connectDB();

// Fix old content without isPublished field (run once)
const { fixOldContent } = require('./utils/fixOldContent');
setTimeout(() => {
  fixOldContent();
}, 3000); // Wait 3 seconds for DB connection to be ready

// Start Content Scheduler for scheduled posts and ads
const { startContentScheduler } = require('./utils/contentScheduler');
startContentScheduler();

// Repost Empty Trucks Scheduler removed


const app = express();

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Cookie session for Google OAuth
app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    keys: [process.env.COOKIE_KEY],
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static uploaded files - MUST be before routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/reviews", reviewRoutes); // Changed to /api/reviews for clarity
app.use("/api/vehicles", vehicleRoutes); // Changed to /api/vehicles for clarity
app.use("/api/upload", uploadRoutes); // Mount upload routes
app.use("/api/v1/posts", postRoutes); // Mount post routes
app.use("/api/v1/shipmentads", shipmentAdRoutes); // Mount shipment ad routes
app.use("/api/v1/emptytruckads", emptyTruckAdRoutes); // Mount empty truck ad routes
app.use("/api/v1/users", userRoutes); // Mount user routes
app.use("/api/v1/explore", exploreRoutes); // Mount explore routes
app.use("/api/v1/chat", chatRoutes); // Mount chat routes
app.use("/api/v1/chat", typingIndicatorRoutes); // Mount typing indicator routes
app.use("/api/v1", onlineStatusRoutes); // Mount online status routes
app.use("/api/v1/search", searchRoutes); // Mount search routes
app.use("/api/v1/call-logs", callLogRoutes); // Mount call log routes
app.use("/api/v1/reports", reportRoutes); // Mount report routes
app.use("/api/admin", adminAuthRoutes); // Mount admin auth routes
app.use("/api/v1/follow", followRoutes); // Mount follow routes
app.use("/api/v1/feed", feedRoutes); // Mount feed routes
app.use("/api/v1/hashtags", hashtagRoutes); // Mount hashtag routes
app.use("/api/v1/mentions", mentionRoutes); // Mount mention routes
app.use("/api/v1/stories", storyRoutes); // Mount story routes
app.use("/api/v1/pricing", pricingRoutes); // Mount pricing routes
app.use("/api/v1/distance", distanceRoutes); // Mount distance routes
app.use("/api/v1/chat-profile", chatProfileRoutes); // Mount chat profile routes
app.use("/api/v1/phone-verification", phoneVerificationRoutes); // Mount phone verification routes

// PeerJS Server Setup (must be before 404 handler)
const { ExpressPeerServer } = require('peer');

// Health check / Ping endpoint to keep server awake
app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is awake", timestamp: new Date().toISOString() });
});

// Note: PeerJS route will be added after server starts

// Catch-all for 404 Not Found - MUST be after all routes and static files
app.use((req, res, next) => {
  res.status(404).json({ message: "Not Found" });
});

// Basic error handling middleware (for asyncHandler)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

// Initialize Telegram Bot
const { initBot } = require('./services/telegramBot');
initBot();

// PeerJS Server for Video/Audio Calls
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  allow_discovery: true,
  proxied: true,
  alive_timeout: 60000,
  key: 'peerjs',
  concurrent_limit: 5000,
});

// Mount PeerJS server (bypasses Express middleware)
server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/peerjs')) {
    peerServer.handle(request, socket, head);
  }
});

peerServer.on('connection', (client) => {
  console.log(`PeerJS client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`PeerJS client disconnected: ${client.getId()}`);
});

console.log('PeerJS Server is running on /peerjs');

// Socket.IO Setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store online users: { userId: socketId }
const onlineUsers = new Map();

// Make onlineUsers and io available globally
app.set('onlineUsers', onlineUsers);
app.set('io', io);

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // User joins
  socket.on('user:join', async (data) => {
    const userId = data.userId;
    try {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      
      // انضمام المستخدم إلى غرفته الخاصة (لاستقبال conversation:updated)
      socket.join(userId);
      
      // تحديث قاعدة البيانات
      const User = require('./models/User');
      const user = await User.findById(userId);
      if (user) {
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        console.log(`✅ Updated DB: User ${userId} is now online`);
      }
      
      console.log(`👤 User ${userId} is now online and joined room ${userId}`);
      
      // إرسال قائمة جميع المستخدمين المتصلين للمستخدم الجديد
      const onlineUsersList = Array.from(onlineUsers.keys()).filter(id => id !== userId);
      socket.emit('users:online-list', onlineUsersList);
      console.log(`📝 Sent online users list to ${userId}:`, onlineUsersList);
      
      // Broadcast to all OTHER users that this user is online
      socket.broadcast.emit('user:online', { userId, isOnline: true });
      console.log(`📡 Broadcasted online status for ${userId}`);

      // ===== إرسال حالة الحظر الأولية لجميع المستخدمين المتصلين =====
      const onlineUserIds = Array.from(onlineUsers.keys());
      const usersToCheck = await User.find({ _id: { $in: onlineUserIds } }).select('blockedUsers');
      const userMap = new Map(usersToCheck.map(u => [u._id.toString(), u.blockedUsers.map(b => b.toString())]));

      // إرسال حالة الحظر للمستخدم الحالي (من حظره)
      const currentUserBlocked = userMap.get(userId) || [];
      const blockedByMe = onlineUserIds.filter(id => currentUserBlocked.includes(id));
      socket.emit('block:initial-status', { blockedByMe });
      
      // إرسال حالة الحظر للمستخدمين الآخرين (من حظرهم)
      for (const otherUserId of onlineUserIds) {
        if (otherUserId !== userId) {
          const otherUserBlocked = userMap.get(otherUserId) || [];
          if (otherUserBlocked.includes(userId)) {
            // المستخدم الحالي محظور من قبل otherUserId
            socket.emit('user:blocked', { blockerId: otherUserId, conversationId: null }); // conversationId is null as it's a global status
          }
        }
      }
      console.log(`📡 Sent initial block status for ${userId}`);
      
    } catch (error) {
      console.error(`❌ Error in user:join for ${userId}:`, error.message);
    }
  });

  // User typing
  socket.on('user:typing', ({ conversationId, userId, isTyping }) => {
    console.log(`✍️ User ${userId} typing in ${conversationId}: ${isTyping}`);
    socket.to(conversationId).emit('user:typing', { userId, isTyping });
  });

  // AI Bot events removed

  // Join conversation room
  socket.on('conversation:join', (conversationId) => {
    socket.join(conversationId);
    console.log(`💬 User joined conversation: ${conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(conversationId);
    console.log(`🚪 User left conversation: ${conversationId}`);
  });

  // New message
  socket.on('message:send', (data) => {
    console.log(`📨 New message in ${data.conversationId}`);
    socket.to(data.conversationId).emit('message:new', data);
  });

  // ===== إضافة أحداث الحظر =====
  const User = require('./models/User'); // تأكد من استيراد موديل المستخدم

  // حظر مستخدم
  socket.on('user:block', async (data) => {
    const { targetUserId, conversationId } = data;
    try {
      const currentUserId = socket.userId; // تأكد أن socket.userId موجود من user:join
      
      // 1. تحديث قاعدة البيانات (المستخدم الحالي يحظر الآخر)
      const user = await User.findById(currentUserId);
      if (!user.blockedUsers.some(id => id.toString() === targetUserId)) {
        user.blockedUsers.push(targetUserId);
        await user.save();
      }
      
      // 2. إرسال إشعار للمستخدم الذي قام بالحظر (تأكيد النجاح)
      socket.emit('user:block:success', { blockedId: targetUserId, conversationId });
      
      // 3. إرسال إشعار للمستخدم المحظور (تحديث فوري)
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('user:blocked', {
          blockerId: currentUserId,
          conversationId
        });
      }
      
    } catch (error) {
      console.error('Error blocking user via socket:', error);
      socket.emit('user:block:error', { error: error.message });
    }
  });

  // فك الحظر
  socket.on('user:unblock', async (data) => {
    const { targetUserId, conversationId } = data;
    try {
      const currentUserId = socket.userId;
      
      // 1. تحديث قاعدة البيانات (المستخدم الحالي يفك الحظر)
      const user = await User.findById(currentUserId);
      user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== targetUserId
      );
      await user.save();
      
      // 2. إرسال إشعار للمستخدم الذي قام بفك الحظر (تأكيد النجاح)
      socket.emit('user:unblock:success', { unblockedId: targetUserId, conversationId });
      
      // 3. إرسال إشعار للمستخدم الذي تم فك حظره (تحديث فوري)
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('user:unblocked', {
          unblockerId: currentUserId,
          conversationId
        });
      }
      
    } catch (error) {
      console.error('Error unblocking user via socket:', error);
      socket.emit('user:unblock:error', { error: error.message });
    }
  });

  // ==================== VOICE CALL EVENTS ====================

// Call answer - قبول المكالمة
  socket.on('call:answer', async ({ callerId }) => {
    console.log(`✅ Call answered by receiver for caller ${callerId}`);
    const callerSocketId = onlineUsers.get(callerId);
    
    // تحديث حالة المكالمة إلى answered
    try {
      const CallLog = require('./models/CallLog');
      const callerSocket = io.sockets.sockets.get(callerSocketId);
      if (callerSocket && callerSocket.activeCalls && callerSocket.activeCalls[socket.userId]) {
        await CallLog.findByIdAndUpdate(callerSocket.activeCalls[socket.userId], {
          status: 'answered'
        });
        console.log(`💾 Call log updated to answered`);
      }
    } catch (err) {
      console.error('Error updating call log:', err);
    }
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:answered', {
        receiverId: socket.userId
      });
      console.log(`📲 Answer notification sent to ${callerId}`);
    }
  });

  // Call reject - رفض المكالمة
  socket.on('call:reject', async ({ callerId }) => {
    console.log(`❌ Call rejected by receiver for caller ${callerId}`);
    const callerSocketId = onlineUsers.get(callerId);
    
    // تحديث حالة المكالمة إلى rejected (تعتبر missed للمستقبل)
    try {
      const CallLog = require('./models/CallLog');
      const callerSocket = io.sockets.sockets.get(callerSocketId);
      if (callerSocket && callerSocket.activeCalls && callerSocket.activeCalls[socket.userId]) {
        await CallLog.findByIdAndUpdate(callerSocket.activeCalls[socket.userId], {
          status: 'missed',
          endedAt: new Date(),
          isRead: false
        });
        console.log(`💾 Call log updated to missed (rejected)`);
        
        // إرسال إشعار للمستقبل بأن هناك مكالمة فائتة
        const receiverSocketId = onlineUsers.get(socket.userId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call:missed');
          console.log(`🔔 Missed call notification sent to ${socket.userId}`);
        }
      }
    } catch (err) {
      console.error('Error updating call log:', err);
    }
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:rejected', {
        receiverId: socket.userId
      });
      console.log(`🚫 Rejection notification sent to ${callerId}`);
    }
  });

  // Call end - إنهاء المكالمة
  socket.on('call:end', async ({ partnerId, targetId, callId, callLogId, duration }) => {
    const finalTargetId = partnerId || targetId;
    const finalCallId = callLogId || callId;
    console.log(`📴 Call ended by ${socket.userId} with ${finalTargetId}`);
    const targetSocketId = onlineUsers.get(finalTargetId);
    
    // تحديث حالة المكالمة إلى completed مع المدة
    try {
      const CallLog = require('./models/CallLog');
      
      // البحث عن سجل المكالمة
      if (socket.activeCalls && socket.activeCalls[targetId]) {
        await CallLog.findByIdAndUpdate(socket.activeCalls[targetId], {
          status: duration > 0 ? 'completed' : 'cancelled',
          duration: duration || 0,
          endedAt: new Date()
        });
        delete socket.activeCalls[targetId];
        console.log(`💾 Call log updated to completed with duration ${duration}s`);
      }
    } catch (err) {
      console.error('Error updating call log:', err);
    }
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:end', {
        userId: socket.userId,
        callLogId: finalCallId,
        duration
      });
      console.log(`🔚 End notification sent to ${targetId}`);
    }
  });

  // Call busy - المستخدم مشغول
  socket.on('call:busy', async ({ callerId }) => {
    console.log(`📵 User ${socket.userId} is busy, notifying ${callerId}`);
    const callerSocketId = onlineUsers.get(callerId);
    
    // تحديث حالة المكالمة إلى missed (المستخدم مشغول)
    try {
      const CallLog = require('./models/CallLog');
      const callerSocket = io.sockets.sockets.get(callerSocketId);
      if (callerSocket && callerSocket.activeCalls && callerSocket.activeCalls[socket.userId]) {
        await CallLog.findByIdAndUpdate(callerSocket.activeCalls[socket.userId], {
          status: 'missed',
          endedAt: new Date(),
          isRead: false
        });
        console.log(`💾 Call log updated to missed (busy)`);
        
        // إرسال إشعار للمستقبل بأن هناك مكالمة فائتة
        const receiverSocketId = onlineUsers.get(socket.userId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call:missed');
          console.log(`🔔 Missed call notification sent to ${socket.userId}`);
        }
      }
    } catch (err) {
      console.error('Error updating call log:', err);
    }
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:user-busy', {
        receiverId: socket.userId
      });
    }
  });

  // Call no-answer - لم يتم الرد على المكالمة
  socket.on('call:no-answer', async ({ callerId }) => {
    console.log(`⏰ No answer from ${socket.userId} for caller ${callerId}`);
    const callerSocketId = onlineUsers.get(callerId);
    
    // تحديث حالة المكالمة إلى missed
    try {
      const CallLog = require('./models/CallLog');
      const callerSocket = io.sockets.sockets.get(callerSocketId);
      if (callerSocket && callerSocket.activeCalls && callerSocket.activeCalls[socket.userId]) {
        await CallLog.findByIdAndUpdate(callerSocket.activeCalls[socket.userId], {
          status: 'missed',
          endedAt: new Date(),
          isRead: false
        });
        console.log(`💾 Call log updated to missed`);
        
        // إرسال إشعار للمستقبل بأن هناك مكالمة فائتة
        const receiverSocketId = onlineUsers.get(socket.userId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call:missed');
          console.log(`🔔 Missed call notification sent to ${socket.userId}`);
        }
      }
    } catch (err) {
      console.error('Error updating call log:', err);
    }
  });

    // Call initiate - بدء المكالمة
  socket.on('call:initiate', async ({ receiverId, callerInfo, callType }, callback) => {
    console.log(`📞 Call initiate from ${socket.userId} to ${receiverId}`);
    
    // 1. التحقق من حالة المستخدم المستقبل (Busy/Offline)
    const receiverSocketId = onlineUsers.get(receiverId);
    if (!receiverSocketId) {
      // إذا كان غير متصل، يجب إبلاغ المتصل بالفشل
      return callback({ success: false, error: 'offline' });
    }
    
    // 2. التحقق من حالة المكالمة الحالية للمستقبل (للتأكد من أنه ليس في مكالمة أخرى)
    // هذا يتطلب تتبع حالة المكالمة، لكن حالياً سنعتمد على وجوده في قائمة المتصلين
    
    // 3. إنشاء سجل مكالمة في قاعدة البيانات
    try {
      const CallLog = require('./models/CallLog');
      const newCallLog = await CallLog.create({
        caller: socket.userId,
        receiver: receiverId,
        callType: callType,
        status: 'connecting',
        startedAt: new Date()
      });
      
      // 4. إرسال إشعار المكالمة الواردة
      io.to(receiverSocketId).emit('call:incoming', {
        callerInfo: callerInfo,
        callType: callType,
        callLogId: newCallLog._id.toString()
      });
      
      // 5. إبلاغ المتصل بالنجاح وتمرير callLogId
      callback({ success: true, callLogId: newCallLog._id.toString() });
      
      // 6. تتبع المكالمة النشطة للمتصل
      if (!socket.activeCalls) {
        socket.activeCalls = {};
      }
      socket.activeCalls[receiverId] = newCallLog._id.toString();
      
      console.log(`✅ Call initiated and incoming signal sent to ${receiverId} with log ID ${newCallLog._id}`);
      
    } catch (err) {
      console.error('Error initiating call:', err);
      callback({ success: false, error: 'server_error' });
    }
  });

  // Call accept - قبول المكالمة
  socket.on('call:accept', async ({ receiverId, callLogId }) => {
    console.log(`✅ Call accepted by ${socket.userId} for caller ${receiverId}`);
    const callerSocketId = onlineUsers.get(receiverId);
    
    // تحديث سجل المكالمة في قاعدة البيانات
    if (callLogId) {
      try {
        const CallLog = require('./models/CallLog');
        const callLog = await CallLog.findById(callLogId);
        if (callLog) {
          callLog.status = 'answered';
          callLog.answeredAt = new Date();
          await callLog.save();
          console.log(`✅ CallLog ${callLogId} updated to answered`);
        }
      } catch (err) {
        console.error('Error updating call log:', err);
      }
    }
    
    // إخطار المتصل بأن المكالمة تم قبولها
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:accepted', {
        receiverId: socket.userId,
        callLogId: callLogId
      });
      console.log(`📲 Call accepted notification sent to ${receiverId}`);
    } else {
      console.log(`❌ Caller ${receiverId} not found online`);
    }
  });

  // ==================== WEBRTC SIGNALING ====================
  
  // WebRTC Offer - إرسال offer من المتصل إلى المستقبل
  socket.on('webrtc:offer', ({ partnerId, receiverId, offer }) => {
    const targetId = partnerId || receiverId;
    console.log(`📡 WebRTC offer from ${socket.userId} to ${targetId}`);
    const receiverSocketId = onlineUsers.get(targetId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc:offer', {
        callerId: socket.userId,
        offer: offer
      });
      console.log(`✅ Offer sent to ${targetId}`);
    } else {
      console.log(`❌ Receiver ${receiverId} not found`);
    }
  });

  // WebRTC Answer - إرسال answer من المستقبل إلى المتصل
  socket.on('webrtc:answer', ({ partnerId, callerId, answer }) => {
    const targetId = partnerId || callerId;
    console.log(`📡 WebRTC answer from ${socket.userId} to ${targetId}`);
    const callerSocketId = onlineUsers.get(targetId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('webrtc:answer', {
        answer: answer
      });
      console.log(`✅ Answer sent to ${targetId}`);
    } else {
      console.log(`❌ Caller ${targetId} not found`);
    }
  });

  // WebRTC ICE Candidate - تبادل ICE candidates
  socket.on('webrtc:ice-candidate', ({ partnerId, targetId, candidate }) => {
    const finalTargetId = partnerId || targetId;
    console.log(`🧊 ICE candidate from ${socket.userId} to ${finalTargetId}`);
    const targetSocketId = onlineUsers.get(finalTargetId);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        candidate: candidate
      });
      console.log(`✅ ICE candidate sent to ${finalTargetId}`);
    } else {
      console.log(`❌ Target ${finalTargetId} not found`);
    }
  });
  
  // ==================== END VOICE CALL EVENTS ====================

  // Disconnect
  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        onlineUsers.delete(socket.userId);
        
        // تحديث قاعدة البيانات
        const User = require('./models/User');
        const user = await User.findById(socket.userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          await user.save();
          console.log(`✅ Updated DB: User ${socket.userId} is now offline`);
        }
        
        console.log(`❌ User ${socket.userId} is now offline`);
        io.emit('user:online', { userId: socket.userId, isOnline: false });
      } catch (error) {
        console.error(`❌ Error in disconnect for ${socket.userId}:`, error.message);
      }
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Make io available globally
app.set('io', io);

console.log('🚀 Socket.IO is running');

