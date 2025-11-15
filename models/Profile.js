const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  avatarUrl: {
    type: String,
  },
  coverUrl: {
    type: String,
  },
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("Profile", ProfileSchema);
