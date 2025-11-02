/**
 * تقليل ظهور المنشورات قليلة التفاعل بعد 6 ساعات
 * 
 * الخوارزمية:
 * 1. إذا كان المنشور أقل من 6 ساعات → يظهر بشكل طبيعي
 * 2. إذا كان المنشور أكثر من 6 ساعات:
 *    - نحسب معدل التفاعل (likes + comments + shares) / عمر المنشور بالساعات
 *    - إذا كان معدل التفاعل منخفض → نقلل احتمالية ظهوره
 * 
 * @param {Array} items - قائمة المنشورات
 * @returns {Array} - قائمة المنشورات بعد الفلترة
 */
function filterLowEngagementPosts(items) {
  console.log(`🎯 فلترة المنشورات قليلة التفاعل: عدد العناصر قبل الفلترة = ${items.length}`);
  
  const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 ساعات بالميلي ثانية
  const now = Date.now();
  
  const filteredItems = items.filter(item => {
    const createdAt = new Date(item.createdAt).getTime();
    const ageInMs = now - createdAt;
    const ageInHours = ageInMs / (60 * 60 * 1000);
    
    // إذا كان المنشور أقل من 6 ساعات → يظهر بشكل طبيعي
    if (ageInMs < SIX_HOURS) {
      return true;
    }
    
    // حساب معدل التفاعل
    const likes = item.likes?.length || item.reactions?.length || 0;
    const comments = item.comments?.length || 0;
    const shares = item.shares || 0;
    const totalEngagement = likes + comments + shares;
    
    // معدل التفاعل = إجمالي التفاعل / عمر المنشور بالساعات
    const engagementRate = totalEngagement / ageInHours;
    
    // الحد الأدنى لمعدل التفاعل (0.5 تفاعل/ساعة)
    // يعني: إذا كان المنشور عمره 10 ساعات، يجب أن يكون عليه 5 تفاعلات على الأقل
    const MIN_ENGAGEMENT_RATE = 0.5;
    
    if (engagementRate < MIN_ENGAGEMENT_RATE) {
      console.log(`⬇️ تقليل منشور قليل التفاعل: ID=${item._id}, عمر=${ageInHours.toFixed(1)}ساعة, تفاعل=${totalEngagement}, معدل=${engagementRate.toFixed(2)}`);
      
      // نعطي فرصة 20% للظهور (بدلاً من حذفه تماماً)
      return Math.random() < 0.2;
    }
    
    // المنشور لديه تفاعل جيد → يظهر
    return true;
  });
  
  console.log(`✅ عدد العناصر بعد الفلترة = ${filteredItems.length} (تم تقليل ${items.length - filteredItems.length} منشور)`);
  
  return filteredItems;
}

module.exports = { filterLowEngagementPosts };
