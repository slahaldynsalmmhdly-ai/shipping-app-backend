const mongoose = require('mongoose');

/**
 * نموذج تتبع التفاعل مع الفيديوهات القصيرة (Shorts)
 * يحفظ بيانات المشاهدة والتفاعل لكل مستخدم مع كل فيديو
 */
const shortInteractionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  short: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    required: true
  },
  // بيانات المشاهدة
  watchDuration: {
    type: Number, // بالثواني
    default: 0
  },
  totalDuration: {
    type: Number, // مدة الفيديو الكاملة
    required: true
  },
  watchPercentage: {
    type: Number, // نسبة المشاهدة (0-100)
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  // بيانات التفاعل
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
  rewatched: {
    type: Boolean,
    default: false
  },
  watchCount: {
    type: Number, // عدد مرات المشاهدة
    default: 1
  },
  // نقاط الاهتمام
  interestScore: {
    type: Number,
    default: 0
  },
  // الهاشتاقات المستخرجة من الفيديو
  hashtags: [{
    type: String
  }],
  // تواريخ
  firstViewedAt: {
    type: Date,
    default: Date.now
  },
  lastViewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// فهارس لتحسين الأداء
shortInteractionSchema.index({ user: 1, short: 1 }, { unique: true });
shortInteractionSchema.index({ user: 1, interestScore: -1 });
shortInteractionSchema.index({ user: 1, lastViewedAt: -1 });
shortInteractionSchema.index({ hashtags: 1 });

/**
 * حساب نقاط الاهتمام بناءً على التفاعل
 * النقاط = (نسبة المشاهدة) + (إعجاب × 50) + (تعليق × 100) + (مشاركة × 150) + (إعادة مشاهدة × 75)
 */
shortInteractionSchema.methods.calculateInterestScore = function() {
  let score = 0;
  
  // نسبة المشاهدة (0-100 نقطة)
  score += this.watchPercentage;
  
  // الإعجاب (50 نقطة)
  if (this.liked) {
    score += 50;
  }
  
  // التعليق (100 نقطة)
  if (this.commented) {
    score += 100;
  }
  
  // المشاركة (150 نقطة)
  if (this.shared) {
    score += 150;
  }
  
  // إعادة المشاهدة (75 نقطة)
  if (this.rewatched) {
    score += 75;
  }
  
  this.interestScore = score;
  return score;
};

/**
 * تحديث بيانات المشاهدة
 */
shortInteractionSchema.methods.updateWatchData = function(watchDuration, totalDuration) {
  // تحديث مدة المشاهدة (نأخذ الأكبر)
  this.watchDuration = Math.max(this.watchDuration, watchDuration);
  this.totalDuration = totalDuration;
  
  // حساب نسبة المشاهدة
  this.watchPercentage = Math.min((this.watchDuration / this.totalDuration) * 100, 100);
  
  // تحديد إذا كان الفيديو مكتمل (80% أو أكثر)
  if (this.watchPercentage >= 80) {
    this.completed = true;
  }
  
  // تحديث تاريخ آخر مشاهدة
  this.lastViewedAt = Date.now();
  
  // حساب نقاط الاهتمام
  this.calculateInterestScore();
};

/**
 * تسجيل إعادة مشاهدة
 */
shortInteractionSchema.methods.recordRewatch = function() {
  this.watchCount += 1;
  if (this.watchCount > 1) {
    this.rewatched = true;
  }
  this.lastViewedAt = Date.now();
  this.calculateInterestScore();
};

module.exports = mongoose.model('ShortInteraction', shortInteractionSchema);
