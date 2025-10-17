const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const EmptyTruckAd = require("../models/EmptyTruckAd");

// @desc    Create a new empty truck ad
// @route   POST /api/v1/emptytruckads
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { currentLocation, preferredDestination, availabilityDate, truckType, additionalNotes, media } = req.body;

    if (!currentLocation || !preferredDestination || !availabilityDate || !truckType) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const emptyTruckAd = await EmptyTruckAd.create({
      user: req.user.id,
      currentLocation,
      preferredDestination,
      availabilityDate,
      truckType,
      additionalNotes,
      media,
    });

    res.status(201).json(emptyTruckAd);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all empty truck ads
// @route   GET /api/v1/emptytruckads
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const emptyTruckAds = await EmptyTruckAd.find().populate("user", "name avatar");
    res.status(200).json(emptyTruckAds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single empty truck ad
// @route   GET /api/v1/emptytruckads/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id).populate("user", "name avatar");

    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    res.status(200).json(emptyTruckAd);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete empty truck ad
// @route   DELETE /api/v1/emptytruckads/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const emptyTruckAd = await EmptyTruckAd.findById(req.params.id);

    if (!emptyTruckAd) {
      return res.status(404).json({ message: "Empty truck ad not found" });
    }

    // Make sure the logged in user matches the ad user
    if (emptyTruckAd.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    await emptyTruckAd.deleteOne();

    res.status(200).json({ message: "Empty truck ad removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
