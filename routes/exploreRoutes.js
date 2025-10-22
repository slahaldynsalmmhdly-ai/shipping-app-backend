const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Review = require("../models/Review");

// @desc    Get companies for explore page with search and filters
// @route   GET /api/v1/explore/companies
// @access  Public (or Private if you want to protect it)
router.get("/companies", async (req, res) => {
  try {
    const { search, city, truckType, workClassification, sortBy, page = 1, limit = 20 } = req.query;

    // Build query for companies only
    let query = { userType: "company" };

    // Search filter - search in company name, description, or city
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    // City filter
    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    // Truck type filter
    if (truckType) {
      query.truckTypes = { $regex: truckType, $options: "i" };
    }

    // Work classification filter
    if (workClassification) {
      query.workClassification = { $regex: workClassification, $options: "i" };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch companies
    let companies = await User.find(query)
      .select("-password -googleId -firebaseUid -notifications")
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get review counts and average ratings for each company
    const companiesWithReviews = await Promise.all(
      companies.map(async (company) => {
        const reviews = await Review.find({ reviewedUser: company._id });
        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0
          ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
          : 0;

        return {
          ...company,
          reviewCount,
          averageRating: parseFloat(averageRating),
          rating: parseFloat(averageRating), // Add rating field for frontend compatibility
          truckCount: company.truckCount || 0, // Use truckCount from company model
        };
      })
    );

    // Sort companies based on sortBy parameter
    if (sortBy === "rating") {
      companiesWithReviews.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sortBy === "reviews") {
      companiesWithReviews.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (sortBy === "trucks") {
      companiesWithReviews.sort((a, b) => (b.truckCount || 0) - (a.truckCount || 0));
    } else if (sortBy === "newest") {
      companiesWithReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get total count for pagination
    const totalCompanies = await User.countDocuments(query);

    res.json({
      companies: companiesWithReviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCompanies / parseInt(limit)),
        totalCompanies,
        hasMore: skip + companiesWithReviews.length < totalCompanies,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get featured/recommended companies
// @route   GET /api/v1/explore/companies/featured
// @access  Public
router.get("/companies/featured", async (req, res) => {
  try {
    // Get companies with highest ratings and most reviews
    const companies = await User.find({ userType: "company" })
      .select("-password -googleId -firebaseUid -notifications")
      .limit(10)
      .lean();

    // Get review counts and average ratings
    const companiesWithReviews = await Promise.all(
      companies.map(async (company) => {
        const reviews = await Review.find({ reviewedUser: company._id });
        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0
          ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
          : 0;

        return {
          ...company,
          reviewCount,
          averageRating: parseFloat(averageRating),
          rating: parseFloat(averageRating), // Add rating field for frontend compatibility
          truckCount: company.truckCount || 0, // Use truckCount from company model
        };
      })
    );

    // Sort by rating and review count
    const featured = companiesWithReviews
      .filter(c => c.reviewCount > 0) // Only companies with reviews
      .sort((a, b) => {
        // First sort by rating, then by review count
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 6); // Get top 6 featured companies

    res.json({ companies: featured });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get available cities (for filter dropdown)
// @route   GET /api/v1/explore/cities
// @access  Public
router.get("/cities", async (req, res) => {
  try {
    const cities = await User.distinct("city", { 
      userType: "company",
      city: { $ne: "" } // Exclude empty cities
    });
    
    res.json({ cities: cities.filter(city => city) }); // Filter out null/undefined
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get available truck types (for filter dropdown)
// @route   GET /api/v1/explore/truck-types
// @access  Public
router.get("/truck-types", async (req, res) => {
  try {
    const companies = await User.find({ 
      userType: "company",
      truckTypes: { $ne: "" }
    }).select("truckTypes");

    // Extract and deduplicate truck types
    const truckTypesSet = new Set();
    companies.forEach(company => {
      if (company.truckTypes) {
        // Split by comma and trim each type
        const types = company.truckTypes.split(/[،,]/).map(t => t.trim());
        types.forEach(type => {
          if (type) truckTypesSet.add(type);
        });
      }
    });

    res.json({ truckTypes: Array.from(truckTypesSet) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;



// @desc    Get available work classifications (for filter dropdown)
// @route   GET /api/v1/explore/work-classifications
// @access  Public
router.get("/work-classifications", async (req, res) => {
  try {
    const companies = await User.find({ 
      userType: "company",
      workClassification: { $ne: "" }
    }).select("workClassification");

    // Extract and deduplicate work classifications
    const classificationsSet = new Set();
    companies.forEach(company => {
      if (company.workClassification) {
        // Split by comma and trim each classification
        const classifications = company.workClassification.split(/[،,]/).map(c => c.trim());
        classifications.forEach(classification => {
          if (classification) classificationsSet.add(classification);
        });
      }
    });

    res.json({ workClassifications: Array.from(classificationsSet) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

