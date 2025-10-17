import React from 'react';
import './StaticPage.css';

const HelpCenterScreen: React.FC<{
  className?: string;
  onNavigateBack: () => void;
}> = ({ className, onNavigateBack }) => {
  return (
    <div className={`app-container static-page-container ${className || ''}`}>
      <header className="static-page-header">
        <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1>مركز المساعدة</h1>
      </header>
      <main className="app-content static-page-content">
        <h2>الأسئلة الشائعة</h2>
        <div className="faq-item">
          <h3>كيف يمكنني إنشاء إعلان جديد؟</h3>
          <p>من الصفحة الرئيسية، اضغط على زر "إنشاء إعلان"، ثم اختر نوع الإعلان (حمولة أو شاحنة فارغة) واملأ التفاصيل المطلوبة.</p>
        </div>
        <div className="faq-item">
          <h3>هل يمكنني تعديل ملفي الشخصي؟</h3>
          <p>نعم، يمكنك تعديل معلوماتك الشخصية أو معلومات شركتك من خلال الذهاب إلى صفحة الملف الشخصي والضغط على أيقونة التعديل.</p>
        </div>
        <div className="faq-item">
          <h3>ماذا أفعل إذا نسيت كلمة المرور؟</h3>
          <p>من شاشة البداية، اضغط على رابط "نسيت كلمة السر؟" واتبع التعليمات لإعادة تعيينها عبر بريدك الإلكتروني.</p>
        </div>
      </main>
    </div>
  );
};

export default HelpCenterScreen;
