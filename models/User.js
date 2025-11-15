const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function() { return !this.googleId && !this.firebaseUid; }
  },
  name: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ["individual", "company", "driver"],
    required: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  // New fields for profile
  avatar: {
    type: String, // URL to profile image
    default: "",
  },
  coverImage: {
    type: String, // URL to cover image (for company profiles)
    default: "",
  },
  phone: {
    type: String,
    default: "",
  },
  description: {
    type: String, // For company description or individual "about"
    default: "",
  },
  address: {
    type: String, // For company address
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    default: "",
  },
  streetName: {
    type: String,
    default: "",
  },
  districtName: {
    type: String,
    default: "",
  },
  // Company specific fields
  companyName: {
    type: String,
    default: "",
  },
  companyEmail: {
    type: String,
    default: "",
  },
  website: {
    type: String,
    default: "",
  },
  workClassification: {
    type: String,
    default: "",
  },
  truckCount: {
    type: Number,
    default: 0,
  },
  truckTypes: {
    type: String, // e.g., "تريلا، دينا، سطحة"
    default: "",
  },
  registrationNumber: {
    type: String, // Vehicle registration number
    default: "",
  },
  licenseImages: [
    { type: String } // Array of URLs to license images
  ],
  blockedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],


  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  notifications: [
    {
      type: {
        type: String,
        enum: ["like", "new_post", "new_following_post", "new_following_shipment_ad", "new_following_empty_truck_ad", "comment", "reply", "comment_like", "reply_like", "new_message", "new_call", "mention"], // Add other notification types as needed
        required: true,
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
      shipmentAd: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShipmentAd",
      },
      emptyTruckAd: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmptyTruckAd",
      },
      itemType: {
        type: String,
        enum: ["post", "shipmentAd", "emptyTruckAd"],
      },
      commentId: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Post.comments", // لا يمكن الإشارة إلى subdocument مباشرة بهذه الطريقة في Mongoose لل populate
      },
      replyId: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Post.comments.replies", // لا يمكن الإشارة إلى subdocument مباشرة بهذه الطريقة في Mongoose لل populate
      },

      read: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  
  // Smart Feed Algorithm - User Preferences
  preferences: {
    interests: [String],
    preferredContentTypes: [String],
    engagementPatterns: String,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  // AI Bot Settings removed - all bot features disabled
}, { timestamps: true });

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);

