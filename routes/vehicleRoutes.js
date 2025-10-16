const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User"); // Import User model
const { protect } = require("../middleware/authMiddleware");

// @desc    Add new vehicle to user's fleet (for company users)
// @route   POST /api/vehicles
// @access  Private (Company only)
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.userType !== "company") {
      res.status(403);
      throw new Error("Not authorized, only companies can manage fleet");
    }

    const { driverName, vehicleName, licensePlate, imageUrl, vehicleType, currentLocation, vehicleColor, vehicleModel } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const vehicleExists = await Vehicle.findOne({ licensePlate });

    if (vehicleExists) {
      res.status(400);
      throw new Error("Vehicle with this license plate already exists");
    }

    const vehicle = new Vehicle({
      user: req.user._id, // Link vehicle to user directly
      driverName,
      vehicleName,
      licensePlate,
      imageUrl,
      vehicleType,
      currentLocation,
      vehicleColor,
      vehicleModel,
    });

    const createdVehicle = await vehicle.save();

    res.status(201).json(createdVehicle);
  })
);

// @desc    Get all vehicles for the logged-in user
// @route   GET /api/vehicles/my-vehicles
// @access  Private (Company only)
router.get(
  "/my-vehicles",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.userType !== "company") {
      res.status(403);
      throw new Error("Not authorized, only companies can view their fleet");
    }

    const vehicles = await Vehicle.find({ user: req.user._id });
    res.json(vehicles);
  })
);

// @desc    Update a specific vehicle in user's fleet
// @route   PUT /api/vehicles/:vehicleId
// @access  Private (Company only)
router.put(
  "/:vehicleId",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.userType !== "company") {
      res.status(403);
      throw new Error("Not authorized, only companies can manage fleet");
    }

    const { driverName, vehicleName, licensePlate, imageUrl, vehicleType, currentLocation, vehicleColor, vehicleModel } = req.body;

    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (vehicle) {
      if (vehicle.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Not authorized to update this vehicle");
      }

      vehicle.driverName = driverName || vehicle.driverName;
      vehicle.vehicleName = vehicleName || vehicle.vehicleName;
      vehicle.licensePlate = licensePlate || vehicle.licensePlate;
      vehicle.imageUrl = imageUrl || vehicle.imageUrl;
      vehicle.vehicleType = vehicleType || vehicle.vehicleType;
      vehicle.currentLocation = currentLocation || vehicle.currentLocation;
      vehicle.vehicleColor = vehicleColor || vehicle.vehicleColor;
      vehicle.vehicleModel = vehicleModel || vehicle.vehicleModel;

      const updatedVehicle = await vehicle.save();
      res.json(updatedVehicle);
    } else {
      res.status(404);
      throw new Error("Vehicle not found");
    }
  })
);

// @desc    Delete a specific vehicle from user's fleet
// @route   DELETE /api/vehicles/:vehicleId
// @access  Private (Company only)
router.delete(
  "/:vehicleId",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.userType !== "company") {
      res.status(403);
      throw new Error("Not authorized, only companies can manage fleet");
    }

    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (vehicle) {
      if (vehicle.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Not authorized to delete this vehicle");
      }

      await vehicle.deleteOne();
      res.json({ message: "Vehicle removed" });
    } else {
      res.status(404);
      throw new Error("Vehicle not found");
    }
  })
);

// @desc    Get all vehicles for a specific user (for public profile view)
// @route   GET /api/vehicles/user/:userId
// @access  Public
router.get(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.find({ user: req.params.userId });
    res.json(vehicles);
  })
);

module.exports = router;

