const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const { protect } = require("../middleware/authMiddleware");

// قائمة المدن والدول للكشف التلقائي
const CITIES = [
  'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'الطائف', 'تبوك', 'أبها', 'حائل',
  'القاهرة', 'الإسكندرية', 'الجيزة', 'شبرا الخيمة', 'بورسعيد', 'السويس', 'الأقصر', 'أسوان',
  'دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'أم القيوين',
  'الكويت', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء', 'مبارك الكبير',
  'عمان', 'إربد', 'الزرقاء', 'العقبة', 'السلط', 'مادبا', 'الكرك'
];

const COUNTRIES = [
  'السعودية', 'مصر', 'الإمارات', 'الكويت', 'الأردن', 'قطر', 'البحرين', 'عمان',
  'لبنان', 'سوريا', 'العراق', 'اليمن', 'ليبيا', 'تونس', 'الجزائر', 'المغرب'
];

const JOB_KEYWORDS = [
  'وظيفة', 'وظائف', 'عمل', 'توظيف', 'مطلوب', 'طلب عمل', 'اعلان وظيفة',
  'كهربائي', 'سائق', 'مهندس', 'محاسب', 'معلم', 'طبيب', 'ممرض', 'فني'
];

// دالة للكشف الذكي عن المدينة/الدولة في النص
function detectLocation(searchText) {
  const text = searchText.trim();
  let detectedCity = null;
  let detectedCountry = null;

  // البحث عن المدينة
  for (const city of CITIES) {
    if (text.includes(city)) {
      detectedCity = city;
      break;
    }
  }

  // البحث عن الدولة
  for (const country of COUNTRIES) {
    if (text.includes(country)) {
      detectedCountry = country;
      break;
    }
  }

  return { city: detectedCity, country: detectedCountry };
}

// دالة للكشف عن الوظائف
function detectJobSearch(searchText) {
  const text = searchText.toLowerCase();
  for (const keyword of JOB_KEYWORDS) {
    if (text.includes(keyword)) {
      return true;
    }
  }
  return false;
}

// دالة لإزالة المدينة/الدولة من نص البحث
function cleanSearchQuery(searchText, city, country) {
  let cleaned = searchText;
  if (city) cleaned = cleaned.replace(city, '').trim();
  if (country) cleaned = cleaned.replace(country, '').trim();
  return cleaned || searchText; // إذا أصبح فارغاً، نرجع النص الأصلي
}

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

// @desc    البحث الذكي التلقائي
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
      postCategory
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

    // الكشف الذكي عن المدينة والدولة
    const detectedLocation = detectLocation(searchQuery);
    const isJobSearch = detectJobSearch(searchQuery);
    
    // استخدام الموقع المكتشف أو المُرسل
    const finalCountry = country || detectedLocation.country;
    const finalCity = city || detectedLocation.city;
    
    // تنظيف نص البحث من المدينة/الدولة
    const cleanedQuery = cleanSearchQuery(searchQuery, detectedLocation.city, detectedLocation.country);

    // فلترة الموقع
    let locationFilter = {};
    if (finalCountry && finalCity) {
      locationFilter = {
        $or: [
          { country: finalCountry, city: finalCity },
          { country: finalCountry },
          { city: finalCity }
        ]
      };
    } else if (finalCountry) {
      locationFilter = {
        $or: [
          { country: finalCountry },
          { country: { $exists: false } }
        ]
      };
    } else if (finalCity) {
      locationFilter = {
        $or: [
          { city: finalCity },
          { city: { $exists: false } }
        ]
      };
    }

    let results = {
      query: searchQuery,
      detectedCity: detectedLocation.city,
      detectedCountry: detectedLocation.country,
      isJobSearch: isJobSearch,
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

    // البحث في الشركات
    if (category === "all" || category === "companies") {
      const companiesSearchQuery = buildSmartSearchQuery(cleanedQuery, ['name', 'companyName', 'description', 'workClassification']);
      
      const companiesQuery = {
        ...companiesSearchQuery,
        ...locationFilter,
        userType: "company"
      };

      const companies = await User.find(companiesQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "companies" ? limitNum : 15)
        .skip(category === "companies" ? skip : 0)
        .lean();

      const companiesWithRelevance = companies.map(company => {
        const relevanceScore = calculateRelevanceScore(company, cleanedQuery, ['name', 'companyName', 'description']);
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
      const postsSearchQuery = buildSmartSearchQuery(cleanedQuery, ['text', 'repostText', 'category']);
      
      let postsQuery = {
        ...postsSearchQuery,
        ...locationFilter,
        $and: [
          { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] }
        ]
      };

      // فلترة حسب تصنيف المنشور
      if (postCategory && postCategory !== '') {
        postsQuery.category = postCategory;
      }

      // إذا كان البحث عن وظائف، فلتر تلقائي
      if (isJobSearch && !postCategory) {
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
        const relevanceScore = calculateRelevanceScore(post, cleanedQuery, ['text', 'repostText', 'category']);
        
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

    // البحث في المركبات/الأساطيل
    if (category === "all" || category === "vehicles") {
      const vehiclesSearchQuery = buildSmartSearchQuery(cleanedQuery, [
        'vehicleName', 
        'vehicleType', 
        'driverName', 
        'licensePlate', 
        'plateNumber'
      ]);
      
      const vehiclesQuery = {
        ...vehiclesSearchQuery,
        ...locationFilter
      };

      const vehicles = await Vehicle.find(vehiclesQuery)
        .populate("user", "name avatar userType companyName")
        .limit(category === "vehicles" ? limitNum : 15)
        .skip(category === "vehicles" ? skip : 0)
        .lean();

      const vehiclesWithRelevance = vehicles.map(vehicle => {
        const relevanceScore = calculateRelevanceScore(vehicle, cleanedQuery, [
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
