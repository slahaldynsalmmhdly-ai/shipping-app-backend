const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes"); // Added vehicleRoutes
const uploadRoutes = require("./routes/uploadRoutes"); // Added uploadRoutes
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

