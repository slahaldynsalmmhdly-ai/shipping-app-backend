const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reportType: {
    type: String,
    enum: ['post', 'user', 'review'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel',
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['Post', 'User', 'Review'],
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'scam',
      'inappropriate',
      'spam',
      'communication_issue',
      'other'
    ],
  },
  details: {
    type: String,
    required: true,
  },
  media: {
    type: String,
    default: '',
  },
  loadingDate: {
    type: String,
    default: '',
  },
  unloadingDate: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model("Report", ReportSchema);

