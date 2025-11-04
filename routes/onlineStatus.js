const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// In-memory storage for online status
// Structure: { userId: { lastSeen: timestamp, isOnline: boolean } }
const onlineStatus = new Map();

// Cleanup old online statuses (mark as offline if no activity for 30 seconds)
setInterval(() => {
  const now = Date.now();
  onlineStatus.forEach((status, userId) => {
    if (now - status.lastSeen > 30000) {
      status.isOnline = false;
    }
  });
}, 10000); // Check every 10 seconds

// @desc    Update user's online status (heartbeat)
// @route   POST /api/v1/users/online-status
// @access  Private
router.post("/users/online-status", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    onlineStatus.set(userId, {
      lastSeen: Date.now(),
      isOnline: true
    });

    res.json({ success: true });
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
    const now = Date.now();
    
    const status = onlineStatus.get(userId);
    
    if (!status) {
      return res.json({
        isOnline: false,
        lastSeen: null
      });
    }

    // Check if user is still considered online (activity within last 30 seconds)
    const isOnline = status.isOnline && (now - status.lastSeen < 30000);

    res.json({
      isOnline,
      lastSeen: status.lastSeen
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

    const now = Date.now();
    const statuses = {};

    userIds.forEach(userId => {
      const status = onlineStatus.get(userId);
      
      if (!status) {
        statuses[userId] = {
          isOnline: false,
          lastSeen: null
        };
      } else {
        const isOnline = status.isOnline && (now - status.lastSeen < 30000);
        statuses[userId] = {
          isOnline,
          lastSeen: status.lastSeen
        };
      }
    });

    res.json(statuses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
