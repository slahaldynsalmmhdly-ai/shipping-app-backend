/**
 * خوارزمية تنويع المحتوى المؤقتة - ملف بديل للتوافق
 * هذا الملف موجود فقط للتوافق مع الملفات القديمة
 */

/**
 * تنويع المحتوى
 */
function diversifyContent(items, options = {}) {
  if (!items || items.length === 0) return [];
  
  const { maxPerUser = 3 } = options;
  const seenUsers = new Map();
  const result = [];
  
  for (const item of items) {
    const userId = item.user?._id?.toString() || item.user?.toString();
    
    if (!userId) {
      result.push(item);
      continue;
    }
    
    const count = seenUsers.get(userId) || 0;
    
    if (count < maxPerUser) {
      result.push(item);
      seenUsers.set(userId, count + 1);
    }
  }
  
  return result;
}

module.exports = {
  diversifyContent
};
