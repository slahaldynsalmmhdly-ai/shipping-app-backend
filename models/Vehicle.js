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
  },
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", VehicleSchema);

