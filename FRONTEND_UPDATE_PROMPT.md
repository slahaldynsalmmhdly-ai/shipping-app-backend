# 🎨 مطالبة تحديث الواجهة الأمامية - ChatScreen.tsx

## 📋 المطلوب

قم بتحديث `ChatScreen.tsx` لدعم عرض الصور المرسلة من البوت الذكي وتحسين عرض الرسائل.

---

## 🔧 التعديلات المطلوبة

### 1. إضافة معالج عرض الصور في الرسائل

في دالة `renderContent()` أو في مكون عرض الرسالة، أضف:

```typescript
// في مكان عرض الرسالة من البوت
const renderBotMessage = (message: any) => {
  return (
    <div className="message bot-message">
      <div className="message-bubble">
        <p>{message.text}</p>
        
        {/* عرض الصور إذا كانت موجودة */}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="bot-images-container">
            {message.imageUrls.map((url: string, index: number) => (
              <div key={index} className="bot-image-wrapper">
                <img 
                  src={url} 
                  alt={`صورة المركبة ${index + 1}`}
                  className="bot-image"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="message-time">
        {new Date(message.createdAt).toLocaleTimeString('ar-SA', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>
    </div>
  );
};
```

### 2. إضافة أنماط CSS للصور

في `ChatScreen.css`، أضف:

```css
/* حاوية الصور من البوت */
.bot-images-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-top: 12px;
  max-width: 100%;
}

/* غلاف الصورة */
.bot-image-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* نسبة 4:3 */
  overflow: hidden;
  border-radius: 8px;
  background: var(--skeleton-bg, #f0f0f0);
}

/* الصورة نفسها */
.bot-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.bot-image:hover {
  transform: scale(1.05);
}

/* إذا كانت هناك صورة واحدة فقط */
.bot-images-container:has(.bot-image-wrapper:only-child) {
  grid-template-columns: 1fr;
  max-width: 300px;
}

/* إذا كانت هناك صورتان */
.bot-images-container:has(.bot-image-wrapper:nth-child(2):last-child) {
  grid-template-columns: repeat(2, 1fr);
}

/* تحسين عرض الرسالة مع الصور */
.bot-message .message-bubble:has(.bot-images-container) {
  max-width: 400px;
  padding: 12px;
}

/* عرض الأسعار بشكل جميل */
.price-highlight {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: bold;
  margin: 4px 0;
  font-size: 16px;
}

.discount-badge {
  display: inline-block;
  background: #f56565;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-left: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* تحسين عرض الإيموجي */
.bot-message .message-bubble {
  font-size: 15px;
  line-height: 1.6;
}

/* عرض الرسائل الطويلة */
.bot-message .message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
```

### 3. إضافة modal لعرض الصورة بحجم كامل (اختياري)

```typescript
const [selectedImage, setSelectedImage] = useState<string | null>(null);

// في JSX
{selectedImage && (
  <div 
    className="image-modal-overlay" 
    onClick={() => setSelectedImage(null)}
  >
    <div className="image-modal-content">
      <button 
        className="close-image-modal" 
        onClick={() => setSelectedImage(null)}
      >
        ✕
      </button>
      <img src={selectedImage} alt="صورة كاملة" />
    </div>
  </div>
)}

// تحديث onClick للصورة
<img 
  src={url} 
  alt={`صورة المركبة ${index + 1}`}
  className="bot-image"
  loading="lazy"
  onClick={() => setSelectedImage(url)}
/>
```

### 4. CSS للـ modal

```css
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.image-modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.image-modal-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
}

.close-image-modal {
  position: absolute;
  top: -40px;
  right: 0;
  background: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.close-image-modal:hover {
  background: #f0f0f0;
}
```

---

## 🎯 النتيجة المتوقعة

بعد التحديث، ستظهر:

1. **الصور في شبكة منظمة** داخل رسائل البوت
2. **إمكانية النقر على الصورة** لعرضها بحجم كامل
3. **تصميم متجاوب** يعمل على جميع الأحجام
4. **تحميل تدريجي** للصور (lazy loading)
5. **تأثيرات hover** جميلة

---

## 📱 الاختبار

بعد التحديث، اختبر:

1. ✅ إرسال رسالة "ابي اشوف صور الشاحنة"
2. ✅ التحقق من ظهور الصور في الرسالة
3. ✅ النقر على الصورة لعرضها بحجم كامل
4. ✅ التحقق من التصميم على الموبايل
5. ✅ التحقق من سرعة التحميل

---

## 🔄 التكامل مع الخادم

تأكد من أن الخادم يرسل البيانات بهذا الشكل:

```json
{
  "_id": "message_id",
  "text": "طبعاً! عندي صور واضحة للشاحنة...",
  "sender": "bot",
  "imageUrls": [
    "https://res.cloudinary.com/.../image1.jpg",
    "https://res.cloudinary.com/.../image2.jpg",
    "https://res.cloudinary.com/.../image3.jpg"
  ],
  "createdAt": "2025-01-06T10:30:00.000Z"
}
```

---

## ✅ قائمة التحقق

- [ ] تم إضافة معالج عرض الصور
- [ ] تم إضافة أنماط CSS
- [ ] تم إضافة modal للعرض الكامل
- [ ] تم اختبار عرض صورة واحدة
- [ ] تم اختبار عرض عدة صور
- [ ] تم اختبار التصميم المتجاوب
- [ ] تم اختبار النقر على الصورة
- [ ] تم اختبار الإغلاق من modal

---

**ملاحظة:** هذه التحديثات اختيارية لتحسين تجربة المستخدم. النظام سيعمل بدونها، لكن الصور لن تظهر.
