const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ShipmentAd = require("../models/ShipmentAd");
const User = require("../models/User"); // Assuming User model is needed for populating user info

// @desc    Create a new shipment ad
// @route   POST /api/v1/shipmentads
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const {
      pickupLocation,
      deliveryLocation,
      pickupDate,
      truckType,
      description,
      media,
    } = req.body;

    // Check if user exists (optional, but good for data integrity)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const newShipmentAd = new ShipmentAd({
      user: req.user.id,
      pickupLocation,
      deliveryLocation,
      pickupDate,
      truckType,
      description,
      media: media || [], // media should be an array of { url, type: \'image\' | \'video\' }
    });

    const shipmentAd = await newShipmentAd.save();
    res.status(201).json(shipmentAd);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get all shipment ads by a specific user
// @route   GET /api/v1/shipmentads/user/:userId
// @access  Private
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const shipmentAds = await ShipmentAd.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"]);
    res.json(shipmentAds);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get all shipment ads
// @route   GET /api/v1/shipmentads
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const shipmentAds = await ShipmentAd.find()
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"]);
    res.json(shipmentAds);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Get shipment ad by ID
// @route   GET /api/v1/shipmentads/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id).populate(
      "user",
      ["name", "avatar"]
    );

    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    res.json(shipmentAd);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// @desc    Delete a shipment ad
// @route   DELETE /api/v1/shipmentads/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const shipmentAd = await ShipmentAd.findById(req.params.id);

    if (!shipmentAd) {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }

    // Check user
    if (shipmentAd.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await shipmentAd.deleteOne();

    res.json({ msg: "Shipment ad removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Shipment ad not found" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

module.exports = router;

