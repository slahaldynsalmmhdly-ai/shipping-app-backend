const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: false, // النص اختياري - يمكن إرسال صور أو فيديوهات فقط
  },
  media: [
    {
      url: String,
      type: { type: String, enum: ['image', 'video'] }, // 'image' or 'video'
      thumbnail: String, // Thumbnail URL for videos
      width: Number, // Video/image width
      height: Number, // Video/image height
      duration: Number, // Video duration in seconds
    },
  ],
  reactions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      type: {
        type: String,
        enum: ['like'], // Only like reaction type
      },
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      likes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      dislikes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      replies: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          text: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
          likes: [
            {
              user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
              },
            },
          ],
          dislikes: [
            {
              user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
              },
            },
          ],
        },
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Repost fields
  isRepost: {
    type: Boolean,
    default: false,
  },
  originalPost: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'originalPostType',
  },
  originalPostType: {
    type: String,
    enum: ['Post', 'ShipmentAd', 'EmptyTruckAd'],
  },
  repostText: {
    type: String,
  },

  // Scheduling fields
  scheduledTime: {
    type: Date,
    default: null, // null = publish immediately, Date = scheduled publish
  },
  isPublished: {
    type: Boolean,
    default: true, // true = published, false = scheduled (not published yet)
  },
  // Hidden from home feed for specific users (like Facebook behavior)
  hiddenFromHomeFeedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Smart Feed Algorithm fields
  impressions: {
    type: Number,
    default: 0,
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  videoCompletions: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  tags: [String],
  categories: [{
    type: String,
    enum: ['مشروع عادي', 'طلب نقل حمولة', 'استفسار وسؤال', 'طلب عمل', 'اعلان وظيفة', 'بين معدات شاحنة', 'ورشة لحاجات سواق', 'قطاع طريق', 'دينا', 'بيع قلب', 'ورشة', 'فيديو', 'صورة', 'شخص يحتاج نقل']
  }],
  topics: [String],
  // Hashtags and Mentions
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  distributionStage: {
    type: String,
    enum: ['testing', 'expanding', 'viral', 'saturated'],
    default: 'testing',
  },
});

// إضافة فهارس لتحسين الأداء
PostSchema.index({ user: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ hiddenFromHomeFeedFor: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'reactions.user': 1 });
PostSchema.index({ viewedBy: 1 });

module.exports = mongoose.model('Post', PostSchema);

