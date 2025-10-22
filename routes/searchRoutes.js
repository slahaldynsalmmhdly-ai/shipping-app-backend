const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const ShipmentAd = require("../models/ShipmentAd");
const EmptyTruckAd = require("../models/EmptyTruckAd");
const Review = require("../models/Review");

// دالة للتحقق من الكلمات المفتاحية
function matchesKeywords(searchQuery, keywords) {
  const query = searchQuery.toLowerCase().trim();
  return keywords.some(keyword => query.includes(keyword.toLowerCase()));
}

// كلمات مفتاحية للشاحنات الفارغة
const emptyTruckKeywords = [
  'شاحنة فارغة', 'شاحنه فارغه', 'حمولة فارغة', 'حموله فارغه',
  'أسطول فاضي', 'اسطول فاضي', 'شاحنة متاحة', 'شاحنه متاحه',
  'ترحيلة فارغة', 'ترحيله فارغه', 'empty truck', 'available truck',
  'فارغ', 'فارغه', 'فاضي', 'فاضيه', 'متاح', 'متاحه', 'متاحة'
];

// كلمات مفتاحية لإعلانات الشحن
const shipmentKeywords = [
  'إعلان شحن', 'اعلان شحن', 'طلب شحن', 'حمولة', 'حموله',
  'شحنة', 'شحنه', 'بضاعة', 'بضاعه', 'نقل بضائع',
  'shipment', 'cargo', 'شحن'
];

// كلمات مفتاحية عامة للإعلانات
const generalAdKeywords = [
  'إعلان', 'اعلان', 'إعلانات', 'اعلانات', 'منشور',
  'ad', 'ads', 'post'
];

