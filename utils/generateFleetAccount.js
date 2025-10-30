const crypto = require('crypto');
const Vehicle = require('../models/Vehicle');

/**
 * توليد رقم تسلسلي فريد للأسطول
 * الصيغة: FL-XXXXXX (مثال: FL-A3B7C9)
 */
const generateFleetId = async () => {
  let fleetId;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (exists && attempts < maxAttempts) {
    // توليد 6 أحرف/أرقام عشوائية
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    fleetId = `FL-${randomPart}`;
    
    // التحقق من عدم وجود نفس الرقم
    const existing = await Vehicle.findOne({ fleetAccountId: fleetId });
    exists = !!existing;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('فشل في توليد رقم أسطول فريد بعد عدة محاولات');
  }
  
  return fleetId;
};

/**
 * توليد كلمة سر عشوائية قوية
 * الصيغة: 8 أحرف (أحرف كبيرة وصغيرة وأرقام)
 * نتجنب الأحرف المتشابهة: I, l, 1, O, 0
 */
const generateFleetPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars.charAt(randomIndex);
  }
  
  return password;
};

/**
 * توليد حساب كامل للأسطول (رقم تسلسلي + كلمة سر)
 */
const generateFleetAccount = async () => {
  const fleetId = await generateFleetId();
  const password = generateFleetPassword();
  
  return {
    fleetId,
    password
  };
};

module.exports = { 
  generateFleetId, 
  generateFleetPassword,
  generateFleetAccount
};
