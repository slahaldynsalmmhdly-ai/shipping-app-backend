/**
 * خوارزمية تنويع المحتوى (Content Diversity Algorithm)
 * 
 * تضمن عدم ظهور منشورات متتالية من نفس المستخدم/الشركة
 * مثل خوارزمية فيسبوك
 * 
 * @param {Array} items - المنشورات/الإعلانات
 * @param {Number} minGap - الحد الأدنى للفجوة بين منشورات نفس المستخدم (افتراضي: 3)
 * @returns {Array} - المنشورات بعد إعادة الترتيب
 */
function diversifyContent(items, minGap = 3) {
  if (!items || items.length <= minGap) {
    return items; // لا حاجة للتنويع إذا كان العدد قليل
  }

  const result = [];
  const pending = [...items]; // نسخة من المنشورات
  const lastSeenPosition = new Map(); // آخر موضع لكل مستخدم

  let attempts = 0;
  const maxAttempts = items.length * 2; // لتجنب الحلقة اللانهائية

  while (pending.length > 0 && attempts < maxAttempts) {
    attempts++;
    let added = false;

    // نحاول إيجاد منشور يمكن إضافته
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const userId = item.user?._id?.toString() || item.user?.toString();

      if (!userId) {
        // إذا لم يكن هناك user، نضيفه مباشرة
        result.push(item);
        pending.splice(i, 1);
        added = true;
        break;
      }

      const lastPosition = lastSeenPosition.get(userId);
      const currentPosition = result.length;

      // نتحقق من أن الفجوة كافية
      if (lastPosition === undefined || (currentPosition - lastPosition) >= minGap) {
        result.push(item);
        lastSeenPosition.set(userId, currentPosition);
        pending.splice(i, 1);
        added = true;
        break;
      }
    }

    // إذا لم نتمكن من إضافة أي منشور، نضيف التالي مباشرة لتجنب الحلقة
    if (!added && pending.length > 0) {
      const item = pending.shift();
      const userId = item.user?._id?.toString() || item.user?.toString();
      result.push(item);
      if (userId) {
        lastSeenPosition.set(userId, result.length - 1);
      }
    }
  }

  // إضافة أي منشورات متبقية (في حالة نادرة)
  if (pending.length > 0) {
    result.push(...pending);
  }

  console.log(`✨ Content diversity applied: ${items.length} items → ${result.length} items with min gap of ${minGap}`);

  return result;
}

module.exports = { diversifyContent };
