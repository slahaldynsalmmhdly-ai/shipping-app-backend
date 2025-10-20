const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/chat";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|m4a|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// @desc    Get all conversations for the logged-in user
// @route   GET /api/v1/chat/conversations
// @access  Private
router.get("/conversations", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate("participants", "name avatar userType")
      .populate({
        path: "lastMessage",
        select: "content messageType mediaUrl createdAt sender",
      })
      .sort({ lastMessageTime: -1 });

    // Format conversations for frontend
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== req.user.id
      );

      return {
        _id: conv._id,
        participant: {
          _id: otherParticipant._id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
          userType: otherParticipant.userType,
        },
        lastMessage: conv.lastMessage
          ? {
              content: conv.lastMessage.content,
              messageType: conv.lastMessage.messageType,
              mediaUrl: conv.lastMessage.mediaUrl,
              createdAt: conv.lastMessage.createdAt,
              isSender: conv.lastMessage.sender.toString() === req.user.id,
            }
          : null,
        unreadCount: conv.unreadCount.get(req.user.id) || 0,
        lastMessageTime: conv.lastMessageTime,
      };
    });

    res.json(formattedConversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get or create a conversation with another user
// @route   POST /api/v1/chat/conversations
// @access  Private
router.post("/conversations", protect, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ msg: "Participant ID is required" });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] },
    })
      .populate("participants", "name avatar userType")
      .populate({
        path: "lastMessage",
        select: "content messageType mediaUrl createdAt sender",
      });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [req.user.id, participantId],
        unreadCount: new Map([
          [req.user.id, 0],
          [participantId, 0],
        ]),
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name avatar userType")
        .populate({
          path: "lastMessage",
          select: "content messageType mediaUrl createdAt sender",
        });
    }

    // Format conversation for frontend
    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== req.user.id
    );

    const formattedConversation = {
      _id: conversation._id,
      participant: {
        _id: otherParticipant._id,
        name: otherParticipant.name,
        avatar: otherParticipant.avatar,
        userType: otherParticipant.userType,
      },
      lastMessage: conversation.lastMessage
        ? {
            content: conversation.lastMessage.content,
            messageType: conversation.lastMessage.messageType,
            mediaUrl: conversation.lastMessage.mediaUrl,
            createdAt: conversation.lastMessage.createdAt,
            isSender: conversation.lastMessage.sender.toString() === req.user.id,
          }
        : null,
      unreadCount: conversation.unreadCount.get(req.user.id) || 0,
      lastMessageTime: conversation.lastMessageTime,
    };

    res.json(formattedConversation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get messages for a specific conversation
// @route   GET /api/v1/chat/conversations/:conversationId/messages
// @access  Private
router.get("/conversations/:conversationId/messages", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Get messages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user.id },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark messages as read
    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender._id.toString() !== req.user.id &&
        !msg.readBy.includes(req.user.id)
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((m) => m._id) },
        },
        {
          $addToSet: { readBy: req.user.id },
        }
      );

      // Update unread count in conversation
      const currentUnreadCount = conversation.unreadCount.get(req.user.id) || 0;
      conversation.unreadCount.set(
        req.user.id,
        Math.max(0, currentUnreadCount - unreadMessages.length)
      );
      await conversation.save();
    }

    // Format messages for frontend
    const formattedMessages = messages.reverse().map((msg) => ({
      _id: msg._id,
      sender: {
        _id: msg.sender._id,
        name: msg.sender.name,
        avatar: msg.sender.avatar,
      },
      messageType: msg.messageType,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      mediaThumbnail: msg.mediaThumbnail,
      mediaSize: msg.mediaSize,
      mediaDuration: msg.mediaDuration,
      isRead: msg.readBy.length > 1, // More than just the sender
      isSender: msg.sender._id.toString() === req.user.id,
      createdAt: msg.createdAt,
    }));

    const totalMessages = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: req.user.id },
    });

    res.json({
      messages: formattedMessages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMessages / parseInt(limit)),
        totalMessages,
        hasMore: skip + formattedMessages.length < totalMessages,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Send a text message
// @route   POST /api/v1/chat/conversations/:conversationId/messages
// @access  Private
router.post("/conversations/:conversationId/messages", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ msg: "Message content is required" });
    }

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      messageType: "text",
      content: content.trim(),
      readBy: [req.user.id],
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageTime = message.createdAt;

    // Update unread count for other participants
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user.id) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    // Populate sender info
    await message.populate("sender", "name avatar");

    // Format message for frontend
    const formattedMessage = {
      _id: message._id,
      sender: {
        _id: message.sender._id,
        name: message.sender.name,
        avatar: message.sender.avatar,
      },
      messageType: message.messageType,
      content: message.content,
      isRead: false,
      isSender: true,
      createdAt: message.createdAt,
    };

    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Send a media message (image, video, audio)
