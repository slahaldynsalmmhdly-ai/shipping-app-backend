const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driverName: {
    type: String,
    required: true,
  },
  
  // حقول النقل
  transportType: {
    type: String,
    enum: ["international", "domestic"],
    required: true,
  },
  
  // حقول مشتركة
  departureCity: {
    type: String,
    required: true,
  },
  
  vehicleType: {
    type: String,
    required: true,
  },
  
  vehicleColor: {
    type: String,
    required: true,
  },
  
  currency: {
    type: String,
    required: true,
  },
  
  discount: {
    type: Number,
    default: 0,
  },
  
  plateNumber: {
    type: String,
    required: true,
    unique: true,
  },
  
  status: {
    type: String,
    enum: ["متاح", "غير متاح"],
    default: "متاح",
  },
  
  // صور متعددة (اختيارية، حد أقصى 5 صور)
  imageUrls: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 5;
      },
      message: 'الحد الأقصى للصور هو 5'
    },
    default: [],
  },
  
  // حقول النقل الدولي
  departureCountry: {
    type: String,
    required: function() {
      return this.transportType === 'international';
    },
  },
  
  tripType: {
    type: String,
    enum: ["one-way", "round-trip"],
    required: function() {
      return this.transportType === 'international';
    },
  },
  
  distance: {
    type: Number,
    required: function() {
      return this.transportType === 'international';
    },
  },
  
  duration: {
    type: Number,
    required: function() {
      return this.transportType === 'international';
    },
  },
  
  internationalDestinations: [{
    arrivalCountry: {
      type: String,
      required: true,
    },
    arrivalCity: {
      type: String,
      required: true,
    },
    oneWayPrice: {
      type: Number,
      required: true,
    },
    roundTripPrice: {
      type: Number,
      default: 0,
    },
  }],
  
  // حقول النقل الداخلي
  cities: [{
    city: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  }],
  
  previousStatus: {
    type: String,
    enum: ["متاح", "غير متاح", null],
    default: null,
  },

  // حقول الحساب الفرعي للأسطول (Fleet Sub-Account)
  fleetAccountId: {
    type: String,
    unique: true,
    sparse: true,
  },
  fleetPassword: {
    type: String,
    select: false,
  },
  accountCreatedAt: {
    type: Date,
  },
  isAccountActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  driverUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  
  // حقول إعادة تعيين كلمة السر
  passwordResetRequired: {
    type: Boolean,
    default: false,
  },
  tempPassword: {
    type: String,
    select: false,
  },
  passwordResetAttempts: {
    type: Number,
    default: 0,
  },
  passwordResetLockedUntil: {
    type: Date,
    default: null,
  },
  
  // حقول قديمة للتوافق (اختيارية)
  vehicleName: {
    type: String,
  },
  licensePlate: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  currentLocation: {
    type: String,
  },
  vehicleModel: {
    type: String,
  },
}, { timestamps: true });

// Validation: التأكد من وجود الحقول المناسبة حسب نوع النقل
VehicleSchema.pre('validate', function(next) {
  if (this.transportType === 'international') {
    if (!this.internationalDestinations || this.internationalDestinations.length === 0) {
      this.invalidate('internationalDestinations', 'يجب إضافة وجهة دولية واحدة على الأقل');
    }
  } else if (this.transportType === 'domestic') {
    if (!this.cities || this.cities.length === 0) {
      this.invalidate('cities', 'يجب إضافة مدينة واحدة على الأقل');
    }
  }
  next();
});

module.exports = mongoose.model("Vehicle", VehicleSchema);
