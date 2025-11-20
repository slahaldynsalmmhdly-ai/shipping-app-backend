const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Vehicle = require("../models/Vehicle");
const { protect } = require("../middleware/authMiddleware");
const axios = require("axios");

// دالة لتحليل الاستعلام باستخدام OpenAI
async function analyzeQueryWithAI(query) {
  try {
    const prompt = `أنت محلل استعلامات بحث ذكي. حلل الاستعلام التالي واستخرج المعلومات بصيغة JSON فقط بدون أي نص إضافي:

الاستعلام: "${query}"

استخرج:
- searchText: النص الأساسي للبحث (بعد إزالة المدن والدول والكلمات الزمنية)
- city: المدينة إن وجدت (من قائمة: الرياض، جدة، مكة، المدينة، الدمام، الخبر، القاهرة، الإسكندرية، دبي، أبوظبي، الكويت، عمان، الدوحة، المنامة، مسقط)
- country: الدولة إن وجدت (من قائمة: السعودية، مصر، الإمارات، الكويت، الأردن، قطر، البحرين، عمان)
- timeFilterDays: عدد الأيام إذا كانت هناك كلمات زمنية (حديثة=7، جديدة=7، اليوم=1، أمس=2، الأسبوع=7، الشهر=30، قريباً=7، مؤخراً=7، الآن=1)
- isJobSearch: true إذا كان البحث عن وظائف (يحتوي على: وظيفة، وظائف، عمل، توظيف، مطلوب، طلب عمل، كهربائي، سائق، مهندس، محاسب)

أمثلة:
"وظائف حديثة جدة" → {"searchText":"وظائف","city":"جدة","country":null,"timeFilterDays":7,"isJobSearch":true}
"كهربائي الرياض" → {"searchText":"كهربائي","city":"الرياض","country":null,"timeFilterDays":null,"isJobSearch":true}
"شركات شحن دبي" → {"searchText":"شركات شحن","city":"دبي","country":null,"timeFilterDays":null,"isJobSearch":false}

أرجع JSON فقط:`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const aiResponse = response.data.choices[0].message.content.trim();
    
    // استخراج JSON من الرد
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        searchText: result.searchText || query,
        cleanedText: result.searchText || query,
        city: result.city || null,
        country: result.country || null,
        timeFilter: result.timeFilterDays || null,
        isJobSearch: result.isJobSearch || false
      };
    }
    
    throw new Error('Invalid AI response');
    
  } catch (error) {
    console.error("AI Analysis Error:", error.message);
    // في حالة الفشل، نرجع الاستعلام كما هو
    return {
      searchText: query,
      cleanedText: query,
      city: null,
      country: null,
      timeFilter: null,
      isJobSearch: false
    };
  }
}

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

// دالة لحساب درجة الملاءمة
function calculateRelevanceScore(item, searchQuery, fields) {
  const query = searchQuery.toLowerCase();
  const words = query.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  
  fields.forEach(field => {
    const value = String(item[field] || '').toLowerCase();
    if (value === query) score += 20;
    if (value.includes(query)) score += 10;
    if (value.startsWith(query)) score += 8;
    words.forEach(word => {
      if (value.includes(word)) score += 3;
      if (value.startsWith(word)) score += 2;
    });
  });
  
  return score;
}

// @desc    البحث الذكي باستخدام OpenAI
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

    // تحليل الاستعلام باستخدام OpenAI
    const aiAnalysis = await analyzeQueryWithAI(searchQuery);
    
    console.log("AI Analysis:", aiAnalysis);

    const cleanedQuery = aiAnalysis.cleanedText || searchQuery;
    const detectedCity = aiAnalysis.city;
    const detectedCountry = aiAnalysis.country;
    const timeFilterDays = aiAnalysis.timeFilter;
    const isJobSearch = aiAnalysis.isJobSearch;

    // بناء فلتر الموقع (صارم)
    let locationFilter = {};
    if (detectedCity) {
      locationFilter.city = { $regex: new RegExp(`^${detectedCity}$`, 'i') };
    }
    if (detectedCountry && !detectedCity) {
      locationFilter.country = { $regex: new RegExp(`^${detectedCountry}$`, 'i') };
    }

    // بناء فلتر الوقت (صارم)
    let timeFilter = {};
    if (timeFilterDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeFilterDays);
      timeFilter.createdAt = { $gte: cutoffDate };
    }

    let results = {
      query: searchQuery,
      aiAnalysis: aiAnalysis,
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
      const companiesSearchQuery = buildSearchQuery(cleanedQuery, [
        'name', 
        'companyName', 
        'description', 
        'workClassification'
      ]);
      
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
        const relevanceScore = calculateRelevanceScore(company, cleanedQuery, [
          'name', 
          'companyName', 
          'description'
        ]);
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
      const postsSearchQuery = buildSearchQuery(cleanedQuery, [
        'text', 
        'repostText'
      ]);
      
      let postsQuery = {
        ...postsSearchQuery,
        ...locationFilter,
        ...timeFilter,
        $and: [
          { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] }
        ]
      };

      // فلترة حسب تصنيف المنشور
      if (postCategory && postCategory !== '') {
        postsQuery.category = postCategory;
      }

      // إذا كان البحث عن وظائف (من AI)
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
        let relevanceScore = calculateRelevanceScore(post, cleanedQuery, [
          'text', 
          'repostText'
        ]);
        
        if (post.user) {
          const userName = String(post.user.name || '').toLowerCase();
          const companyName = String(post.user.companyName || '').toLowerCase();
          const query = cleanedQuery.toLowerCase();
          
          if (userName.includes(query)) relevanceScore += 5;
          if (companyName.includes(query)) relevanceScore += 5;
        }
        
        const postAge = Date.now() - new Date(post.createdAt).getTime();
        const daysOld = postAge / (1000 * 60 * 60 * 24);
        
        if (daysOld < 1) relevanceScore += 10;
        else if (daysOld < 7) relevanceScore += 5;
        else if (daysOld < 30) relevanceScore += 2;
        
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

    // البحث في المركبات
    if (category === "all" || category === "vehicles") {
      const vehiclesSearchQuery = buildSearchQuery(cleanedQuery, [
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
        let relevanceScore = calculateRelevanceScore(vehicle, cleanedQuery, [
          'vehicleName', 
          'vehicleType', 
          'driverName', 
          'licensePlate'
        ]);
        
        if (vehicle.user) {
          const userName = String(vehicle.user.name || '').toLowerCase();
          const companyName = String(vehicle.user.companyName || '').toLowerCase();
          const query = cleanedQuery.toLowerCase();
          
          if (userName.includes(query)) relevanceScore += 5;
          if (companyName.includes(query)) relevanceScore += 5;
        }
        
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
