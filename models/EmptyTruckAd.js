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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmptyTruckAd', EmptyTruckAdSchema);

