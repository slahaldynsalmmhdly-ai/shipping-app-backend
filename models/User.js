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
    type: String, // For company city
    default: "",
  },
  // Company specific fields
  companyName: {
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
  notifications: [
    {
      type: {
        type: String,
        enum: ['like', 'new_post'], // Add other notification types as needed
        required: true,
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
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

