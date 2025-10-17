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
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", VehicleSchema);

