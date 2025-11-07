const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");

      // Check if user exists
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      next();
    } catch (error) {
      console.error(error);
      // إرجاع status code 401 بشكل صحيح بدلاً من throw Error
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    // إرجاع status code 401 بشكل صحيح بدلاً من throw Error
    return res.status(401).json({ message: "Not authorized, no token" });
  }
});

// Middleware to restrict access to specific user types
const restrictTo = (...userTypes) => {
  return (req, res, next) => {
    if (!userTypes.includes(req.user.userType)) {
      return res.status(403).json({
        message: `Access denied. Only ${userTypes.join(', ')} can access this resource.`
      });
    }
    next();
  };
};

// Unified middleware that supports both regular users and fleet drivers
const protectUnified = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if this is a fleet driver token
      if (decoded.type === 'fleet') {
        // Get vehicle/driver from the token using vehicleId
        const vehicleId = decoded.vehicleId || decoded.id; // Use vehicleId if available, fallback to id
        const vehicle = await Vehicle.findById(vehicleId)
          .select("-fleetPassword")
          .populate('user', 'name email companyName avatar');

        if (!vehicle) {
          return res.status(401).json({ message: "Not authorized, driver not found" });
        }

        // Set req.user with vehicle data
        // Use _id as the primary identifier for MongoDB compatibility
        req.user = {
          _id: vehicle._id,
          id: vehicle._id.toString(), // MongoDB ObjectId as string
          fleetAccountId: vehicle.fleetAccountId,
          name: vehicle.driverName,
          userType: 'driver',
          avatar: vehicle.imageUrls?.[0] || null,
          company: vehicle.user,
          vehicleId: vehicle._id,
          isFleet: true
        };
      } else {
        // Regular user token
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
          return res.status(401).json({ message: "Not authorized, user not found" });
        }

        // Ensure id field exists for compatibility
        req.user.id = req.user._id.toString();
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
});

module.exports = { protect, restrictTo, protectUnified };