// @desc    البحث المتكامل في جميع أنواع المحتوى
// @route   GET /api/v1/search
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { query, category = "all", page = 1, limit = 20 } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "يرجى إدخال نص للبحث" 
      });
    }

    const searchQuery = query.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let results = {
      query: searchQuery,
      category,
      companies: [],
      posts: [],
      vehicles: [],
      shipmentAds: [],
      emptyTruckAds: [],
      totalResults: 0,
      pagination: {
        currentPage: parseInt(page),
        limit: limitNum,
      }
    };

    // التحقق من الكلمات المفتاحية
    const isEmptyTruckSearch = matchesKeywords(searchQuery, emptyTruckKeywords);
    const isShipmentSearch = matchesKeywords(searchQuery, shipmentKeywords);
    const isGeneralAdSearch = matchesKeywords(searchQuery, generalAdKeywords);

    // البحث في الشركات
    if (category === "all" || category === "companies") {
      const companiesQuery = {
        userType: "company",
        $or: [
          { companyName: { $regex: searchQuery, $options: "i" } },
          { name: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { city: { $regex: searchQuery, $options: "i" } },
          { workClassification: { $regex: searchQuery, $options: "i" } },
          { truckTypes: { $regex: searchQuery, $options: "i" } },
        ]
      };

      const companies = await User.find(companiesQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "companies" ? limitNum : 10)
        .skip(category === "companies" ? skip : 0)
        .lean();

      // إضافة التقييمات لكل شركة
      const companiesWithReviews = await Promise.all(
        companies.map(async (company) => {
          const reviews = await Review.find({ user: company._id });
          const reviewCount = reviews.length;
          const averageRating = reviewCount > 0
            ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
            : 0;

          return {
            ...company,
            reviewCount,
            averageRating: parseFloat(averageRating),
            rating: parseFloat(averageRating),
            truckCount: company.truckCount || 0,
            type: "company"
          };
        })
      );

      results.companies = companiesWithReviews;

      if (category === "companies") {
        const totalCompanies = await User.countDocuments(companiesQuery);
        results.totalResults = totalCompanies;
        results.pagination.totalPages = Math.ceil(totalCompanies / limitNum);
        results.pagination.hasMore = skip + companiesWithReviews.length < totalCompanies;
      }
    }

    // البحث في المنشورات
    if (category === "all" || category === "posts") {
      const postsQuery = {
        $or: [
          { text: { $regex: searchQuery, $options: "i" } },
          { repostText: { $regex: searchQuery, $options: "i" } },
        ]
      };

      const posts = await Post.find(postsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "posts" ? limitNum : 10)
        .skip(category === "posts" ? skip : 0)
        .lean();

      results.posts = posts.map(post => ({
        ...post,
        type: "post",
        likesCount: post.reactions?.filter(r => r.type === "like").length || 0,
        commentsCount: post.comments?.length || 0,
      }));

      if (category === "posts") {
        const totalPosts = await Post.countDocuments(postsQuery);
        results.totalResults = totalPosts;
        results.pagination.totalPages = Math.ceil(totalPosts / limitNum);
        results.pagination.hasMore = skip + posts.length < totalPosts;
      }
    }

    // البحث في الأساطيل (المركبات المتاحة)
    if (category === "all" || category === "vehicles") {
      const vehiclesQuery = {
        status: "متاح",
        $or: [
          { vehicleName: { $regex: searchQuery, $options: "i" } },
          { vehicleType: { $regex: searchQuery, $options: "i" } },
          { currentLocation: { $regex: searchQuery, $options: "i" } },
          { driverName: { $regex: searchQuery, $options: "i" } },
          { vehicleModel: { $regex: searchQuery, $options: "i" } },
        ]
      };

      const vehicles = await Vehicle.find(vehiclesQuery)
        .populate("user", "name avatar userType companyName city")
        .sort({ createdAt: -1 })
        .limit(category === "vehicles" ? limitNum : 10)
        .skip(category === "vehicles" ? skip : 0)
        .lean();

      results.vehicles = vehicles.map(vehicle => ({
        ...vehicle,
        type: "vehicle"
      }));

      if (category === "vehicles") {
        const totalVehicles = await Vehicle.countDocuments(vehiclesQuery);
        results.totalResults = totalVehicles;
        results.pagination.totalPages = Math.ceil(totalVehicles / limitNum);
        results.pagination.hasMore = skip + vehicles.length < totalVehicles;
      }
    }

    // البحث في إعلانات الشحن
    // إذا كان البحث يحتوي على كلمات مفتاحية عامة أو كلمات شحن، نجلب جميع الإعلانات
    if (category === "all" || category === "shipments" || 
        isShipmentSearch || isGeneralAdSearch) {
      
      let shipmentAdsQuery;
      
      // إذا كان البحث عن كلمات مفتاحية عامة فقط، نجلب كل الإعلانات
      if (isGeneralAdSearch && !searchQuery.match(/[a-zA-Z\u0600-\u06FF]{3,}/)) {
        shipmentAdsQuery = {};
      } else if (isShipmentSearch) {
        // إذا كان البحث يحتوي على كلمات شحن، نجلب كل الإعلانات أو نبحث في الحقول
        shipmentAdsQuery = {
          $or: [
            { pickupLocation: { $regex: searchQuery, $options: "i" } },
            { deliveryLocation: { $regex: searchQuery, $options: "i" } },
            { truckType: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ]
        };
      } else {
        shipmentAdsQuery = {
          $or: [
            { pickupLocation: { $regex: searchQuery, $options: "i" } },
            { deliveryLocation: { $regex: searchQuery, $options: "i" } },
            { truckType: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ]
        };
      }

      const shipmentAds = await ShipmentAd.find(shipmentAdsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "shipments" ? limitNum : 10)
        .skip(category === "shipments" ? skip : 0)
        .lean();

      results.shipmentAds = shipmentAds.map(ad => ({
        ...ad,
        type: "shipment",
        likesCount: ad.reactions?.filter(r => r.type === "like").length || 0,
        commentsCount: ad.comments?.length || 0,
      }));

      if (category === "shipments") {
        const totalShipmentAds = await ShipmentAd.countDocuments(shipmentAdsQuery);
        results.totalResults = totalShipmentAds;
        results.pagination.totalPages = Math.ceil(totalShipmentAds / limitNum);
        results.pagination.hasMore = skip + shipmentAds.length < totalShipmentAds;
      }
    }

    // البحث في إعلانات الشاحنات الفارغة
    // إذا كان البحث يحتوي على كلمات مفتاحية للشاحنات الفارغة أو كلمات عامة، نجلب جميع الإعلانات
    if (category === "all" || category === "emptyTrucks" || 
        isEmptyTruckSearch || isGeneralAdSearch) {
      
      let emptyTruckAdsQuery;
      
      // إذا كان البحث عن كلمات مفتاحية عامة أو شاحنات فارغة فقط، نجلب كل الإعلانات
      if ((isGeneralAdSearch || isEmptyTruckSearch) && !searchQuery.match(/[a-zA-Z\u0600-\u06FF]{3,}/)) {
        emptyTruckAdsQuery = {};
      } else if (isEmptyTruckSearch) {
        // إذا كان البحث يحتوي على كلمات شاحنات فارغة، نجلب كل الإعلانات أو نبحث في الحقول
        emptyTruckAdsQuery = {
          $or: [
            { currentLocation: { $regex: searchQuery, $options: "i" } },
            { preferredDestination: { $regex: searchQuery, $options: "i" } },
            { truckType: { $regex: searchQuery, $options: "i" } },
            { additionalNotes: { $regex: searchQuery, $options: "i" } },
          ]
        };
      } else {
        emptyTruckAdsQuery = {
          $or: [
            { currentLocation: { $regex: searchQuery, $options: "i" } },
            { preferredDestination: { $regex: searchQuery, $options: "i" } },
            { truckType: { $regex: searchQuery, $options: "i" } },
            { additionalNotes: { $regex: searchQuery, $options: "i" } },
          ]
        };
      }

      const emptyTruckAds = await EmptyTruckAd.find(emptyTruckAdsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "emptyTrucks" ? limitNum : 10)
        .skip(category === "emptyTrucks" ? skip : 0)
        .lean();

      results.emptyTruckAds = emptyTruckAds.map(ad => ({
        ...ad,
        type: "emptyTruck",
        likesCount: ad.reactions?.filter(r => r.type === "like").length || 0,
        commentsCount: ad.comments?.length || 0,
      }));

      if (category === "emptyTrucks") {
        const totalEmptyTruckAds = await EmptyTruckAd.countDocuments(emptyTruckAdsQuery);
        results.totalResults = totalEmptyTruckAds;
        results.pagination.totalPages = Math.ceil(totalEmptyTruckAds / limitNum);
        results.pagination.hasMore = skip + emptyTruckAds.length < totalEmptyTruckAds;
      }
    }

    // حساب إجمالي النتائج لفئة "الكل"
    if (category === "all") {
      results.totalResults = 
        results.companies.length +
        results.posts.length +
        results.vehicles.length +
        results.shipmentAds.length +
        results.emptyTruckAds.length;
    }

    res.json({
      success: true,
      results: results
    });

  } catch (err) {
    console.error("Search Error:", err.message);
    res.status(500).json({ 
      success: false,
      message: "حدث خطأ أثناء البحث. حاول مرة أخرى." 
    });
  }
});

