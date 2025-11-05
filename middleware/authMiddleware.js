const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

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

module.exports = { protect, restrictTo };

