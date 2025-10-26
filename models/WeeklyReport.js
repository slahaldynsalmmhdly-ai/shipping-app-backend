const mongoose = require("mongoose");

const WeeklyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reportDate: {
    type: Date,
    default: Date.now,
  },
  weekStart: {
    type: Date,
    required: true,
  },
  weekEnd: {
    type: Date,
    required: true,
  },
  cityDemand: [
    {
      city: {
        type: String,
        required: true,
      },
      demandLevel: {
        type: String,
        enum: ["low", "medium", "high", "very_high"],
        required: true,
      },
      shipmentCount: {
        type: Number,
        default: 0,
      },
      averagePrice: {
        type: Number,
        default: 0,
      },
    },
  ],
  insights: {
    type: String,
    default: "",
  },
  recommendations: [
    {
      type: String,
    },
  ],
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("WeeklyReport", WeeklyReportSchema);

