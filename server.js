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
// AI features routes removed
const followRoutes = require("./routes/followRoutes"); // Added followRoutes
const fleetAuthRoutes = require("./routes/fleetAuthRoutes"); // Added fleetAuthRoutes
const feedRoutes = require("./routes/feedRoutes"); // Added feedRoutes
const hashtagRoutes = require("./routes/hashtagRoutes"); // Added hashtagRoutes
const mentionRoutes = require("./routes/mentionRoutes"); // Added mentionRoutes
const storyRoutes = require("./routes/storyRoutes"); // Added storyRoutes
// AI Bot routes removed
const imageAnalysisRoutes = require("./routes/imageAnalysisRoutes"); // Added imageAnalysisRoutes
const pricingRoutes = require("./routes/pricingRoutes"); // Added pricingRoutes
const distanceRoutes = require("./routes/distanceRoutes"); // Added distanceRoutes
// AI Chat routes removed
const chatProfileRoutes = require("./routes/chatProfileRoutes"); // Added chatProfileRoutes
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

// AI Scheduler removed

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
// AI features routes removed
app.use("/api/v1/follow", followRoutes); // Mount follow routes
app.use("/api/fleet", fleetAuthRoutes); // Mount fleet auth routes
app.use("/api/v1/feed", feedRoutes); // Mount feed routes
app.use("/api/v1/hashtags", hashtagRoutes); // Mount hashtag routes
app.use("/api/v1/mentions", mentionRoutes); // Mount mention routes
app.use("/api/v1/stories", storyRoutes); // Mount story routes
// AI Bot routes removed
app.use("/api/v1/analyze-image", imageAnalysisRoutes); // Mount image analysis routes
app.use("/api/v1/pricing", pricingRoutes); // Mount pricing routes
app.use("/api/v1/distance", distanceRoutes); // Mount distance routes
// AI Chat routes removed
app.use("/api/v1/chat-profile", chatProfileRoutes); // Mount chat profile routes

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

// Make onlineUsers available globally
app.set('onlineUsers', onlineUsers);

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // User joins
  socket.on('user:join', async (userId) => {
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

  // ==================== VOICE CALL EVENTS ====================
  
  // Call initiate - بدء المكالمة
  socket.on('call:initiate', async ({ receiverId, callerInfo, callType }) => {
    console.log(`📞 Call initiated from ${callerInfo._id} to ${receiverId}`);
    const receiverSocketId = onlineUsers.get(receiverId);
    
    // حفظ سجل المكالمة في قاعدة البيانات
    let callLogId = null;
    try {
      const CallLog = require('./models/CallLog');
      const callLog = await CallLog.create({
        caller: callerInfo._id,
        receiver: receiverId,
        callType: callType || 'audio',
        status: 'connecting',
        startedAt: new Date(),
        isRead: false
      });
      
      callLogId = callLog._id.toString();
      
      // حفظ callId للاستخدام لاحقاً
      if (!socket.activeCalls) socket.activeCalls = {};
      socket.activeCalls[receiverId] = callLogId;
      
      console.log(`💾 Call log created: ${callLogId}`);
    } catch (err) {
      console.error('Error creating call log:', err);
      return; // الخروج إذا فشل إنشاء CallLog
    }
    
    if (receiverSocketId) {
      // إرسال إشعار بالمكالمة الواردة للمستقبل
      io.to(receiverSocketId).emit('call:incoming', {
        caller: callerInfo,
        callType: callType || 'audio'
      });
      console.log(`🔔 Call notification sent to ${receiverId}`);
    } else {
      // المستقبل غير متصل - تحديث حالة المكالمة إلى missed
      try {
        const CallLog = require('./models/CallLog');
        const { createCallNotification } = require('./utils/notificationHelper');
        
        // استخدام callLogId مباشرة بدلاً من socket.activeCalls
        await CallLog.findByIdAndUpdate(callLogId, {
          status: 'missed',
          endedAt: new Date(),
          isRead: false
        });
        
        // إنشاء إشعار للمكالمة الفائتة في قاعدة البيانات
        await createCallNotification(
          callerInfo._id,
          receiverId,
          callType || 'audio',
          callLogId
        );
        console.log(`📬 Missed call notification created for ${receiverId}`);
        
        // ملاحظة: لا يمكن إرسال call:missed للمستقبل لأنه غير متصل
        // سيتم تحديث badge عند اتصاله من جديد
      } catch (err) {
        console.error('Error updating call log:', err);
      }
      
      socket.emit('call:user-offline', { receiverId });
      console.log(`❌ Receiver ${receiverId} is offline`);
    }
  });

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
  socket.on('call:end', async ({ targetId, callId, duration }) => {
    console.log(`📴 Call ended by ${socket.userId} with ${targetId}`);
    const targetSocketId = onlineUsers.get(targetId);
    
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
      io.to(targetSocketId).emit('call:ended', {
        userId: socket.userId,
        callId,
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

  // ==================== WEBRTC SIGNALING ====================
  
  // WebRTC Offer - إرسال offer من المتصل إلى المستقبل
  socket.on('webrtc:offer', ({ receiverId, offer }) => {
    console.log(`📡 WebRTC offer from ${socket.userId} to ${receiverId}`);
    const receiverSocketId = onlineUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc:offer', {
        callerId: socket.userId,
        offer: offer
      });
      console.log(`✅ Offer sent to ${receiverId}`);
    } else {
      console.log(`❌ Receiver ${receiverId} not found`);
    }
  });

  // WebRTC Answer - إرسال answer من المستقبل إلى المتصل
  socket.on('webrtc:answer', ({ callerId, answer }) => {
    console.log(`📡 WebRTC answer from ${socket.userId} to ${callerId}`);
    const callerSocketId = onlineUsers.get(callerId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('webrtc:answer', {
        answer: answer
      });
      console.log(`✅ Answer sent to ${callerId}`);
    } else {
      console.log(`❌ Caller ${callerId} not found`);
    }
  });

  // WebRTC ICE Candidate - تبادل ICE candidates
  socket.on('webrtc:ice-candidate', ({ targetId, candidate }) => {
    console.log(`🧊 ICE candidate from ${socket.userId} to ${targetId}`);
    const targetSocketId = onlineUsers.get(targetId);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        candidate: candidate
      });
      console.log(`✅ ICE candidate sent to ${targetId}`);
    } else {
      console.log(`❌ Target ${targetId} not found`);
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

