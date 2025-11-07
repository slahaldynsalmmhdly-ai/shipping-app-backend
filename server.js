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
const botSettingsRoutes = require("./routes/botSettingsRoutes"); // Added botSettingsRoutes
const botControlRoutes = require("./routes/botControlRoutes"); // Added botControlRoutes
const imageAnalysisRoutes = require("./routes/imageAnalysisRoutes"); // Added imageAnalysisRoutes
const pricingRoutes = require("./routes/pricingRoutes"); // Added pricingRoutes
const distanceRoutes = require("./routes/distanceRoutes"); // Added distanceRoutes
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
app.use("/api/v1/bot", botSettingsRoutes); // Mount bot settings routes
app.use("/api/v1/bot-control", botControlRoutes); // Mount bot control routes
app.use("/api/v1/analyze-image", imageAnalysisRoutes); // Mount image analysis routes
app.use("/api/v1/pricing", pricingRoutes); // Mount pricing routes
app.use("/api/v1/distance", distanceRoutes); // Mount distance routes

// Health check / Ping endpoint to keep server awake
app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is awake", timestamp: new Date().toISOString() });
});

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
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  allow_discovery: true,
  proxied: true,
  alive_timeout: 60000,
  key: 'peerjs',
  concurrent_limit: 5000,
});

app.use('/peerjs', peerServer);

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

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // User joins
  socket.on('user:join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    
    // انضمام المستخدم إلى غرفته الخاصة (لاستقبال conversation:updated)
    socket.join(userId);
    
    console.log(`👤 User ${userId} is now online and joined room ${userId}`);
    
    // Broadcast to all users that this user is online
    io.emit('user:online', { userId, isOnline: true });
  });

  // User typing
  socket.on('user:typing', ({ conversationId, userId, isTyping }) => {
    console.log(`✍️ User ${userId} typing in ${conversationId}: ${isTyping}`);
    socket.to(conversationId).emit('user:typing', { userId, isTyping });
  });

  // AI Bot typing
  socket.on('bot:typing', ({ conversationId, isTyping }) => {
    console.log(`🤖 Bot typing in ${conversationId}: ${isTyping}`);
    socket.to(conversationId).emit('bot:typing', { isTyping });
  });

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

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log(`❌ User ${socket.userId} is now offline`);
      io.emit('user:online', { userId: socket.userId, isOnline: false });
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Make io available globally
app.set('io', io);

console.log('🚀 Socket.IO is running');

