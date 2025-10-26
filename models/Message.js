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
    enum: ["text", "image", "video", "audio", "file", "document", "location", "contact"],
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
  fileName: {
    type: String, // For document files
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  contact: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
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
  deletedForEveryone: {
    type: Boolean,
    default: false,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  // AI Generated field
  generatedByAI: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Index for faster queries
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", MessageSchema);

