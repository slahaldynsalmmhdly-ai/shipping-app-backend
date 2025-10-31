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
  previousStatus: {
    type: String,
    enum: ["متاح", "في العمل", null],
    default: null,
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

// تم حذف جميع Hooks المتعلقة بالنشر التلقائي

module.exports = mongoose.model("Vehicle", VehicleSchema);
