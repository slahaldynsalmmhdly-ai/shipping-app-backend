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

// Catch-all for 404 Not Found - MUST be before error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Not Found" });
});

// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic error handling middleware (for asyncHandler)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

