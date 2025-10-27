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
    enum: ["individual", "company"],
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
  fleetImages: [
    { type: String } // Array of URLs to fleet images
  ],
  licenseImages: [
    { type: String } // Array of URLs to license images
  ],
  blockedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // AI Features Settings
  aiFeatures: {
    autoPosting: {
      type: Boolean,
      default: false,
    },
    autoMessaging: {
      type: Boolean,
      default: false,
    },
    fleetPromotion: {
      type: Boolean,
      default: false,
    },
    weeklyReports: {
      type: Boolean,
      default: false,
    },
  },
  aiScheduleSettings: {
    enabled: {
      type: Boolean,
      default: false, // الجدولة معطلة افتراضياً
    },
    scheduleTime: {
      type: String,
      default: '09:00', // الوقت بصيغة HH:mm (24 ساعة)
    },
    timezone: {
      type: String,
      default: 'Asia/Riyadh', // المنطقة الزمنية
    },
    lastRun: {
      type: Date,
      default: null, // آخر مرة تم التشغيل
    },
  },
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
        enum: ["like", "new_post", "comment", "reply", "comment_like", "reply_like", "new_message", "new_call"], // Add other notification types as needed
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

