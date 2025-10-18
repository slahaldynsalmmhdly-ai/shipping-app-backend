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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmptyTruckAd', EmptyTruckAdSchema);

