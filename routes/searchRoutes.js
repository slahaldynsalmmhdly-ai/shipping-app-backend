const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
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

// @desc    البحث الذكي المتكامل
// @route   GET /api/v1/search
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { query, category = "all", page = 1, limit = 20, country, city, mediaType, userType } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "يرجى إدخال نص للبحث" 
      });
    }

    const searchQuery = query.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // فلترة الموقع
    const filterCountry = country === '' ? null : country;
    const filterCity = city === '' ? null : city;
    
    let locationFilter = {};
    if (filterCountry && filterCountry !== 'عالمي') {
      if (filterCity) {
        locationFilter = {
          $or: [
            { country: filterCountry, city: filterCity },
            { country: filterCountry, $or: [{ city: null }, { city: { $exists: false } }] },
            { $or: [{ country: null }, { country: { $exists: false } }] }
          ]
        };
      } else {
        locationFilter = {
          $or: [
            { country: filterCountry },
            { $or: [{ country: null }, { country: { $exists: false } }] }
          ]
        };
      }
    }

    let results = {
      query: searchQuery,
      category,
      posts: [],
      videos: [],
      photos: [],
      individuals: [],
      jobs: [],
      totalResults: 0,
      pagination: {
        currentPage: parseInt(page),
        limit: limitNum,
      }
    };

    // البحث في المنشورات
    if (category === "all" || category === "posts") {
      const postsSearchQuery = buildSmartSearchQuery(searchQuery, ['text', 'repostText', 'category']);
      
      let postsQuery = {
        ...postsSearchQuery,
        ...locationFilter,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      };

      // فلترة حسب mediaType
      if (mediaType === 'video') {
        postsQuery.video = { $ne: null, $exists: true };
      } else if (mediaType === 'image') {
        postsQuery.images = { $exists: true, $ne: [] };
      }

      const posts = await Post.find(postsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "posts" ? limitNum : 15)
        .skip(category === "posts" ? skip : 0)
        .lean();

      const postsWithRelevance = posts.map(post => {
        const relevanceScore = calculateRelevanceScore(post, searchQuery, ['text', 'repostText', 'category']);
        return {
          ...post,
          type: "post",
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

    // البحث في الوظائف (jobs) - حسب التصنيف (category)
    if (category === "all" || category === "jobs") {
      const jobsSearchQuery = buildSmartSearchQuery(searchQuery, ['text', 'repostText', 'category']);
      
      const jobsQuery = {
        ...jobsSearchQuery,
        ...locationFilter,
        category: { $exists: true, $ne: null },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      };

      const jobs = await Post.find(jobsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "jobs" ? limitNum : 15)
        .skip(category === "jobs" ? skip : 0)
        .lean();

      const jobsWithRelevance = jobs.map(job => {
        const relevanceScore = calculateRelevanceScore(job, searchQuery, ['text', 'repostText', 'category']);
        return {
          ...job,
          type: "job",
          likesCount: job.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: job.comments?.length || 0,
          relevanceScore
        };
      });

      jobsWithRelevance.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.jobs = jobsWithRelevance;

      if (category === "jobs") {
        const totalJobs = await Post.countDocuments(jobsQuery);
        results.totalResults = totalJobs;
        results.pagination.totalPages = Math.ceil(totalJobs / limitNum);
        results.pagination.hasMore = skip + jobs.length < totalJobs;
      }
    }

    // البحث في الأفراد
    if (category === "all" || category === "individuals" || category === "users") {
      const individualsSearchQuery = buildSmartSearchQuery(searchQuery, ['name', 'description', 'city']);
      
      const individualsQuery = {
        ...individualsSearchQuery,
        ...locationFilter
      };

      if (userType) {
        individualsQuery.userType = userType;
      }

      const individuals = await User.find(individualsQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "individuals" || category === "users" ? limitNum : 15)
        .skip(category === "individuals" || category === "users" ? skip : 0)
        .lean();

      const individualsWithRelevance = individuals.map(individual => {
        const relevanceScore = calculateRelevanceScore(individual, searchQuery, ['name', 'description', 'city']);
        return {
          ...individual,
          type: "individual",
          relevanceScore
        };
      });

      individualsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      results.individuals = individualsWithRelevance;

      if (category === "individuals" || category === "users") {
        const totalIndividuals = await User.countDocuments(individualsQuery);
        results.totalResults = totalIndividuals;
        results.pagination.totalPages = Math.ceil(totalIndividuals / limitNum);
        results.pagination.hasMore = skip + individualsWithRelevance.length < totalIndividuals;
      }
    }

    // حساب إجمالي النتائج لفئة "الكل"
    if (category === "all") {
      results.totalResults = 
        results.posts.length +
        results.jobs.length +
        results.individuals.length;
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
