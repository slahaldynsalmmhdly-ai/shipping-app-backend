/**
 * دالة الإرسال التلقائي للسائق مع رسائل تحفيزية
 * 
 * يتم استدعاؤها عندما يكمل المستخدم جميع البيانات المطلوبة
 */

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

/**
 * الحصول على تحية حسب الوقت
 */
function getGreetingByTime() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'صباح الخير';
  } else if (hour >= 12 && hour < 18) {
    return 'مساء النور';
  } else if (hour >= 18 && hour < 22) {
    return 'مساء الخير';
  } else {
    return 'السلام عليكم';
  }
}

/**
 * رسائل تحفيزية عشوائية
 */
const motivationalPhrases = [
  'قواك الله',
  'بالتوفيق',
  'شد حيلك',
  'الله يعينك',
  'موفق إن شاء الله',
  'بالنجاح',
  'الله يوفقك'
];

function getRandomMotivation() {
  return motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
}

/**
 * إرسال رسالة تلقائية للسائق
 * 
 * @param {Object} bookingData - بيانات الحجز من المستخدم
 * @param {string} bookingData.customerName - اسم العميل
 * @param {string} bookingData.customerPhone - رقم هاتف العميل
 * @param {string} bookingData.location - الموقع أو رابط الموقع
 * @param {string} bookingData.address - العنوان التفصيلي
 * @param {string} bookingData.city - المدينة
 * @param {string} bookingData.pickupTime - موعد الحضور
 * @param {string} bookingData.cargoImage - صورة الحمولة (اختياري)
 * @param {string} bookingData.notes - ملاحظات إضافية (اختياري)
 * @param {string} driverId - معرف السائق
 * @param {string} companyId - معرف الشركة
 * @param {Object} io - Socket.IO instance
 */
async function sendBookingToDriver(bookingData, driverId, companyId, io) {
  try {
    console.log('📤 بدء إرسال طلب الحجز للسائق...');
    
    // جلب معلومات السائق
    const driver = await User.findById(driverId).select('name');
    if (!driver) {
      throw new Error('السائق غير موجود');
    }
    
    // البحث عن محادثة موجودة أو إنشاء واحدة جديدة
    let conversation = await Conversation.findOne({
      participants: { $all: [companyId, driverId] }
    });
    
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [companyId, driverId],
        lastMessageTime: new Date()
      });
    }
    
    // بناء الرسالة
    const greeting = getGreetingByTime();
    const motivation = getRandomMotivation();
    const driverName = driver.name || 'السائق';
    
    let messageContent = `${greeting} ${driverName}، ${motivation} 💪\n\n`;
    messageContent += `📦 **طلب حجز جديد من العميل**\n\n`;
    messageContent += `👤 **اسم العميل:** ${bookingData.customerName}\n`;
    messageContent += `📞 **رقم الهاتف:** ${bookingData.customerPhone}\n`;
    
    if (bookingData.city) {
      messageContent += `📍 **المدينة:** ${bookingData.city}\n`;
    }
    
    if (bookingData.address) {
      messageContent += `🏠 **العنوان:** ${bookingData.address}\n`;
    }
    
    if (bookingData.location) {
      messageContent += `🗺️ **رابط الموقع:** ${bookingData.location}\n`;
    }
    
    if (bookingData.pickupTime) {
      messageContent += `⏰ **موعد الحضور:** ${bookingData.pickupTime}\n`;
    }
    
    if (bookingData.notes) {
      messageContent += `📝 **ملاحظات:** ${bookingData.notes}\n`;
    }
    
    messageContent += `\n---\n`;
    messageContent += `🤖 **معك موظف AI**`;
    
    // إنشاء الرسالة
    const message = await Message.create({
      conversation: conversation._id,
      sender: companyId,
      messageType: bookingData.cargoImage ? 'image' : 'text',
      content: messageContent,
      imageUrls: bookingData.cargoImage ? [bookingData.cargoImage] : [],
      readBy: [companyId]
    });
    
    // تحديث المحادثة
    conversation.lastMessage = message._id;
    conversation.lastMessageTime = message.createdAt;
    const currentCount = conversation.unreadCount.get(driverId) || 0;
    conversation.unreadCount.set(driverId, currentCount + 1);
    await conversation.save();
    
    // إرسال عبر Socket.IO
    if (io) {
      await message.populate('sender', 'name avatar');
      const formattedMessage = {
        _id: message._id,
        sender: {
          _id: message.sender._id,
          name: message.sender.name,
          avatar: message.sender.avatar,
        },
        messageType: message.messageType,
        content: message.content,
        imageUrls: message.imageUrls || [],
        isRead: false,
        createdAt: message.createdAt,
      };
      
      io.to(conversation._id.toString()).emit('message:new', formattedMessage);
    }
    
    console.log('✅ تم إرسال طلب الحجز للسائق بنجاح');
    
    return {
      success: true,
      message: 'تم إرسال طلبك للسائق بنجاح! سيتواصل معك قريباً 😊',
      conversationId: conversation._id
    };
    
  } catch (error) {
    console.error('❌ خطأ في إرسال طلب الحجز:', error);
    return {
      success: false,
      message: 'عذراً، حصل خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.'
    };
  }
}

module.exports = {
  sendBookingToDriver,
  getGreetingByTime,
  getRandomMotivation
};
