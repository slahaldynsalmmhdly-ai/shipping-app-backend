const express = require("express");
const router = express.Router();
const { protect, protectUnified } = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Review = require("../models/Review");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
// AI Chat Service removed - all bot features disabled

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
	router.get("/conversations", protectUnified, async (req, res) => {
	  try {
    const isValidObjectId = (id) => {
      if (!id) return false;
      // Convert to string first to handle both ObjectId and string types
      const idStr = typeof id === 'string' ? id : id.toString();
      return /^[0-9a-fA-F]{24}$/.test(idStr);
    };

	    const conversations = await Conversation.find({
	      participants: req.user.id,
	    })
	      .populate({
	        path: "lastMessage",
	        select: "content messageType mediaUrl createdAt sender",
	      })
	      .sort({ lastMessageTime: -1 })
	      .lean(); // Use lean() for better performance and to avoid Mongoose casting issues

	    // Array to hold the IDs of the participants that are not the current user
	    const otherParticipantIds = conversations.map(conv => 
	      conv.participants.find(p => p.toString() !== req.user.id)
	    ).filter(id => id);

    // Separate valid ObjectIds (Users) - only process valid user IDs
    const userIds = otherParticipantIds.filter(id => isValidObjectId(id));

    // Fetch User details (exclude drivers - they should only appear in fleet conversations)
    const User = require("../models/User"); // Import User model
    const users = await User.find({ 
      _id: { $in: userIds },
      userType: { $ne: 'driver' } // Exclude drivers from regular conversations
    }).select("name avatar userType isOnline lastSeen").lean();
	    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Note: Vehicle/driver details are not fetched here as they belong to fleet conversations endpoint

	    // Format conversations for frontend
	    const formattedConversations = conversations.map((conv) => {
	      const otherParticipantId = conv.participants.find(p => p.toString() !== req.user.id);
	      let otherParticipant = null;

      if (isValidObjectId(otherParticipantId)) {
        // Only get non-driver users (customers only)
        otherParticipant = userMap.get(otherParticipantId.toString());
        
        // Skip drivers - they should only appear in fleet conversations endpoint
        // Removed vehicle/driver lookup to keep this endpoint for customers only
      }

	      // Skip conversation if participant details could not be found (e.g., deleted user/vehicle)
	      if (!otherParticipant) {
	        return null;
	      }

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
	        unreadCount: conv.unreadCount?.[req.user.id] || 0,
	        lastMessageTime: conv.lastMessageTime,
	      };
	    }).filter(conv => conv !== null); // Filter out conversations with missing participants

	    res.json(formattedConversations);
	    } catch (err) {
	      console.error("Error in GET /conversations:", err);
	      // Check for CastError specifically on the participants field
	      if (err.name === 'CastError' && err.path === 'participants') {
	        // This indicates a non-ObjectId value (like fleetAccountId) is stored in the participants array.
	        // We cannot fix the data here, but we can return an empty array or a specific error to the frontend.
	        // Since the frontend expects a list of conversations, returning an empty array is safer than crashing.
	        // However, to debug, we will return a specific error.
	        return res.status(500).json({ 
	          msg: "Database Error: Invalid participant ID format found in conversation data. Please contact support.",
	          details: err.message
	        });
	      }
	      
	      // Check for other specific Mongoose errors or return a generic 500
	      if (err.name === 'CastError') {
	        return res.status(400).json({ msg: "Invalid ID format" });
	      }
	      res.status(500).json({ msg: "Server Error" });
	    }
	});

