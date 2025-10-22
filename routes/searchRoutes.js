const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const ShipmentAd = require("../models/ShipmentAd");
const EmptyTruckAd = require("../models/EmptyTruckAd");
const Review = require("../models/Review");

// دالة لإنشاء استعلام بحث ذكي يجمع الكلمات المدخلة
function buildSmartSearchQuery(searchText, fields) {
  const query = searchText.trim();
  
  // إذا كان البحث فارغاً، نرجع استعلام فارغ
  if (!query) {
    return {};
  }

  // تقسيم النص إلى كلمات
  const words = query.split(/\s+/).filter(word => word.length > 0);
  
  // إنشاء استعلام OR لكل حقل مع كل كلمة
  const orConditions = [];
  
  fields.forEach(field => {
    // البحث عن النص الكامل
    orConditions.push({
      [field]: { $regex: query, $options: "i" }
    });
    
    // البحث عن كل كلمة على حدة
    words.forEach(word => {
      if (word.length >= 2) { // نتجاهل الكلمات القصيرة جداً
        orConditions.push({
          [field]: { $regex: word, $options: "i" }
        });
      }
    });
  });
  
  return orConditions.length > 0 ? { $or: orConditions } : {};
}

// دالة لحساب درجة الملاءمة (relevance score)
function calculateRelevanceScore(item, searchQuery, fields) {
  const query = searchQuery.toLowerCase();
  const words = query.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  
  fields.forEach(field => {
    const value = String(item[field] || '').toLowerCase();
    
    // تطابق كامل للنص
    if (value.includes(query)) {
      score += 10;
    }
    
    // تطابق لكل كلمة
    words.forEach(word => {
      if (value.includes(word)) {
        score += 3;
      }
    });
    
    // تطابق في بداية النص (أكثر أهمية)
    if (value.startsWith(query)) {
      score += 5;
    }
  });
  
  return score;
}

