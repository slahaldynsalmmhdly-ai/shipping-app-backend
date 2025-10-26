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
const searchRoutes = require("./routes/searchRoutes"); // Added searchRoutes
const callLogRoutes = require("./routes/callLogRoutes"); // Added callLogRoutes
const reportRoutes = require("./routes/reportRoutes"); // Added reportRoutes
const aiFeaturesRoutes = require("./routes/aiFeaturesRoutes"); // Added aiFeaturesRoutes
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
app.use("/api/v1/search", searchRoutes); // Mount search routes
app.use("/api/v1/call-logs", callLogRoutes); // Mount call log routes
app.use("/api/v1/reports", reportRoutes); // Mount report routes
app.use("/api/v1/ai-features", aiFeaturesRoutes); // Mount AI features routes

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

