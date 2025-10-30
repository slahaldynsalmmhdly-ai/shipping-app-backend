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
  vehicleName: {
    type: String,
    required: true,
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  vehicleType: {
    type: String,
    default: "",
  },
  currentLocation: {
    type: String,
    default: "",
  },
  vehicleColor: {
    type: String,
    default: "",
  },
  vehicleModel: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["متاح", "في العمل"],
    default: "متاح",
  },
  // حقول تتبع النشر التلقائي
  lastAutoPostedAt: {
    type: Date,
    default: null,
  },
  autoPostCount: {
    type: Number,
    default: 0,
  },
  // حقول الحساب الفرعي للأسطول (Fleet Sub-Account)
  fleetAccountId: {
    type: String,
    unique: true,
    sparse: true, // يسمح بـ null للأساطيل القديمة
  },
  fleetPassword: {
    type: String,
    select: false, // لا تُرجع مع الاستعلامات العادية
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
}, { timestamps: true });

// Hook للنشر التلقائي عند تغيير حالة المركبة إلى "متاح"
VehicleSchema.post('save', async function(doc) {
  try {
    // التحقق من أن الحالة "متاح"
    if (doc.status === "متاح") {
      // استدعاء دالة النشر التلقائي بشكل غير متزامن (لا ننتظر النتيجة)
      const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
      
      // تشغيل النشر في الخلفية دون انتظار
      setImmediate(async () => {
        try {
          await autoPostSingleEmptyTruck(doc._id);
        } catch (error) {
          console.error('Error in post-save auto posting:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error in Vehicle post-save hook:', error);
  }
});

// Hook للنشر التلقائي عند تحديث حالة المركبة
VehicleSchema.post('findOneAndUpdate', async function(doc) {
  try {
    if (doc && doc.status === "متاح") {
      const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
      
      setImmediate(async () => {
        try {
          await autoPostSingleEmptyTruck(doc._id);
        } catch (error) {
          console.error('Error in post-update auto posting:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error in Vehicle post-findOneAndUpdate hook:', error);
  }
});

module.exports = mongoose.model("Vehicle", VehicleSchema);