// @desc    البحث الذكي المتكامل في جميع أنواع المحتوى
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

    // البحث في الشركات
    if (category === "all" || category === "companies") {
      const companiesSearchQuery = buildSmartSearchQuery(searchQuery, [
        'companyName', 'name', 'description', 'city', 
        'workClassification', 'truckTypes'
      ]);
      
      const companiesQuery = {
        userType: "company",
        ...companiesSearchQuery
      };

      const companies = await User.find(companiesQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "companies" ? limitNum : 15)
        .skip(category === "companies" ? skip : 0)
        .lean();

      // إضافة التقييمات ودرجة الملاءمة لكل شركة
      const companiesWithReviews = await Promise.all(
        companies.map(async (company) => {
          const reviews = await Review.find({ user: company._id });
          const reviewCount = reviews.length;
          const averageRating = reviewCount > 0
            ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
            : 0;

          const relevanceScore = calculateRelevanceScore(
            company, 
            searchQuery, 
            ['companyName', 'name', 'description', 'city', 'workClassification', 'truckTypes']
          );

          return {
            ...company,
            reviewCount,
            averageRating: parseFloat(averageRating),
            rating: parseFloat(averageRating),
            truckCount: company.truckCount || 0,
            type: "company",
            relevanceScore
          };
        })
      );

      // ترتيب حسب درجة الملاءمة
      companiesWithReviews.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
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
      const postsSearchQuery = buildSmartSearchQuery(searchQuery, [
        'text', 'repostText'
      ]);
      
      const postsQuery = postsSearchQuery;

      const posts = await Post.find(postsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "posts" ? limitNum : 15)
        .skip(category === "posts" ? skip : 0)
        .lean();

      const postsWithRelevance = posts.map(post => {
        const relevanceScore = calculateRelevanceScore(
          post, 
          searchQuery, 
          ['text', 'repostText']
        );

        return {
          ...post,
          type: "post",
          likesCount: post.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: post.comments?.length || 0,
          relevanceScore
        };
      });

      // ترتيب حسب درجة الملاءمة ثم التاريخ
      postsWithRelevance.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.posts = postsWithRelevance;

      if (category === "posts") {
        const totalPosts = await Post.countDocuments(postsQuery);
        results.totalResults = totalPosts;
        results.pagination.totalPages = Math.ceil(totalPosts / limitNum);
        results.pagination.hasMore = skip + posts.length < totalPosts;
      }
    }

    // البحث في الأساطيل (المركبات المتاحة)
    if (category === "all" || category === "vehicles") {
      const vehiclesSearchQuery = buildSmartSearchQuery(searchQuery, [
        'vehicleName', 'vehicleType', 'currentLocation', 
        'driverName', 'vehicleModel'
      ]);
      
      const vehiclesQuery = {
        status: "متاح",
        ...vehiclesSearchQuery
      };

      const vehicles = await Vehicle.find(vehiclesQuery)
        .populate("user", "name avatar userType companyName city")
        .sort({ createdAt: -1 })
        .limit(category === "vehicles" ? limitNum : 15)
        .skip(category === "vehicles" ? skip : 0)
        .lean();

      const vehiclesWithRelevance = vehicles.map(vehicle => {
        const relevanceScore = calculateRelevanceScore(
          vehicle, 
          searchQuery, 
          ['vehicleName', 'vehicleType', 'currentLocation', 'driverName', 'vehicleModel']
        );

        return {
          ...vehicle,
          type: "vehicle",
          relevanceScore
        };
      });

      // ترتيب حسب درجة الملاءمة
      vehiclesWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);

      results.vehicles = vehiclesWithRelevance;

      if (category === "vehicles") {
        const totalVehicles = await Vehicle.countDocuments(vehiclesQuery);
        results.totalResults = totalVehicles;
        results.pagination.totalPages = Math.ceil(totalVehicles / limitNum);
        results.pagination.hasMore = skip + vehicles.length < totalVehicles;
      }
    }

    // البحث في إعلانات الشحن
    if (category === "all" || category === "shipments") {
      const shipmentAdsSearchQuery = buildSmartSearchQuery(searchQuery, [
        'pickupLocation', 'deliveryLocation', 'truckType', 'description'
      ]);
      
      const shipmentAdsQuery = shipmentAdsSearchQuery;

      const shipmentAds = await ShipmentAd.find(shipmentAdsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "shipments" ? limitNum : 15)
        .skip(category === "shipments" ? skip : 0)
        .lean();

      const shipmentAdsWithRelevance = shipmentAds.map(ad => {
        const relevanceScore = calculateRelevanceScore(
          ad, 
          searchQuery, 
          ['pickupLocation', 'deliveryLocation', 'truckType', 'description']
        );

        return {
          ...ad,
          type: "shipment",
          likesCount: ad.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: ad.comments?.length || 0,
          relevanceScore
        };
      });

      // ترتيب حسب درجة الملاءمة ثم التاريخ
      shipmentAdsWithRelevance.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.shipmentAds = shipmentAdsWithRelevance;

      if (category === "shipments") {
        const totalShipmentAds = await ShipmentAd.countDocuments(shipmentAdsQuery);
        results.totalResults = totalShipmentAds;
        results.pagination.totalPages = Math.ceil(totalShipmentAds / limitNum);
        results.pagination.hasMore = skip + shipmentAds.length < totalShipmentAds;
      }
    }

    // البحث في إعلانات الشاحنات الفارغة
    if (category === "all" || category === "emptyTrucks") {
      const emptyTruckAdsSearchQuery = buildSmartSearchQuery(searchQuery, [
        'currentLocation', 'preferredDestination', 'truckType', 'additionalNotes'
      ]);
      
      const emptyTruckAdsQuery = emptyTruckAdsSearchQuery;

      const emptyTruckAds = await EmptyTruckAd.find(emptyTruckAdsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "emptyTrucks" ? limitNum : 15)
        .skip(category === "emptyTrucks" ? skip : 0)
        .lean();

      const emptyTruckAdsWithRelevance = emptyTruckAds.map(ad => {
        const relevanceScore = calculateRelevanceScore(
          ad, 
          searchQuery, 
          ['currentLocation', 'preferredDestination', 'truckType', 'additionalNotes']
        );

        return {
          ...ad,
          type: "emptyTruck",
          likesCount: ad.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: ad.comments?.length || 0,
          relevanceScore
        };
      });

      // ترتيب حسب درجة الملاءمة ثم التاريخ
      emptyTruckAdsWithRelevance.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.emptyTruckAds = emptyTruckAdsWithRelevance;

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
    
    cities.slice(0, 5).forEach(city => {
      if (city && !suggestions.includes(city)) {
        suggestions.push(city);
      }
    });

    // اقتراحات من مواقع الشاحنات
    const vehicleLocations = await Vehicle.distinct("currentLocation", {
      currentLocation: { $regex: searchQuery, $options: "i" }
    });

    vehicleLocations.slice(0, 3).forEach(location => {
      if (location && !suggestions.includes(location)) {
        suggestions.push(location);
      }
    });

    // اقتراحات من مواقع الاستلام والتسليم
    const pickupLocations = await ShipmentAd.distinct("pickupLocation", {
      pickupLocation: { $regex: searchQuery, $options: "i" }
    });

    pickupLocations.slice(0, 3).forEach(location => {
      if (location && !suggestions.includes(location)) {
        suggestions.push(location);
      }
    });

    const deliveryLocations = await ShipmentAd.distinct("deliveryLocation", {
      deliveryLocation: { $regex: searchQuery, $options: "i" }
    });

    deliveryLocations.slice(0, 3).forEach(location => {
      if (location && !suggestions.includes(location)) {
        suggestions.push(location);
      }
    });

    // اقتراحات من أنواع الشاحنات
    const vehicleTypes = await Vehicle.distinct("vehicleType", {
      vehicleType: { $regex: searchQuery, $options: "i" }
    });

    vehicleTypes.slice(0, 3).forEach(type => {
      if (type && !suggestions.includes(type)) {
        suggestions.push(type);
      }
    });

    res.json({ 
      suggestions: suggestions.slice(0, 10) // أقصى 10 اقتراحات
    });

  } catch (err) {
    console.error("Suggestions Error:", err.message);
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;

