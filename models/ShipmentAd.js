const mongoose = require("mongoose");

const ShipmentAdSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pickupLocation: {
    type: String,
    required: true,
  },
  deliveryLocation: {
    type: String,
    required: true,
  },
  pickupDate: {
    type: Date,
    required: true,
  },
  truckType: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  media: [
    {
      url: String,
      type: { type: String, enum: ["image", "video"] }, // 'image' or 'video'
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
        ref: "User",
      },
      type: {
        type: String,
        enum: ["like"],
        required: true,
      },
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
            ref: "User",
          },
        },
      ],
      dislikes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],
      replies: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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
                ref: "User",
              },
            },
          ],
          dislikes: [
            {
              user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
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
  // Featured/Highlighted ad (appears first)
  isFeatured: {
    type: Boolean,
    default: false,
  },
  featuredUntil: {
    type: Date,
    default: null, // null = featured indefinitely, Date = featured until this date
  },
});

// إضافة فهارس لتحسين الأداء
ShipmentAdSchema.index({ user: 1, createdAt: -1 });
ShipmentAdSchema.index({ isPublished: 1, createdAt: -1 });
ShipmentAdSchema.index({ isFeatured: -1, createdAt: -1 }); // For featured ads
ShipmentAdSchema.index({ hashtags: 1 });
ShipmentAdSchema.index({ hiddenFromHomeFeedFor: 1 });
ShipmentAdSchema.index({ createdAt: -1 });
ShipmentAdSchema.index({ pickupLocation: 1 });
ShipmentAdSchema.index({ deliveryLocation: 1 });
ShipmentAdSchema.index({ pickupDate: 1 });

module.exports = mongoose.model("ShipmentAd", ShipmentAdSchema);

