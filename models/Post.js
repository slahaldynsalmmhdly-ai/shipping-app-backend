const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: function() {
      // Text is required only for regular posts, not for reposts
      return !this.isRepost;
    },
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
  categories: [String],
  topics: [String],
  distributionStage: {
    type: String,
    enum: ['testing', 'expanding', 'viral', 'saturated'],
    default: 'testing',
  },
});

module.exports = mongoose.model('Post', PostSchema);

