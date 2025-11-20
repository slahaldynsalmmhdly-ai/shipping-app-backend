const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const { protect } = require("../middleware/authMiddleware");
const { generateEmbedding, rankBySemanticSimilarity } = require("../utils/embeddings");

// دالة لإنشاء استعلام بحث
function buildSearchQuery(searchText, fields) {
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

// @desc    البحث الدلالي الذكي باستخدام Embeddings (مثل YouTube)
// @route   GET /api/v1/search
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { 
      query, 
      category = "all", 
      page = 1, 
      limit = 20, 
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

    // توليد embedding لاستعلام البحث
    console.log("Generating embedding for query:", searchQuery);
    const queryEmbedding = await generateEmbedding(searchQuery);

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

    // البحث في الشركات
    if (category === "all" || category === "companies") {
      const companiesSearchQuery = buildSearchQuery(searchQuery, [
        'name', 
        'companyName', 
        'description', 
        'workClassification'
      ]);
      
      const companiesQuery = {
        ...companiesSearchQuery,
        userType: "company"
      };

      const companies = await User.find(companiesQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "companies" ? limitNum * 2 : 30)
        .lean();

      // ترتيب حسب الملاءمة النصية
      const companiesWithRelevance = companies.map(company => {
        const text = `${company.name || ''} ${company.companyName || ''} ${company.description || ''}`.toLowerCase();
        const queryLower = searchQuery.toLowerCase();
        let score = 0;
        
        if (text.includes(queryLower)) score += 10;
        const words = queryLower.split(/\s+/);
        words.forEach(word => {
          if (text.includes(word)) score += 3;
        });
        
        return {
          ...company,
          type: "company",
          reviewCount: 0,
          rating: 0,
          relevanceScore: score
        };
      });

      companiesWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      results.companies = companiesWithRelevance.slice(0, category === "companies" ? limitNum : 15);

      if (category === "companies") {
        const totalCompanies = await User.countDocuments(companiesQuery);
        results.totalResults = totalCompanies;
        results.pagination.totalPages = Math.ceil(totalCompanies / limitNum);
        results.pagination.hasMore = skip + results.companies.length < totalCompanies;
      }
    }

    // البحث في المنشورات (البحث الدلالي الذكي)
    if (category === "all" || category === "posts") {
      const postsSearchQuery = buildSearchQuery(searchQuery, [
        'text', 
        'repostText',
        'category'
      ]);
      
      let postsQuery = {
        ...postsSearchQuery,
        $and: [
          { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] }
        ]
      };

      // فلترة حسب تصنيف المنشور (فقط إذا المستخدم اختار تصنيف محدد من الواجهة)
      if (postCategory && postCategory !== '') {
        postsQuery.category = postCategory;
      }

      // جلب المنشورات مع embeddings
      const posts = await Post.find(postsQuery)
        .select('+embedding') // تضمين حقل embedding
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "posts" ? limitNum * 3 : 50) // جلب عدد أكبر للترتيب الدلالي
        .lean();

      console.log(`Found ${posts.length} posts for query: ${searchQuery}`);

      // ترتيب حسب التشابه الدلالي (إذا كان queryEmbedding موجود)
      let rankedPosts = posts;
      if (queryEmbedding && posts.length > 0) {
        rankedPosts = rankBySemanticSimilarity(posts, queryEmbedding, 'text');
        console.log("Ranked posts by semantic similarity");
      } else {
        // ترتيب بسيط حسب الملاءمة النصية
        rankedPosts = posts.map(post => {
          const text = `${post.text || ''} ${post.repostText || ''} ${post.category || ''}`.toLowerCase();
          const queryLower = searchQuery.toLowerCase();
          let score = 0;
          
          if (text.includes(queryLower)) score += 10;
          const words = queryLower.split(/\s+/);
          words.forEach(word => {
            if (text.includes(word)) score += 3;
          });
          
          // نقاط إضافية للمنشورات الحديثة
          const daysOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld < 1) score += 5;
          else if (daysOld < 7) score += 3;
          else if (daysOld < 30) score += 1;
          
          return {
            ...post,
            semanticScore: score
          };
        }).sort((a, b) => b.semanticScore - a.semanticScore);
      }

      // تحويل المنشورات للصيغة المطلوبة
      const postsWithMedia = rankedPosts.slice(0, category === "posts" ? limitNum : 15).map(post => {
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
          relevanceScore: post.semanticScore || 0
        };
      });

      results.posts = postsWithMedia;

      if (category === "posts") {
        const totalPosts = await Post.countDocuments(postsQuery);
        results.totalResults = totalPosts;
        results.pagination.totalPages = Math.ceil(totalPosts / limitNum);
        results.pagination.hasMore = skip + postsWithMedia.length < totalPosts;
      }
    }

    // البحث في المركبات
    if (category === "all" || category === "vehicles") {
      const vehiclesSearchQuery = buildSearchQuery(searchQuery, [
        'vehicleName', 
        'vehicleType', 
        'driverName', 
        'licensePlate', 
        'plateNumber'
      ]);
      
      const vehiclesQuery = {
        ...vehiclesSearchQuery
      };

      const vehicles = await Vehicle.find(vehiclesQuery)
        .populate("user", "name avatar userType companyName")
        .limit(category === "vehicles" ? limitNum * 2 : 30)
        .lean();

      const vehiclesWithRelevance = vehicles.map(vehicle => {
        const text = `${vehicle.vehicleName || ''} ${vehicle.vehicleType || ''} ${vehicle.driverName || ''}`.toLowerCase();
        const queryLower = searchQuery.toLowerCase();
        let score = 0;
        
        if (text.includes(queryLower)) score += 10;
        const words = queryLower.split(/\s+/);
        words.forEach(word => {
          if (text.includes(word)) score += 3;
        });
        
        return {
          ...vehicle,
          type: "vehicle",
          vehicleName: vehicle.vehicleName || vehicle.vehicleType || 'مركبة',
          licensePlate: vehicle.licensePlate || vehicle.plateNumber || '',
          currentLocation: vehicle.currentLocation || vehicle.departureCity || '',
          imageUrl: vehicle.imageUrl || (vehicle.imageUrls && vehicle.imageUrls[0]) || '',
          relevanceScore: score
        };
      });

      vehiclesWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      results.vehicles = vehiclesWithRelevance.slice(0, category === "vehicles" ? limitNum : 15);

      if (category === "vehicles") {
        const totalVehicles = await Vehicle.countDocuments(vehiclesQuery);
        results.totalResults = totalVehicles;
        results.pagination.totalPages = Math.ceil(totalVehicles / limitNum);
        results.pagination.hasMore = skip + results.vehicles.length < totalVehicles;
      }
    }

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