// @desc    الحصول على اقتراحات البحث (autocomplete)
// @route   GET /api/v1/search/suggestions
// @access  Public
router.get("/suggestions", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.json({ suggestions: [] });
    }

    const searchQuery = query.trim();
    const suggestions = [];

    // اقتراحات من أسماء الشركات
    const companies = await User.find({
      userType: "company",
      $or: [
        { companyName: { $regex: searchQuery, $options: "i" } },
        { name: { $regex: searchQuery, $options: "i" } },
      ]
    })
    .select("companyName name")
    .limit(5)
    .lean();

    companies.forEach(company => {
      const name = company.companyName || company.name;
      if (name && !suggestions.includes(name)) {
        suggestions.push(name);
      }
    });

    // اقتراحات من المدن
    const cities = await User.distinct("city", {
      userType: "company",
      city: { $regex: searchQuery, $options: "i" }
    });
    
    cities.slice(0, 3).forEach(city => {
      if (city && !suggestions.includes(city)) {
        suggestions.push(city);
      }
    });

    // اقتراحات من أنواع الشاحنات
    const vehicles = await Vehicle.distinct("vehicleType", {
      vehicleType: { $regex: searchQuery, $options: "i" }
    });

    vehicles.slice(0, 3).forEach(type => {
      if (type && !suggestions.includes(type)) {
        suggestions.push(type);
      }
    });

    res.json({ 
      suggestions: suggestions.slice(0, 8) // أقصى 8 اقتراحات
    });

  } catch (err) {
    console.error("Suggestions Error:", err.message);
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;

