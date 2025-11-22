const mongoose = require('mongoose');

const shortCommentSchema = new mongoose.Schema({
  // معرّف الفيديو
  short: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    required: true
  },
  
  // معرّف المستخدم الذي علّق
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // نص التعليق
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // الإعجابات على التعليق
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // الردود على التعليق
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // معلومات إضافية
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// فهارس لتحسين الأداء
shortCommentSchema.index({ short: 1, createdAt: -1 });
shortCommentSchema.index({ user: 1 });
shortCommentSchema.index({ 'likes.user': 1 });
shortCommentSchema.index({ 'replies.likes.user': 1 });

module.exports = mongoose.model('ShortComment', shortCommentSchema);
