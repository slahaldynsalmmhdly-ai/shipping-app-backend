const mongoose = require("mongoose");

const ReviewDeletionRequestSchema = new mongoose.Schema({
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
    required: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'تعليق غير مرغوب فيه أو إسبام',
      'محتوى يحض على الكراهية أو عنيف',
      'مضايقة أو تنمر',
      'معلومات زائفة',
      'سبب آخر'
    ],
  },
  otherReasonText: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model("ReviewDeletionRequest", ReviewDeletionRequestSchema);

