const mongoose = require('mongoose');

const shortSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: Number, // بالثواني
    required: true
  },
  // تحليل المحتوى بالذكاء الاصطناعي
  tags: [{
    type: String
  }],
  categories: [{
    type: String
  }],
  topics: [{
    type: String
  }],
  mood: {
    type: String,
    default: 'عام'
  },
  targetAudience: {
    type: String,
    default: 'الجميع'
  },
  // إحصائيات التفاعل
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  // تتبع المشاهدات
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    watchDuration: {
      type: Number, // بالثواني
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    liked: {
      type: Boolean,
      default: false
    },
    commented: {
      type: Boolean,
      default: false
    },
    shared: {
      type: Boolean,
      default: false
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // معلومات إضافية
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// إضافة فهارس لتحسين الأداء
shortSchema.index({ user: 1, createdAt: -1 });
shortSchema.index({ tags: 1 });
shortSchema.index({ categories: 1 });
shortSchema.index({ views: -1 });
shortSchema.index({ likes: -1 });
shortSchema.index({ 'viewedBy.user': 1 });

module.exports = mongoose.model('Short', shortSchema);
