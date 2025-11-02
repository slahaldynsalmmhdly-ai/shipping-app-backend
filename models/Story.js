const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  media: {
    url: {
      type: String,
      required: false, // جعل الحقل اختياري لدعم القصص النصية
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: false, // جعل الحقل اختياري لدعم القصص النصية
    },
    thumbnail: String, // للفيديوهات
    width: Number,
    height: Number,
    duration: Number, // مدة الفيديو بالثواني
  },
  text: {
    type: String,
    maxlength: 200, // نص اختياري على القصة
  },
  backgroundColor: {
    type: String,
    default: '#000000', // لون الخلفية إذا كانت قصة نصية
  },
  // المشاهدات
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // الإعجابات (اختياري)
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  // وقت الإنشاء
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // وقت انتهاء الصلاحية (24 ساعة)
  expiresAt: {
    type: Date,
    required: true,
    index: true, // فهرس للحذف التلقائي
  },
  // حالة القصة
  isActive: {
    type: Boolean,
    default: true,
  },
});

// إضافة فهارس لتحسين الأداء
StorySchema.index({ user: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1 });
StorySchema.index({ 'views.user': 1 });

// حذف القصص المنتهية تلقائيًا بعد 24 ساعة
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', StorySchema);
