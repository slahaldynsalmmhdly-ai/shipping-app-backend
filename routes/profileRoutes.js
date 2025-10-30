const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Review = require("../models/Review");
const Post = require("../models/Post");
const { protect } = require("../middleware/authMiddleware");

// @desc    Get all companies
// @route   GET /api/profile/companies
// @access  Public
router.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const companies = await User.find({ userType: "company" }).select("-password");
    
    // Add rating and reviewCount for each company
    const companiesWithRatings = await Promise.all(
      companies.map(async (company) => {
        const reviews = await Review.find({ user: company._id });
        const rating = reviews.length > 0
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : 0;
        const reviewCount = reviews.length;
        
        // Calculate likes count from all posts
        const posts = await Post.find({ user: company._id });
        const likesCount = posts.reduce((total, post) => {
          return total + (post.reactions?.filter(r => r.type === 'like').length || 0);
        }, 0);

        return {
          ...company.toObject(),
          rating,
          reviewCount,
          likesCount,
          followersCount: company.followers?.length || 0,
          followingCount: company.following?.length || 0
        };
      })
    );
    
    res.json(companiesWithRatings);
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
      // Calculate rating and reviewCount
      const reviews = await Review.find({ user: user._id });
      const rating = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;
      const reviewCount = reviews.length;
      
      // Calculate likes count from all posts
      const posts = await Post.find({ user: user._id });
      const likesCount = posts.reduce((total, post) => {
        return total + (post.reactions?.filter(r => r.type === 'like').length || 0);
      }, 0);

      res.json({
        ...user.toObject(),
        rating,
        reviewCount,
        likesCount,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      });
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
        user.companyEmail = req.body.companyEmail || user.companyEmail;
        user.address = req.body.address || user.address;
        user.city = req.body.city || user.city;
        user.country = req.body.country || user.country;
        user.streetName = req.body.streetName || user.streetName;
        user.districtName = req.body.districtName || user.districtName;
        user.website = req.body.website || user.website;
        user.workClassification = req.body.workClassification || user.workClassification;
        user.truckCount = req.body.truckCount || user.truckCount;
        user.truckTypes = req.body.truckTypes || user.truckTypes;
        user.registrationNumber = req.body.registrationNumber || user.registrationNumber;
        user.fleetImages = req.body.fleetImages || user.fleetImages;
        user.licenseImages = req.body.licenseImages || user.licenseImages;
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
        companyEmail: updatedUser.companyEmail,
        address: updatedUser.address,
        city: updatedUser.city,
        country: updatedUser.country,
        streetName: updatedUser.streetName,
        districtName: updatedUser.districtName,
        website: updatedUser.website,
        workClassification: updatedUser.workClassification,
        truckCount: updatedUser.truckCount,
        truckTypes: updatedUser.truckTypes,
        registrationNumber: updatedUser.registrationNumber,
        fleetImages: updatedUser.fleetImages,
        licenseImages: updatedUser.licenseImages,
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
      // Calculate rating and reviewCount
      const reviews = await Review.find({ user: user._id });
      const rating = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;
      const reviewCount = reviews.length;
      
      // Calculate likes count from all posts
      const posts = await Post.find({ user: user._id });
      const likesCount = posts.reduce((total, post) => {
        return total + (post.reactions?.filter(r => r.type === 'like').length || 0);
      }, 0);

      res.json({
        ...user.toObject(),
        rating,
        reviewCount,
        likesCount,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

module.exports = router;