// @route   POST /api/v1/chat/conversations/:conversationId/media
// @access  Private
router.post(
  "/conversations/:conversationId/media",
  protect,
  upload.single("file"),
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { messageType, mediaDuration } = req.body;

      if (!req.file) {
        return res.status(400).json({ msg: "File is required" });
      }

      // Check if conversation exists and user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ msg: "Conversation not found" });
      }

      if (!conversation.participants.includes(req.user.id)) {
        return res.status(403).json({ msg: "Access denied" });
      }

      // Determine message type from file
      let detectedMessageType = messageType;
      if (!detectedMessageType) {
        const mimeType = req.file.mimetype;
        if (mimeType.startsWith("image/")) {
          detectedMessageType = "image";
        } else if (mimeType.startsWith("video/")) {
          detectedMessageType = "video";
        } else if (mimeType.startsWith("audio/")) {
          detectedMessageType = "audio";
        } else {
          detectedMessageType = "file";
        }
      }

      // Create message
      const message = await Message.create({
        conversation: conversationId,
        sender: req.user.id,
        messageType: detectedMessageType,
        mediaUrl: `/uploads/chat/${req.file.filename}`,
        mediaSize: req.file.size,
        mediaDuration: mediaDuration ? parseInt(mediaDuration) : null,
        readBy: [req.user.id],
      });

      // Update conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageTime = message.createdAt;

      // Update unread count for other participants
      conversation.participants.forEach((participantId) => {
        if (participantId.toString() !== req.user.id) {
          const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
          conversation.unreadCount.set(participantId.toString(), currentCount + 1);
        }
      });

      await conversation.save();

      // Populate sender info
      await message.populate("sender", "name avatar");

      // Format message for frontend
      const formattedMessage = {
        _id: message._id,
        sender: {
          _id: message.sender._id,
          name: message.sender.name,
          avatar: message.sender.avatar,
        },
        messageType: message.messageType,
        mediaUrl: message.mediaUrl,
        mediaSize: message.mediaSize,
        mediaDuration: message.mediaDuration,
        isRead: false,
        isSender: true,
        createdAt: message.createdAt,
      };

      res.status(201).json(formattedMessage);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @desc    Delete a message for the current user
// @route   DELETE /api/v1/chat/messages/:messageId
// @access  Private
router.delete("/messages/:messageId", protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(req.user.id)) {
      message.deletedFor.push(req.user.id);
      await message.save();
    }

    res.json({ msg: "Message deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Mark conversation as read
// @route   PUT /api/v1/chat/conversations/:conversationId/read
// @access  Private
router.put("/conversations/:conversationId/read", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Mark all messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user.id },
        readBy: { $ne: req.user.id },
      },
      {
        $addToSet: { readBy: req.user.id },
      }
    );

    // Reset unread count
    conversation.unreadCount.set(req.user.id, 0);
    await conversation.save();

    res.json({ msg: "Conversation marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

