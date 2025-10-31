const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driverName: {
    type: String,
    required: true,
  },
  vehicleName: {
    type: String,
    required: true,
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  vehicleType: {
    type: String,
    default: "",
  },
  currentLocation: {
    type: String,
    default: "",
  },
  vehicleColor: {
    type: String,
    default: "",
  },
  vehicleModel: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["متاح", "في العمل"],
    default: "متاح",
  },
  previousStatus: {
    type: String,
    enum: ["متاح", "في العمل", null],
    default: null,
  },
  // حقول تتبع النشر التلقائي
  lastAutoPostedAt: {
    type: Date,
    default: null,
  },
  autoPostCount: {
    type: Number,
    default: 0,
  },
  // حقول الحساب الفرعي للأسطول (Fleet Sub-Account)
  fleetAccountId: {
    type: String,
    unique: true,
    sparse: true, // يسمح بـ null للأساطيل القديمة
  },
  fleetPassword: {
    type: String,
    select: false, // لا تُرجع مع الاستعلامات العادية
  },
  accountCreatedAt: {
    type: Date,
  },
  isAccountActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, { timestamps: true });

// Hook لحفظ الحالة السابقة قبل الحفظ
VehicleSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    // حفظ الحالة السابقة فقط إذا تغيرت الحالة
    this._previousStatus = this.previousStatus;
  }
  next();
});

// Hook للنشر التلقائي عند تغيير حالة المركبة من "في العمل" إلى "متاح"
VehicleSchema.post('save', async function(doc) {
  try {
    console.log(`🔍 [Vehicle Hook - save] Vehicle ${doc._id} status: ${doc.status}, previousStatus: ${doc.previousStatus}`);
    
    // النشر فقط عند التغيير من "في العمل" إلى "متاح"
    const changedToAvailable = doc.status === "متاح" && doc.previousStatus === "في العمل";
    
    if (changedToAvailable) {
      console.log(`✅ [Vehicle Hook - save] Vehicle ${doc._id} changed from "في العمل" to "متاح", triggering auto post...`);
      
      // تحديث previousStatus للحالة الحالية
      doc.previousStatus = doc.status;
      await doc.save({ validateBeforeSave: false });
      
      // استدعاء دالة النشر التلقائي
      const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
      
      setImmediate(async () => {
        try {
          await autoPostSingleEmptyTruck(doc._id);
        } catch (error) {
          console.error('❌ Error in post-save auto posting:', error);
        }
      });
    } else {
      console.log(`ℹ️ [Vehicle Hook - save] No status change from "في العمل" to "متاح", skipping auto post`);
      
      // تحديث previousStatus إذا تغيرت الحالة
      if (doc.isModified('status')) {
        doc.previousStatus = doc.status;
        await doc.save({ validateBeforeSave: false });
      }
    }
  } catch (error) {
    console.error('❌ Error in Vehicle post-save hook:', error);
  }
});

// Hook لحفظ الحالة السابقة قبل التحديث
VehicleSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    if (update.$set && update.$set.status) {
      // جلب المستند الحالي لحفظ الحالة السابقة
      const docToUpdate = await this.model.findOne(this.getQuery());
      if (docToUpdate && docToUpdate.status !== update.$set.status) {
        // حفظ الحالة السابقة في التحديث
        update.$set.previousStatus = docToUpdate.status;
      }
    }
  } catch (error) {
    console.error('❌ Error in pre findOneAndUpdate hook:', error);
  }
  next();
});

// Hook للنشر التلقائي عند تحديث حالة المركبة من "في العمل" إلى "متاح"
VehicleSchema.post('findOneAndUpdate', async function(doc) {
  try {
    console.log(`🔍 [Vehicle Hook - findOneAndUpdate] Document:`, doc ? `ID: ${doc._id}, status: ${doc.status}, previousStatus: ${doc.previousStatus}` : 'null');
    
    // النشر فقط عند التغيير من "في العمل" إلى "متاح"
    const changedToAvailable = doc && doc.status === "متاح" && doc.previousStatus === "في العمل";
    
    if (changedToAvailable) {
      console.log(`✅ [Vehicle Hook - findOneAndUpdate] Vehicle ${doc._id} changed from "في العمل" to "متاح", triggering auto post...`);
      
      const { autoPostSingleEmptyTruck } = require('../utils/autoPostEmptyTruck');
      
      setImmediate(async () => {
        try {
          await autoPostSingleEmptyTruck(doc._id);
        } catch (error) {
          console.error('❌ Error in post-update auto posting:', error);
        }
      });
    } else {
      console.log(`ℹ️ [Vehicle Hook - findOneAndUpdate] No status change from "في العمل" to "متاح", skipping auto post`);
    }
  } catch (error) {
    console.error('❌ Error in Vehicle post-findOneAndUpdate hook:', error);
  }
});

module.exports = mongoose.model("Vehicle", VehicleSchema);
