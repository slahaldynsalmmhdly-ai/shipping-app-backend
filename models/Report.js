const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reportType: {
    type: String,
    enum: ['post', 'user', 'review', 'comment', 'reply', 'video'],
    required: true,
  },
  targetId: {
    type: String,
    required: true,
  },
  targetModel: {
    type: String,
    enum: ['Post', 'User', 'Review', 'Comment', 'Reply', 'Video', 'Short'],
  },
  reason: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    default: '',
  },
  media: {
    type: [String],
    default: [],
  },
  loadingDate: {
    type: String,
    default: null,
  },
  unloadingDate: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model("Report", ReportSchema);
