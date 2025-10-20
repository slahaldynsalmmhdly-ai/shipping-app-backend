const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "video", "audio", "file"],
    default: "text",
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === "text";
    },
  },
  mediaUrl: {
    type: String,
    required: function() {
      return this.messageType !== "text";
    },
  },
  mediaThumbnail: {
    type: String, // For video thumbnails
  },
  mediaSize: {
    type: Number, // File size in bytes
  },
  mediaDuration: {
    type: Number, // For audio/video duration in seconds
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  deletedFor: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
}, { timestamps: true });

// Index for faster queries
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", MessageSchema);

