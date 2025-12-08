const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: false, // النص اختياري - يمكن إرسال صور أو فيديوهات فقط
  },
  media: [
    {
      url: String,
      type: { type: String, enum: ['image', 'video'] }, // 'image' or 'video'
      thumbnail: String, // Thumbnail URL for videos
      width: Number, // Video/image width
      height: Number, // Video/image height
      duration: Number, // Video duration in seconds
    },
  ],
  reactions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      type: {
        type: String,
        enum: ['like'], // Only like reaction type
      },
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      likes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      dislikes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      replies: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          text: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
          likes: [
            {
              user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
              },
            },
          ],
          dislikes: [
            {
              user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
              },
            },
          ],
        },
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Repost fields
  isRepost: {
    type: Boolean,
    default: false,
  },
  originalPost: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'originalPostType',
  },
  originalPostType: {
    type: String,
    enum: ['Post', 'ShipmentAd', 'EmptyTruckAd'],
  },
  repostText: {
    type: String,
  },

  // Scheduling fields
  scheduledTime: {
    type: Date,
    default: null, // null = publish immediately, Date = scheduled publish
  },
  isPublished: {
    type: Boolean,
    default: true, // true = published, false = scheduled (not published yet)
  },
  // Hidden from home feed for specific users (like Facebook behavior)
  hiddenFromHomeFeedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Smart Feed Algorithm fields
  impressions: {
    type: Number,
    default: 0,
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  videoCompletions: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  tags: [String],
  category: {
    type: String,
    enum: {
      values: [
        // تصنيفات الوظائف (من JobsView.tsx) - Arabic
        'سائق خاص', 'حارس أمن', 'طباخ', 'محاسب', 'مهندس مدني',
        'طبيب/ممرض', 'نجار', 'كاتب محتوى', 'كهربائي', 'ميكانيكي',
        'بائع / كاشير', 'مبرمج', 'مصمم جرافيك', 'مترجم', 'مدرس خصوصي',
        'مدير مشاريع', 'خدمة عملاء', 'مقدم طعام', 'توصيل', 'حلاق / خياط', 'مزارع',
        
        // تصنيفات الحراج (من HarajView.tsx) - Arabic
        'سيارات', 'عقارات', 'أجهزة منزلية', 'أثاث ومفروشات', 'جوالات',
        'لابتوبات وكمبيوتر', 'كاميرات وتصوير', 'ألعاب فيديو', 'ملابس وموضة',
        'ساعات ومجوهرات', 'حيوانات أليفة', 'طيور', 'معدات ثقيلة', 'قطع غيار',
        'تحف ومقتنيات', 'كتب ومجلات', 'أدوات رياضية', 'مستلزمات أطفال',
        'خيم وتخييم', 'أرقام مميزة', 'نقل عفش',

        // Job Categories - English
        'Private Driver', 'Security Guard', 'Chef', 'Accountant', 'Civil Engineer',
        'Doctor/Nurse', 'Carpenter', 'Content Writer', 'Electrician', 'Mechanic',
        'Sales / Cashier', 'Programmer', 'Graphic Designer', 'Translator', 'Tutor',
        'Project Manager', 'Customer Service', 'Food Server', 'Delivery', 'Barber / Tailor', 'Farmer',

        // Haraj Categories - English
        'Cars', 'Real Estate', 'Home Appliances', 'Furniture', 'Mobile Phones',
        'Laptops & Computers', 'Cameras & Photography', 'Video Games', 'Clothing & Fashion',
        'Watches & Jewelry', 'Pets', 'Birds', 'Heavy Equipment', 'Spare Parts',
        'Collectibles', 'Books & Magazines', 'Sports Equipment', 'Baby Items',
        'Camping & Tents', 'Special Numbers', 'Moving Services'
      ],
      message: 'Category must be a valid value'
    },
    default: null,
    required: false,
  },
  postType: {
    type: String,
    enum: {
      values: [
        // Arabic
        'ابحث عن موظفين', 'ابحث عن وظيفة',
        // English
        'Looking for employees', 'Looking for a job'
      ],
      message: 'PostType must be a valid value'
    },
    default: null,
    required: false,
  },
  topics: [String],
  // Hashtags and Mentions
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  distributionStage: {
    type: String,
    enum: ['testing', 'expanding', 'viral', 'saturated'],
    default: 'testing',
  },
  // Scope: local (same country) or global (all countries)
  scope: {
    type: String,
    enum: ['local', 'global'],
    default: 'global',
  },
  // Country: الدولة التي ينتمي إليها المنشور
  country: {
    type: String,
    default: null,
    trim: true
  },
  // City: المدينة التي ينتمي إليها المنشور
  city: {
    type: String,
    default: null,
    trim: true
  },
  // Embedding: للبحث الدلالي الذكي
  embedding: {
    type: [Number],
    default: null,
    select: false // لا يظهر في الاستعلامات العادية
  },
  // Publishing scope: category page only, or both home and category
  publishScope: {
    type: String,
    enum: ['category_only', 'home_and_category'],
    default: 'home_and_category',
  },
  // Featured/Pinned post (appears first)
  isFeatured: {
    type: Boolean,
    default: false,
  },
  featuredUntil: {
    type: Date,
    default: null, // null = featured indefinitely, Date = featured until this date
  },
  // Contact information
  contactInfo: {
    phone: {
      enabled: { type: Boolean, default: false },
      number: { type: String, default: '' },
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      number: { type: String, default: '' },
    },
    email: {
      enabled: { type: Boolean, default: false },
      address: { type: String, default: '' },
    },
  },
  // Contact fields for frontend compatibility
  contactPhone: {
    type: String,
    default: '',
  },
  contactEmail: {
    type: String,
    default: '',
  },
  contactMethods: [{
    type: String,
    enum: [
      // Arabic
      'واتساب', 'اتصال', 'بريد إلكتروني', 'الكل',
      // English
      'Whatsapp', 'Call', 'Email', 'All'
    ],
  }],
  contactDisabled: {
    type: Boolean,
    default: false, // true if contact is disabled by owner
  },
  
  // Video/Shorts specific fields
  isShort: {
    type: Boolean,
    default: false, // true if this is a short video post
  },
  title: {
    type: String,
    default: '', // Video title
  },
  privacy: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public',
  },
  allowComments: {
    type: Boolean,
    default: true,
  },
  allowDownload: {
    type: Boolean,
    default: true,
  },
  allowDuet: {
    type: Boolean,
    default: true, // Allow content reuse
  },
  location: {
    type: String,
    default: '',
  },
  isHighlighted: {
    type: Boolean,
    default: false, // Promoted/highlighted video
  },
});

// إضافة فهارس لتحسين الأداء
PostSchema.index({ user: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, createdAt: -1 });
PostSchema.index({ isFeatured: -1, createdAt: -1 }); // For featured posts
PostSchema.index({ category: 1, publishScope: 1, createdAt: -1 }); // For category filtering
PostSchema.index({ hashtags: 1 });
PostSchema.index({ hiddenFromHomeFeedFor: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'reactions.user': 1 });
PostSchema.index({ viewedBy: 1 });
PostSchema.index({ isShort: 1, createdAt: -1 }); // For shorts filtering

module.exports = mongoose.model('Post', PostSchema);