// @desc    Get fleet conversations only (drivers)
// @route   GET /api/v1/chat/conversations/fleet
// @access  Private
router.get("/conversations/fleet", protectUnified, async (req, res) => {
  try {
    const Vehicle = require("../models/Vehicle");
    const User = require("../models/User");
    
    const isValidObjectId = (id) => {
      if (!id) return false;
      const idStr = typeof id === 'string' ? id : id.toString();
      return /^[0-9a-fA-F]{24}$/.test(idStr);
    };

    // Get all conversations for the current user
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate({
        path: "lastMessage",
        select: "content messageType mediaUrl createdAt sender",
      })
      .sort({ lastMessageTime: -1 })
      .lean();

    // Get other participants
    const otherParticipantIds = conversations.map(conv => 
      conv.participants.find(p => p.toString() !== req.user.id)
    ).filter(id => id);

    // Separate valid ObjectIds (Users) from fleetAccountIds (Vehicles)
    const userIds = otherParticipantIds.filter(id => isValidObjectId(id));

    // Fetch User details and filter only drivers
    const users = await User.find({ 
      _id: { $in: userIds },
      userType: 'driver' // Only get drivers
    }).select("name avatar userType isOnline lastSeen").lean();
    
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Fetch Vehicle details for drivers
    const driverUserIds = users.map(u => u._id.toString());
    const vehicles = await Vehicle.find({ 
      driverUser: { $in: driverUserIds },
      lastLogin: { $exists: true, $ne: null },
      isAccountActive: true
    }).select("fleetAccountId driverName imageUrls driverUser").populate("driverUser", "_id name avatar isOnline lastSeen").lean();
    
    const vehicleMap = new Map(vehicles.map(vehicle => [vehicle.driverUser?._id?.toString(), vehicle]));

    // Format conversations for frontend - only include driver conversations
    const formattedConversations = conversations.map((conv) => {
      const otherParticipantId = conv.participants.find(p => p.toString() !== req.user.id);
      let otherParticipant = null;

      if (isValidObjectId(otherParticipantId)) {
        // Check if this is a driver
        otherParticipant = userMap.get(otherParticipantId.toString());
        
        if (otherParticipant) {
          // Get vehicle info if available
          const vehicle = vehicleMap.get(otherParticipantId.toString());
          if (vehicle) {
            otherParticipant = {
              _id: otherParticipant._id,
              name: otherParticipant.name || vehicle.driverName,
              avatar: otherParticipant.avatar || vehicle.imageUrls?.[0] || null,
              userType: 'driver',
              isOnline: otherParticipant.isOnline || false,
              lastSeen: otherParticipant.lastSeen || new Date(),
            };
          }
        }
      }

      // Skip if not a driver conversation
      if (!otherParticipant) {
        return null;
      }

      return {
        _id: conv._id,
        participant: {
          _id: otherParticipant._id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
          userType: otherParticipant.userType,
          isOnline: otherParticipant.isOnline || false,
          lastSeen: otherParticipant.lastSeen,
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
        unreadCount: conv.unreadCount?.[req.user.id] || 0,
        lastMessageTime: conv.lastMessageTime,
      };
    }).filter(conv => conv !== null);

    res.json(formattedConversations);
  } catch (err) {
    console.error("Error in GET /conversations/fleet:", err);
    res.status(500).json({ msg: "Server Error", details: err.message });
  }
});

// @desc    Get total unread messages count for the logged-in user
// @route   GET /api/v1/chat/unread-count
// @access  Private
router.get("/unread-count", protectUnified, async (req, res) => {
  try {
    // Get all conversations for the user
    const conversations = await Conversation.find({
      participants: req.user.id,
    });

    // Calculate total unread count
    let totalUnread = 0;
    conversations.forEach((conv) => {
      const userUnreadCount = conv.unreadCount.get(req.user.id) || 0;
      totalUnread += userUnreadCount;
    });

    res.json({ totalUnreadCount: totalUnread });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get or create a conversation with another user
// @route   POST /api/v1/chat/conversations
// @access  Private
router.post("/conversations", protectUnified, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ msg: "Participant ID is required" });
    }

    // Check if participant exists in User model
    let participant = null;
    
    // Helper function to check if a string is a valid MongoDB ObjectId
    const isValidObjectId = (id) => {
      if (!id) return false;
      // Convert to string first to handle both ObjectId and string types
      const idStr = typeof id === 'string' ? id : id.toString();
      return /^[0-9a-fA-F]{24}$/.test(idStr);
    };

    if (isValidObjectId(participantId)) {
      participant = await User.findById(participantId);
    }

    // If not found, check if it's a Vehicle (Driver) using fleetAccountId
    if (!participant) {
      const Vehicle = require("../models/Vehicle"); // Import Vehicle model
      // Only allow chat with drivers who have logged in at least once
      const vehicle = await Vehicle.findOne({ 
        fleetAccountId: participantId,
        lastLogin: { $exists: true, $ne: null },
        isAccountActive: true
      }).populate("driverUser", "_id name avatar");

      if (vehicle) {
        // Check if driver has a User account
        if (vehicle.driverUser) {
          // Use existing driver User account
          participant = await User.findById(vehicle.driverUser._id);
          if (!participant) {
            console.error(`Driver User not found for vehicle: ${participantId}`);
            return res.status(404).json({ msg: "Driver account not found" });
          }
        } else {
          // Auto-create User account for old drivers who don't have one
          console.log(`Auto-creating User account for driver: ${participantId}`);
          const driverEmail = `${vehicle.fleetAccountId}@driver.local`;
          
          // Re-fetch vehicle with password to create User
          const vehicleWithPassword = await Vehicle.findOne({ fleetAccountId: participantId }).select('+fleetPassword');
          
          if (!vehicleWithPassword || !vehicleWithPassword.fleetPassword) {
            console.error(`Cannot create User for driver without password: ${participantId}`);
            return res.status(400).json({ msg: "Driver account not properly configured" });
          }
          
          const driverUser = await User.create({
            email: driverEmail,
            password: vehicleWithPassword.fleetPassword, // Already hashed
            name: vehicle.driverName,
            userType: "driver",
            avatar: vehicle.imageUrls?.[0] || "",
          });
          
          // Link User to Vehicle
          vehicleWithPassword.driverUser = driverUser._id;
          await vehicleWithPassword.save();
          
          participant = driverUser;
          console.log(`Successfully created User account for driver: ${participantId}`);
        }
      } else {
        // Log the error before returning 404
        console.error(`Participant not found for ID: ${participantId}`);
        return res.status(404).json({ msg: "User or Driver not found" });
      }
    }

    // Use the actual User ObjectId for the conversation
    const actualParticipantId = participant._id;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, actualParticipantId] },
    })
      .populate("participants", "name avatar userType")
      .populate({
        path: "lastMessage",
        select: "content messageType mediaUrl createdAt sender",
      });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [req.user.id, actualParticipantId],
        unreadCount: new Map([
          [req.user.id, 0],
          [actualParticipantId, 0],
        ]),
      });

      // For Vehicle entities, we cannot populate the participant, so we return the conversation object directly
      if (participant.isVehicle) {
        // Manually format the conversation for the frontend
        const formattedConversation = {
          _id: conversation._id,
          participant: {
            _id: participant._id,
            name: participant.name,
            avatar: participant.avatar,
            userType: participant.userType,
          },
          lastMessage: null,
          unreadCount: 0,
          lastMessageTime: conversation.lastMessageTime,
        };
        return res.json(formattedConversation);
      }

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name avatar userType")
        .populate({
          path: "lastMessage",
          select: "content messageType mediaUrl createdAt sender",
        });
    }

    // Format conversation for frontend
    // If the participant is a Vehicle entity, we need to manually format the response
    if (participant.isVehicle) {
      const formattedConversation = {
        _id: conversation._id,
        participant: {
          _id: participant._id,
          name: participant.name,
          avatar: participant.avatar,
          userType: participant.userType,
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
      return res.json(formattedConversation);
    }

    // Format conversation for frontend (for regular User entities)
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
router.get("/conversations/:conversationId/messages", protectUnified, async (req, res) => {
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
      reading_id: msg.readBy.find(id => id.toString() !== msg.sender._id.toString()), // Find the ID of the reader (if any) other than the sender
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
router.post("/conversations/:conversationId/messages", protectUnified, async (req, res) => {
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
      reading_id: null,
      isSender: true,
      createdAt: message.createdAt,
    };

    // إرسال الرد للعميل
    res.status(201).json(formattedMessage);

    // إرسال الرسالة عبر Socket.IO
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    
    if (io && onlineUsers) {
      // إرسال الرسالة مباشرة لجميع المشاركين في المحادثة
      conversation.participants.forEach(participant => {
        const participantSocketId = onlineUsers.get(participant._id.toString());
        if (participantSocketId) {
          io.to(participantSocketId).emit('message:new', formattedMessage);
        }
      });
      
      // تحديث قائمة المحادثات لجميع المشاركين
      const updatedConversation = await Conversation.findById(conversationId)
        .populate('participants', 'name avatar userType companyName')
        .populate('lastMessage');

      if (updatedConversation) {
        // إرسال التحديث لكل مشارك
        updatedConversation.participants.forEach(participant => {
          const otherParticipant = updatedConversation.participants.find(
            p => p._id.toString() !== participant._id.toString()
          );
          
          const unreadCount = updatedConversation.unreadCount.get(participant._id.toString()) || 0;
          const participantSocketId = onlineUsers.get(participant._id.toString());
          
          if (participantSocketId) {
            io.to(participantSocketId).emit('conversation:updated', {
              _id: updatedConversation._id,
              participant: otherParticipant,
              lastMessage: updatedConversation.lastMessage,
              unreadCount: unreadCount,
              updatedAt: updatedConversation.updatedAt
            });
          }
        });
      }
    }

    // AI Bot features removed - direct human-to-human chat only
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
      reading_id: null,
        isSender: true,
        createdAt: message.createdAt,
      };

      res.status(201).json(formattedMessage);

      // AI image analysis removed - direct human-to-human chat only
    } catch (err) {
      console.error("Error in chatRoutes:", err);
      // Check for specific Mongoose errors or return a generic 500
      if (err.name === 'CastError') {
        return res.status(400).json({ msg: "Invalid ID format" });
      }
      res.status(500).json({ msg: "Server Error" });
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
      reading_id: null,
        isSender: true,
        createdAt: message.createdAt,
      };

      res.status(201).json(formattedMessage);
    } catch (err) {
      console.error("Error in chatRoutes:", err);
      // Check for specific Mongoose errors or return a generic 500
      if (err.name === 'CastError') {
        return res.status(400).json({ msg: "Invalid ID format" });
      }
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @desc    Delete a message for the current user
// @route   DELETE /api/v1/chat/messages/:messageId
// @access  Private
router.delete("/messages/:messageId", protectUnified, async (req, res) => {
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
router.put("/conversations/:conversationId/read", protectUnified, async (req, res) => {
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
router.get("/conversations/:conversationId/stats", protectUnified, async (req, res) => {
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
router.get("/conversations/:conversationId/media", protectUnified, async (req, res) => {
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
router.get("/profile/:userId", protectUnified, async (req, res) => {
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
router.put("/messages/:messageId", protectUnified, async (req, res) => {
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
router.delete("/messages/:messageId/everyone", protectUnified, async (req, res) => {
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
router.post("/block/:userId", protectUnified, async (req, res) => {
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
router.post("/unblock/:userId", protectUnified, async (req, res) => {
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
router.get("/block-status/:userId", protectUnified, async (req, res) => {
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
      reading_id: null,
        isSender: true,
        createdAt: message.createdAt,
      };

      res.status(201).json(formattedMessage);
    } catch (err) {
      console.error("Error in chatRoutes:", err);
      // Check for specific Mongoose errors or return a generic 500
      if (err.name === 'CastError') {
        return res.status(400).json({ msg: "Invalid ID format" });
      }
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @desc    Send a location message
// @route   POST /api/v1/chat/conversations/:conversationId/location
// @access  Private
router.post("/conversations/:conversationId/location", protectUnified, async (req, res) => {
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
      reading_id: null,
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
router.post("/conversations/:conversationId/contact", protectUnified, async (req, res) => {
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
      reading_id: null,
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

