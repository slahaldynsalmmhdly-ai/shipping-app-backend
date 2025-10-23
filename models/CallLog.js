const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callType: {
      type: String,
      enum: ["video", "audio"],
      required: true,
    },
    status: {
      type: String,
      enum: ["connecting", "missed", "answered", "rejected", "cancelled", "completed", "declined"],
      default: "connecting",
    },
    duration: {
      type: Number, // بالثواني
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index للبحث السريع
callLogSchema.index({ receiver: 1, isRead: 1 });
callLogSchema.index({ caller: 1, receiver: 1 });

module.exports = mongoose.model("CallLog", callLogSchema);

