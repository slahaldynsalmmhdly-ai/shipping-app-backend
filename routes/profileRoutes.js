const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// @desc    Get all companies
// @route   GET /api/profile/companies
// @access  Public
router.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const companies = await User.find({ userType: "company" }).select("-password");
    res.json(companies);
  })
);

// @desc    Get user profile
// @route   GET /api/profile/me
// @access  Private
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password");

    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// @desc    Update user profile
// @route   PUT /api/profile/me
// @access  Private
router.put(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.description = req.body.description || user.description;
      user.avatar = req.body.avatar || user.avatar;
      user.coverImage = req.body.coverImage || user.coverImage;

      if (user.userType === "company") {
        user.companyName = req.body.companyName || user.companyName;
        user.address = req.body.address || user.address;
        user.city = req.body.city || user.city;
        user.truckCount = req.body.truckCount || user.truckCount;
        user.truckTypes = req.body.truckTypes || user.truckTypes;
        user.registrationNumber = req.body.registrationNumber || user.registrationNumber;
        user.fleetImages = req.body.fleetImages || user.fleetImages;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        userType: updatedUser.userType,
        avatar: updatedUser.avatar,
        coverImage: updatedUser.coverImage,
        phone: updatedUser.phone,
        description: updatedUser.description,
        companyName: updatedUser.companyName,
        address: updatedUser.address,
        city: updatedUser.city,
        truckCount: updatedUser.truckCount,
        truckTypes: updatedUser.truckTypes,
        registrationNumber: updatedUser.registrationNumber,
        fleetImages: updatedUser.fleetImages,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// @desc    Get public user profile by ID
// @route   GET /api/profile/:userId
// @access  Public
router.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId).select("-password");

    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

module.exports = router;

