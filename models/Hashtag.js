const mongoose = require('mongoose');

const HashtagSchema = new mongoose.Schema({
  tag: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    enum: ['haraj', 'jobs', 'location', 'general'],
    default: 'general'
  },
  trending: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index للبحث السريع
HashtagSchema.index({ tag: 'text' });
HashtagSchema.index({ count: -1 });
HashtagSchema.index({ trending: -1, count: -1 });

module.exports = mongoose.model('Hashtag', HashtagSchema);
