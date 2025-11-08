const mongoose = require("mongoose");

const ChatProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  avatar: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
    maxlength: 200,
  },
}, { timestamps: true });

// Index for faster queries
ChatProfileSchema.index({ user: 1 });

module.exports = mongoose.model("ChatProfile", ChatProfileSchema);
