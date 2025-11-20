const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Review = require("../models/Review");
const { protect } = require("../middleware/authMiddleware");

// دالة لإنشاء استعلام بحث ذكي يجمع الكلمات المدخلة
function buildSmartSearchQuery(searchText, fields) {
  const query = searchText.trim();
  
  if (!query) {
    return {};
  }

  const words = query.split(/\s+/).filter(word => word.length > 0);
  const orConditions = [];
  
  fields.forEach(field => {
    orConditions.push({
      [field]: { $regex: query, $options: "i" }
    });
    
    words.forEach(word => {
      if (word.length >= 2) {
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
    
    if (value.includes(query)) {
      score += 10;
    }
    
    words.forEach(word => {
      if (value.includes(word)) {
        score += 3;
      }
    });
    
    if (value.startsWith(query)) {
      score += 5;
    }
  });
  
  return score;
}

// @desc    البحث الذكي المتكامل
// @route   GET /api/v1/search
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { query, category = "all", page = 1, limit = 20, country, city } = req.query;

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
      totalResults: 0,
      pagination: {
        currentPage: parseInt(page),
        limit: limitNum,
      }
    };

    // البحث في المنشورات (posts)
    if (category === "all" || category === "posts") {
      const postsSearchQuery = buildSmartSearchQuery(searchQuery, ['text', 'repostText']);
      
      const postsQuery = {
        ...postsSearchQuery,
        ...locationFilter,
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      };

      const posts = await Post.find(postsQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "posts" ? limitNum : 15)
        .skip(category === "posts" ? skip : 0)
        .lean();

      const postsWithRelevance = posts.map(post => {
        const relevanceScore = calculateRelevanceScore(post, searchQuery, ['text', 'repostText']);
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

    // البحث في الفيديوهات
    if (category === "all" || category === "videos") {
      const videosSearchQuery = buildSmartSearchQuery(searchQuery, ['text', 'repostText']);
      
      const videosQuery = {
        ...videosSearchQuery,
        ...locationFilter,
        video: { $ne: null, $exists: true },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      };

      const videos = await Post.find(videosQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "videos" ? limitNum : 15)
        .skip(category === "videos" ? skip : 0)
        .lean();

      const videosWithRelevance = videos.map(video => {
        const relevanceScore = calculateRelevanceScore(video, searchQuery, ['text', 'repostText']);
        return {
          ...video,
          type: "video",
          likesCount: video.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: video.comments?.length || 0,
          relevanceScore
        };
      });

      videosWithRelevance.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.videos = videosWithRelevance;

      if (category === "videos") {
        const totalVideos = await Post.countDocuments(videosQuery);
        results.totalResults = totalVideos;
        results.pagination.totalPages = Math.ceil(totalVideos / limitNum);
        results.pagination.hasMore = skip + videos.length < totalVideos;
      }
    }

    // البحث في الصور
    if (category === "all" || category === "photos") {
      const photosSearchQuery = buildSmartSearchQuery(searchQuery, ['text', 'repostText']);
      
      const photosQuery = {
        ...photosSearchQuery,
        ...locationFilter,
        images: { $exists: true, $ne: [] },
        $or: [{ isPublished: true }, { isPublished: { $exists: false } }]
      };

      const photos = await Post.find(photosQuery)
        .populate("user", "name avatar userType companyName")
        .sort({ createdAt: -1 })
        .limit(category === "photos" ? limitNum : 15)
        .skip(category === "photos" ? skip : 0)
        .lean();

      const photosWithRelevance = photos.map(photo => {
        const relevanceScore = calculateRelevanceScore(photo, searchQuery, ['text', 'repostText']);
        return {
          ...photo,
          type: "photo",
          likesCount: photo.reactions?.filter(r => r.type === "like").length || 0,
          commentsCount: photo.comments?.length || 0,
          relevanceScore
        };
      });

      photosWithRelevance.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      results.photos = photosWithRelevance;

      if (category === "photos") {
        const totalPhotos = await Post.countDocuments(photosQuery);
        results.totalResults = totalPhotos;
        results.pagination.totalPages = Math.ceil(totalPhotos / limitNum);
        results.pagination.hasMore = skip + photos.length < totalPhotos;
      }
    }

    // البحث في الأفراد
    if (category === "all" || category === "individuals") {
      const individualsSearchQuery = buildSmartSearchQuery(searchQuery, [
        'name', 'description', 'city'
      ]);
      
      const individualsQuery = {
        userType: "individual",
        ...individualsSearchQuery,
        ...locationFilter
      };

      const individuals = await User.find(individualsQuery)
        .select("-password -googleId -firebaseUid -notifications")
        .limit(category === "individuals" ? limitNum : 15)
        .skip(category === "individuals" ? skip : 0)
        .lean();

      const individualsWithRelevance = individuals.map(individual => {
        const relevanceScore = calculateRelevanceScore(
          individual, 
          searchQuery, 
          ['name', 'description', 'city']
        );
        return {
          ...individual,
          type: "individual",
          relevanceScore
        };
      });

      individualsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      results.individuals = individualsWithRelevance;

      if (category === "individuals") {
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
        results.videos.length +
        results.photos.length +
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
