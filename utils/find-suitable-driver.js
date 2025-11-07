/**
 * دالة لتحديد السائق المناسب بناءً على المدينة والشاحنة المتاحة
 */

const Vehicle = require('../models/Vehicle');

/**
 * تحديد السائق المناسب للعميل
 * 
 * @param {string} city - المدينة المطلوبة
 * @param {string} companyId - معرف الشركة
 * @returns {Object} - {driverId, vehicleInfo} أو null
 */
async function findSuitableDriver(city, companyId) {
  try {
    console.log(`🔍 البحث عن سائق مناسب في ${city} للشركة ${companyId}`);
    
    // البحث عن مركبة متاحة في المدينة المطلوبة
    const vehicle = await Vehicle.findOne({
      user: companyId,
      status: 'متاح',
      $or: [
        { departureCity: { $regex: new RegExp(city, 'i') } },
        { 'cities.city': { $regex: new RegExp(city, 'i') } }
      ]
    })
    .populate('driverUser', '_id name phone')
    .select('vehicleName vehicleType vehicleColor vehicleModel driverName driverUser departureCity cities discount imageUrls currency transportType');
    
    if (!vehicle) {
      console.log('❌ لا توجد مركبة متاحة في هذه المدينة');
      return null;
    }
    
    // التحقق من وجود سائق مرتبط بالمركبة
    if (!vehicle.driverUser || !vehicle.driverUser._id) {
      console.log('❌ المركبة ليس لها سائق مرتبط');
      return null;
    }
    
    // جلب معلومات السعر للمدينة المطلوبة
    let priceInfo = null;
    if (vehicle.transportType === 'domestic' && vehicle.cities) {
      const cityData = vehicle.cities.find(c => c.city.toLowerCase().includes(city.toLowerCase()));
      if (cityData) {
        priceInfo = {
          price: cityData.price,
          discount: vehicle.discount || 0,
          finalPrice: cityData.price - (cityData.price * (vehicle.discount || 0) / 100),
          currency: vehicle.currency || 'ريال'
        };
      }
    }
    
    console.log(`✅ تم العثور على سائق: ${vehicle.driverUser.name} (${vehicle.driverUser._id})`);
    
    return {
      driverId: vehicle.driverUser._id.toString(),
      driverName: vehicle.driverUser.name,
      driverPhone: vehicle.driverUser.phone,
      vehicleInfo: {
        name: vehicle.vehicleName,
        type: vehicle.vehicleType || 'غير محدد',
        color: vehicle.vehicleColor || 'غير محدد',
        model: vehicle.vehicleModel || 'غير محدد',
        location: vehicle.departureCity,
        priceInfo: priceInfo,
        imageUrls: vehicle.imageUrls || []
      }
    };
    
  } catch (error) {
    console.error('❌ خطأ في تحديد السائق المناسب:', error);
    return null;
  }
}

module.exports = {
  findSuitableDriver
};
