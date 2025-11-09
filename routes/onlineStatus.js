const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

// Note: We now use the onlineUsers Map from Socket.IO (server.js)
// This ensures consistency between Socket.IO and REST API

// Cleanup removed - Socket.IO handles online status now

// @desc    Update user's online status (heartbeat) - DEPRECATED
// @route   POST /api/v1/users/online-status
// @access  Private
// Note: This endpoint is deprecated. Use Socket.IO for real-time status.
router.post("/users/online-status", protect, async (req, res) => {
  try {
    res.json({ success: true, message: "Use Socket.IO for online status" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get online status for a specific user
// @route   GET /api/v1/users/:userId/online-status
// @access  Private
router.get("/users/:userId/online-status", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get onlineUsers Map from Socket.IO
    const onlineUsers = req.app.get('onlineUsers');
    
    if (onlineUsers && onlineUsers.has(userId)) {
      // User is connected via Socket.IO
      return res.json({
        isOnline: true,
        lastSeen: new Date()
      });
    }
    
    // Fallback to database
    const user = await User.findById(userId).select('isOnline lastSeen');
    if (user) {
      return res.json({
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen
      });
    }
    
    // User not found
    return res.json({
      isOnline: false,
      lastSeen: null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get online status for multiple users
// @route   POST /api/v1/users/online-status/batch
// @access  Private
router.post("/users/online-status/batch", protect, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: "userIds must be an array" });
    }

    // Get onlineUsers Map from Socket.IO
    const onlineUsers = req.app.get('onlineUsers');
    const statuses = {};

    for (const userId of userIds) {
      if (onlineUsers && onlineUsers.has(userId)) {
        // User is connected via Socket.IO
        statuses[userId] = {
          isOnline: true,
          lastSeen: new Date()
        };
      } else {
        // Fallback to database
        const user = await User.findById(userId).select('isOnline lastSeen');
        if (user) {
          statuses[userId] = {
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen
          };
        } else {
          statuses[userId] = {
            isOnline: false,
            lastSeen: null
          };
        }
      }
    }

    res.json(statuses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
