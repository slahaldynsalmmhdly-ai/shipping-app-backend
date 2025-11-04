const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// In-memory storage for typing status
// Structure: { conversationId: { userId: timestamp } }
const typingStatus = new Map();

// Cleanup old typing statuses (older than 5 seconds)
setInterval(() => {
  const now = Date.now();
  typingStatus.forEach((users, conversationId) => {
    Object.keys(users).forEach((userId) => {
      if (now - users[userId] > 5000) {
        delete users[userId];
      }
    });
    if (Object.keys(users).length === 0) {
      typingStatus.delete(conversationId);
    }
  });
}, 2000);

// @desc    Set typing status
// @route   POST /api/v1/chat/conversations/:conversationId/typing
// @access  Private
router.post("/conversations/:conversationId/typing", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { isTyping } = req.body;

    if (!typingStatus.has(conversationId)) {
      typingStatus.set(conversationId, {});
    }

    const conversationTyping = typingStatus.get(conversationId);

    if (isTyping) {
      conversationTyping[req.user.id] = Date.now();
    } else {
      delete conversationTyping[req.user.id];
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get typing status for a conversation
// @route   GET /api/v1/chat/conversations/:conversationId/typing
// @access  Private
router.get("/conversations/:conversationId/typing", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const now = Date.now();

    const conversationTyping = typingStatus.get(conversationId) || {};
    
    // Get all users typing (except current user) with valid timestamps
    const typingUsers = Object.keys(conversationTyping)
      .filter((userId) => {
        return (
          userId !== req.user.id &&
          now - conversationTyping[userId] < 5000
        );
      });

    res.json({
      isTyping: typingUsers.length > 0,
      typingUsers,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
