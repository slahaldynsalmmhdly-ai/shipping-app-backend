/**
 * استخراج الهاشتاقات من النص
 * @param {String} text - النص المراد استخراج الهاشتاقات منه
 * @returns {Array} - مصفوفة من الهاشتاقات (بدون رمز #)
 */
const extractHashtags = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // البحث عن جميع الهاشتاقات في النص
  // يدعم العربية والإنجليزية والأرقام والشرطة السفلية
  const hashtagRegex = /#([\u0600-\u06FFa-zA-Z0-9_]+)/g;
  const matches = text.match(hashtagRegex);

  if (!matches) {
    return [];
  }

  // إزالة رمز # وتحويل إلى أحرف صغيرة وإزالة المكرر
  const hashtags = matches
    .map(tag => tag.substring(1).toLowerCase().trim())
    .filter(tag => tag.length > 0);

  return [...new Set(hashtags)]; // إزالة المكرر
};

/**
 * استخراج معرفات المستخدمين المشار إليهم من النص
 * @param {String} text - النص المراد استخراج الإشارات منه
 * @returns {Array} - مصفوفة من معرفات المستخدمين
 * 
 * ملاحظة: هذه الدالة تستخرج معرفات المستخدمين من النص بصيغة @userId
 * في الواجهة الأمامية، يجب تحويل اسم المستخدم إلى معرف قبل إرساله
 */
const extractMentionIds = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // البحث عن جميع الإشارات في النص بصيغة @userId
  // يدعم معرفات MongoDB (24 حرف hex)
  const mentionRegex = /@([a-f0-9]{24})/g;
  const matches = text.match(mentionRegex);

  if (!matches) {
    return [];
  }

  // استخراج المعرفات وإزالة المكرر
  const mentionIds = matches
    .map(mention => mention.substring(1))
    .filter(id => id.length === 24);

  return [...new Set(mentionIds)]; // إزالة المكرر
};

/**
 * تنسيق النص لعرض الهاشتاقات والإشارات كروابط
 * @param {String} text - النص المراد تنسيقه
 * @param {Array} mentions - مصفوفة من المستخدمين المشار إليهم مع بياناتهم
 * @returns {String} - النص المنسق
 */
const formatTextWithLinks = (text, mentions = []) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let formattedText = text;

  // تحويل الهاشتاقات إلى روابط
  formattedText = formattedText.replace(
    /#([\u0600-\u06FFa-zA-Z0-9_]+)/g,
    '<a href="/hashtag/$1" class="hashtag">#$1</a>'
  );

  // تحويل الإشارات إلى روابط
  if (mentions && mentions.length > 0) {
    mentions.forEach(mention => {
      const mentionRegex = new RegExp(`@${mention._id}`, 'g');
      const displayName = mention.userType === 'company' && mention.companyName 
        ? mention.companyName 
        : mention.name;
      formattedText = formattedText.replace(
        mentionRegex,
        `<a href="/profile/${mention._id}" class="mention">@${displayName}</a>`
      );
    });
  }

  return formattedText;
};

/**
 * التحقق من صحة الهاشتاق
 * @param {String} hashtag - الهاشتاق المراد التحقق منه
 * @returns {Boolean} - true إذا كان صحيحاً
 */
const isValidHashtag = (hashtag) => {
  if (!hashtag || typeof hashtag !== 'string') {
    return false;
  }

  // يجب أن يحتوي على حروف أو أرقام فقط (عربي أو إنجليزي)
  const validHashtagRegex = /^[\u0600-\u06FFa-zA-Z0-9_]+$/;
  return validHashtagRegex.test(hashtag) && hashtag.length > 0 && hashtag.length <= 50;
};

module.exports = {
  extractHashtags,
  extractMentionIds,
  formatTextWithLinks,
  isValidHashtag
};
