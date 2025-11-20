const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const { protect } = require("../middleware/authMiddleware");

// دالة لإنشاء استعلام بحث ذكي
function buildSmartSearchQuery(searchText, fields) {
  const query = searchText.trim();
  if (!query) return {};

  const words = query.split(/\s+/).filter(word => word.length > 0);
  const orConditions = [];
  
  fields.forEach(field => {
    orConditions.push({ [field]: { $regex: query, $options: "i" } });
    words.forEach(word => {
      if (word.length >= 2) {
        orConditions.push({ [field]: { $regex: word, $options: "i" } });
      }
    });
  });
  
  return orConditions.length > 0 ? { $or: orConditions } : {};
}

// دالة لحساب درجة الملاءمة
function calculateRelevanceScore(item, searchQuery, fields) {
  const query = searchQuery.toLowerCase();
  const words = query.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  
  fields.forEach(field => {
    const value = String(item[field] || '').toLowerCase();
    if (value.includes(query)) score += 10;
    words.forEach(word => {
      if (value.includes(word)) score += 3;
    });
    if (value.startsWith(query)) score += 5;
  });
  
  return score;
}

// @desc    البحث الذكي المتكامل مع فلاتر صارمة
// @route   GET /api/v1/search
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { 
      query, 
      category = "all", 
      page = 1, 
      limit = 20, 
      country, 
      city, 
      postCategory,
      jobType // جديد: للبحث في الوظائف فقط
    } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "يرجى إدخال نص للبحث" 
      });
    }

    const searchQuery = query.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // فلترة الموقع - صارمة ودقيقة
    let locationFilter = {};
    
    // إذا تم تحديد الدولة والمدينة معاً
    if (country && country !== '' && city && city !== '') {
      locationFilter = {
        country: country,
        city: city
      };
    } 
    // إذا تم تحديد الدولة فقط
    else if (country && country !== '') {
      locationFilter = { country: country };
    }
    // إذا تم تحديد المدينة فقط
    else if (city && city !== '') {
      locationFilter = { city: city };
    }

    let results = {
      query: searchQuery,
      category,
      companies: [],
      posts: [],
      vehicles: [],
      totalResults: 0,
      pagination: {
        currentPage: parseInt(page),
        limit: limitNum,
      }
    };

    // البحث في الشركات (companies)
    if (category === "all" || category === "companies") {
      // البحث فقط في الحقول المتعلقة بالشركات (بدون city/country)
      const companiesSearchQuery = buildSmartSearchQuery(searchQuery, ['name', 'companyName', 'description', 'workClassification']);
      
      const companiesQuery = {
        ...companiesSearchQuery,
        ...locationFilter, // الفلتر الصارم للموقع
        userType: "company"
      };

      const companies = await User.find(companiesQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "companies" ? limitNum : 15)
        .skip(category === "companies" ? skip : 0)
        .lean();

      const companiesWithRelevance = companies.map(company => {
        const relevanceScore = calculateRelevanceScore(company, searchQuery, ['name', 'companyName', 'description']);
        return {
          ...company,
          type: "company",
          reviewCount: 0,
          rating: 0,
          relevanceScore
        };
      });

      companiesWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      results.companies = companiesWithRelevance;

      if (category === "companies") {
        const totalCompanies = await User.countDocuments(companiesQuery);
        results.totalResults = totalCompanies;
        results.pagination.totalPages = Math.ceil(totalCompanies / limitNum);
        results.pagination.hasMore = skip + companiesWithRelevance.length < totalCompanies;
      }
    }

    // البحث في المنشورات
    if (category === "all" || category === "posts") {
      // البحث فقط في النص والتصنيف (بدون city/country في البحث النصي)
      const postsSearchQuery = buildSmartSearchQuery(searchQuery, ['text', 'repostText']);
      
      let postsQuery = {
        ...postsSearchQuery,
        ...locationFilter, // الفلتر الصارم للموقع
        $and: [
          { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] }
        ]
      };

      // فلترة صارمة حسب تصنيف المنشور
      if (postCategory && postCategory !== '') {
        postsQuery.category = postCategory;
      }

      // فلترة صارمة للوظائف
      if (jobType === 'jobs') {
        postsQuery.category = { 
          $in: ['طلب عمل', 'اعلان وظيفة', 'إعلان وظيفة', 'وظيفة', 'وظائف'] 
        };
      }

      const posts = await Post.find(postsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "posts" ? limitNum : 15)
        .skip(category === "posts" ? skip : 0)
        .lean();

      const postsWithRelevance = posts.map(post => {
        const relevanceScore = calculateRelevanceScore(post, searchQuery, ['text', 'repostText', 'category']);
        
        // تحويل الصور والفيديو إلى صيغة media
        const media = [];
        if (post.images && post.images.length > 0) {
          post.images.forEach(img => {
            media.push({ url: img, type: 'image' });
          });
        }
        if (post.video) {
          media.push({ url: post.video, type: 'video' });
        }

        return {
          ...post,
          type: "post",
          media: media,
          likesCount: post.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: post.comments?.length || 0,
          relevanceScore
        };
      });

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

    // البحث في المركبات/الأساطيل (vehicles)
    if (category === "all" || category === "vehicles") {
      const vehiclesSearchQuery = buildSmartSearchQuery(searchQuery, [
        'vehicleName', 
        'vehicleType', 
        'driverName', 
        'licensePlate', 
        'plateNumber'
      ]);
      
      const vehiclesQuery = {
        ...vehiclesSearchQuery,
        ...locationFilter // الفلتر الصارم للموقع (إذا كان Vehicle يحتوي على city/country)
      };

      const vehicles = await Vehicle.find(vehiclesQuery)
        .populate("user", "name avatar userType companyName")
        .limit(category === "vehicles" ? limitNum : 15)
        .skip(category === "vehicles" ? skip : 0)
        .lean();

      const vehiclesWithRelevance = vehicles.map(vehicle => {
        const relevanceScore = calculateRelevanceScore(vehicle, searchQuery, [
          'vehicleName', 
          'vehicleType', 
          'driverName', 
          'licensePlate'
        ]);
        
        return {
          ...vehicle,
          type: "vehicle",
          vehicleName: vehicle.vehicleName || vehicle.vehicleType || 'مركبة',
          licensePlate: vehicle.licensePlate || vehicle.plateNumber || '',
          currentLocation: vehicle.currentLocation || vehicle.departureCity || '',
          imageUrl: vehicle.imageUrl || (vehicle.imageUrls && vehicle.imageUrls[0]) || '',
          relevanceScore
        };
      });

      vehiclesWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      results.vehicles = vehiclesWithRelevance;

      if (category === "vehicles") {
        const totalVehicles = await Vehicle.countDocuments(vehiclesQuery);
        results.totalResults = totalVehicles;
        results.pagination.totalPages = Math.ceil(totalVehicles / limitNum);
        results.pagination.hasMore = skip + vehiclesWithRelevance.length < totalVehicles;
      }
    }

    // حساب إجمالي النتائج لفئة "الكل"
    if (category === "all") {
      results.totalResults = 
        results.companies.length +
        results.posts.length +
        results.vehicles.length;
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

module.exports = router;
