const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Review = require("../models/Review");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer with Cloudinary storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shipping-app/chat-images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },
});

// Configure multer with Cloudinary storage for videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shipping-app/chat-videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "webm", "mkv"],
  },
});

// Configure multer with Cloudinary storage for documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shipping-app/chat-documents",
    resource_type: "raw",
    allowed_formats: ["pdf", "doc", "docx", "xls", "xlsx", "txt", "ppt", "pptx"],
  },
});

// Multer upload for images
const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid image file type"));
    }
  },
});

// Multer upload for videos
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /mp4|mov|avi|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid video file type"));
    }
  },
});

// Multer upload for documents
const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for documents
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid document file type"));
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
      .populate("participants", "name avatar userType isOnline lastSeen")
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
          isOnline: otherParticipant.isOnline || false,
          lastSeen: otherParticipant.lastSeen || otherParticipant.updatedAt,
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
  uploadImage.single("media"),
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
        mediaUrl: req.file.path, // Cloudinary URL
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

// @desc    Send a video message
// @route   POST /api/v1/chat/conversations/:conversationId/video
// @access  Private
router.post(
  "/conversations/:conversationId/video",
  protect,
  uploadVideo.single("video"),
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, mediaDuration } = req.body;

      if (!req.file) {
        return res.status(400).json({ msg: "Video file is required" });
      }

      // Check if conversation exists and user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ msg: "Conversation not found" });
      }

      if (!conversation.participants.includes(req.user.id)) {
        return res.status(403).json({ msg: "Access denied" });
      }

      // Create video message
      const message = await Message.create({
        conversation: conversationId,
        sender: req.user.id,
        messageType: "video",
        content: content || "",
        mediaUrl: req.file.path, // Cloudinary URL
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
        content: message.content,
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

// @desc    Get conversation statistics
// @route   GET /api/v1/chat/conversations/:conversationId/stats
// @access  Private
router.get("/conversations/:conversationId/stats", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Count total messages
    const messagesCount = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: req.user.id },
    });

    // Count images
    const imagesCount = await Message.countDocuments({
      conversation: conversationId,
      messageType: "image",
      deletedFor: { $ne: req.user.id },
    });

    // Count links in text messages
    const textMessages = await Message.find({
      conversation: conversationId,
      messageType: "text",
      deletedFor: { $ne: req.user.id },
    }).select("content");

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const linksCount = textMessages.filter((msg) =>
      urlRegex.test(msg.content)
    ).length;

    res.json({
      messagesCount,
      imagesCount,
      linksCount,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get shared media in conversation
// @route   GET /api/v1/chat/conversations/:conversationId/media
// @access  Private
router.get("/conversations/:conversationId/media", protect, async (req, res) => {
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

    // Get media messages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const mediaMessages = await Message.find({
      conversation: conversationId,
      messageType: { $in: ["image", "file", "video", "audio"] },
      deletedFor: { $ne: req.user.id },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("mediaUrl messageType createdAt sender");

    // Count total media
    const totalMedia = await Message.countDocuments({
      conversation: conversationId,
      messageType: { $in: ["image", "file", "video", "audio"] },
      deletedFor: { $ne: req.user.id },
    });

    // Format media for frontend
    const formattedMedia = mediaMessages.map((msg) => ({
      _id: msg._id,
      mediaUrl: msg.mediaUrl,
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      sender: {
        _id: msg.sender._id,
        name: msg.sender.name,
      },
    }));

    res.json({
      media: formattedMedia,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMedia / parseInt(limit)),
        totalMedia,
        hasMore: skip + formattedMedia.length < totalMedia,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get user profile with conversation stats
// @route   GET /api/v1/chat/profile/:userId
// @access  Private
router.get("/profile/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { conversationId } = req.query;

    // Get user basic info
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Calculate rating and reviewCount
    const reviews = await Review.find({ user: userId });
    const rating =
      reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;
    const reviewCount = reviews.length;

    const userProfile = {
      ...user.toObject(),
      rating,
      reviewCount,
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen || user.updatedAt,
    };

    // If conversationId is provided, add conversation stats and shared media
    if (conversationId) {
      // Check if conversation exists and user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ msg: "Conversation not found" });
      }

      if (!conversation.participants.includes(req.user.id)) {
        return res.status(403).json({ msg: "Access denied" });
      }

      // Count total messages
      const messagesCount = await Message.countDocuments({
        conversation: conversationId,
        deletedFor: { $ne: req.user.id },
      });

      // Count images
      const imagesCount = await Message.countDocuments({
        conversation: conversationId,
        messageType: "image",
        deletedFor: { $ne: req.user.id },
      });

      // Count links in text messages
      const textMessages = await Message.find({
        conversation: conversationId,
        messageType: "text",
        deletedFor: { $ne: req.user.id },
      }).select("content");

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linksCount = textMessages.filter((msg) =>
        urlRegex.test(msg.content)
      ).length;

      // Get last 20 shared images
      const sharedMedia = await Message.find({
        conversation: conversationId,
        messageType: "image",
        deletedFor: { $ne: req.user.id },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("mediaUrl messageType createdAt");

      userProfile.conversationStats = {
        messagesCount,
        imagesCount,
        linksCount,
      };

      userProfile.sharedMedia = sharedMedia.map((msg) => ({
        _id: msg._id,
        mediaUrl: msg.mediaUrl,
        messageType: msg.messageType,
        createdAt: msg.createdAt,
      }));
    }

    res.json(userProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Edit a message (within 30 seconds)
// @route   PUT /api/v1/chat/messages/:messageId
// @access  Private
router.put("/messages/:messageId", protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "المحتوى مطلوب" });
    }

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "الرسالة غير موجودة" });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "غير مصرح لك بتعديل هذه الرسالة" });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({ message: "لا يمكن تعديل إلا الرسائل النصية" });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({ message: "لا يمكن تعديل رسالة محذوفة" });
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const thirtySeconds = 30 * 1000;

    if (messageAge > thirtySeconds) {
      return res.status(400).json({ message: "انتهت مدة التعديل (30 ثانية)" });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name avatar");

    res.json(updatedMessage);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// @desc    Delete message for everyone (within 24 hours)
// @route   DELETE /api/v1/chat/messages/:messageId/everyone
// @access  Private
router.delete("/messages/:messageId/everyone", protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "الرسالة غير موجودة" });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذه الرسالة" });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({ message: "الرسالة محذوفة بالفعل" });
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (messageAge > twentyFourHours) {
      return res.status(400).json({ message: "انتهت مدة الحذف للجميع (24 ساعة)" });
    }

    message.deletedForEveryone = true;
    message.content = "تم حذف هذه الرسالة";
    message.mediaUrl = null;
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name avatar");

    res.json(updatedMessage);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// @desc    Block a user
// @route   POST /api/v1/chat/block/:userId
// @access  Private
router.post("/block/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({ message: "لا يمكنك حظر نفسك" });
    }

    // Add to blockedUsers if not already blocked
    const user = await User.findById(currentUserId);
    if (!user.blockedUsers.includes(userId)) {
      user.blockedUsers.push(userId);
      await user.save();
    }

    // Also add current user to the other user's blockedUsers (mutual block)
    const otherUser = await User.findById(userId);
    if (otherUser && !otherUser.blockedUsers.includes(currentUserId)) {
      otherUser.blockedUsers.push(currentUserId);
      await otherUser.save();
    }

    res.json({ message: "تم حظر المستخدم بنجاح" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// @desc    Unblock a user
// @route   POST /api/v1/chat/unblock/:userId
// @access  Private
router.post("/unblock/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Remove from blockedUsers
    const user = await User.findById(currentUserId);
    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== userId
    );
    await user.save();

    // Also remove current user from the other user's blockedUsers (mutual unblock)
    const otherUser = await User.findById(userId);
    if (otherUser) {
      otherUser.blockedUsers = otherUser.blockedUsers.filter(
        (id) => id.toString() !== currentUserId
      );
      await otherUser.save();
    }

    res.json({ message: "تم فك الحظر بنجاح" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// @desc    Check if user is blocked
// @route   GET /api/v1/chat/block-status/:userId
// @access  Private
router.get("/block-status/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId);
    const otherUser = await User.findById(userId);

    // Check if current user blocked the other user
    const iBlockedThem = user.blockedUsers.includes(userId);
    
    // Check if the other user blocked current user
    const theyBlockedMe = otherUser ? otherUser.blockedUsers.includes(currentUserId) : false;

    // Determine the block status
    const isBlocked = iBlockedThem || theyBlockedMe;
    const amITheBlocker = iBlockedThem;

    res.json({ isBlocked, amITheBlocker });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// @desc    Send a document message
// @route   POST /api/v1/chat/conversations/:conversationId/document
// @access  Private
router.post(
  "/conversations/:conversationId/document",
  protect,
  uploadDocument.single("document"),
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      if (!req.file) {
        return res.status(400).json({ msg: "Document file is required" });
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
        messageType: "document",
        mediaUrl: req.file.path, // Cloudinary URL
        fileName: req.file.originalname,
        mediaSize: req.file.size,
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
        fileName: message.fileName,
        mediaSize: message.mediaSize,
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

// @desc    Send a location message
// @route   POST /api/v1/chat/conversations/:conversationId/location
// @access  Private
router.post("/conversations/:conversationId/location", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ msg: "Latitude and longitude are required" });
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
      messageType: "location",
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || "",
      },
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
      location: message.location,
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

// @desc    Send a contact message
// @route   POST /api/v1/chat/conversations/:conversationId/contact
// @access  Private
router.post("/conversations/:conversationId/contact", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ msg: "Contact name and phone are required" });
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
      messageType: "contact",
      contact: {
        name,
        phone,
        email: email || "",
      },
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
      contact: message.contact,
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

module.exports = router;

