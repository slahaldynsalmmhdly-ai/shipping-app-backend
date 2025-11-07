const mongoose = require('mongoose');

const TruckBookingSchema = mongoose.Schema(
  {
    // معلومات العميل
    customerName: {
      type: String,
      required: [true, 'يرجى إدخال اسم العميل'],
      trim: true
    },
    customerPhone: {
      type: String,
      required: [true, 'يرجى إدخال رقم الهاتف'],
      trim: true
    },
    customerAddress: {
      type: String,
      required: [true, 'يرجى إدخال العنوان'],
      trim: true
    },
    pickupLocation: {
      street: String,
      area: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    
    // معلومات الحمولة
    cargoDescription: {
      type: String,
      trim: true
    },
    cargoImages: [{
      type: String // URLs للصور
    }],
    
    // معلومات الشاحنة المحجوزة
    emptyTruckAd: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmptyTruckAd',
      required: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // معلومات الرحلة
    fromCity: {
      type: String,
      required: true
    },
    toCity: {
      type: String,
      required: true
    },
    distance: {
      type: Number, // بالكيلومتر
      required: true
    },
    estimatedDuration: {
      type: Number // بالساعات
    },
    
    // التسعير
    agreedPrice: {
      type: Number,
      required: [true, 'يرجى إدخال السعر المتفق عليه']
    },
    currency: {
      type: String,
      default: 'SAR'
    },
    
    // التوقيت
    requestedPickupDate: {
      type: Date,
      required: [true, 'يرجى تحديد موعد الاستلام']
    },
    
    // حالة الطلب
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    
    // ملاحظات
    customerNotes: {
      type: String,
      trim: true
    },
    driverNotes: {
      type: String,
      trim: true
    },
    
    // معلومات إضافية
    createdBy: {
      type: String,
      enum: ['customer', 'ai_chatbot', 'admin'],
      default: 'ai_chatbot'
    },
    conversationId: {
      type: String // معرف المحادثة مع البوت
    },
    
    // تتبع الحالة
    statusHistory: [{
      status: String,
      changedAt: {
        type: Date,
        default: Date.now
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }]
  },
  {
    timestamps: true
  }
);

// إضافة فهارس لتحسين الأداء
TruckBookingSchema.index({ driver: 1, status: 1, createdAt: -1 });
TruckBookingSchema.index({ emptyTruckAd: 1 });
TruckBookingSchema.index({ status: 1, createdAt: -1 });
TruckBookingSchema.index({ customerPhone: 1 });

module.exports = mongoose.model('TruckBooking', TruckBookingSchema);
