const mongoose = require('mongoose');

const EmptyTruckAdSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    currentLocation: {
      type: String,
      required: [true, 'Please add a current location'],
    },
    preferredDestination: {
      type: String,
      required: [true, 'Please add a preferred destination'],
    },
    availabilityDate: {
      type: Date,
      required: [true, 'Please add an availability date'],
    },
    truckType: {
      type: String,
      required: [true, 'Please add a truck type'],
    },
    additionalNotes: {
      type: String,
    },
    // أسعار الوجهات (مدينة + سعر)
    destinationPrices: [
      {
        city: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
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
          enum: ['like'],
          required: true,
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
  },
  {
    timestamps: true,
  }
);

// إضافة فهارس لتحسين الأداء
EmptyTruckAdSchema.index({ user: 1, createdAt: -1 });
EmptyTruckAdSchema.index({ isPublished: 1, createdAt: -1 });
EmptyTruckAdSchema.index({ isFeatured: -1, createdAt: -1 }); // For featured ads
EmptyTruckAdSchema.index({ hashtags: 1 });
EmptyTruckAdSchema.index({ hiddenFromHomeFeedFor: 1 });
EmptyTruckAdSchema.index({ createdAt: -1 });
EmptyTruckAdSchema.index({ currentLocation: 1 });
EmptyTruckAdSchema.index({ preferredDestination: 1 });
EmptyTruckAdSchema.index({ availabilityDate: 1 });

module.exports = mongoose.model('EmptyTruckAd', EmptyTruckAdSchema);

