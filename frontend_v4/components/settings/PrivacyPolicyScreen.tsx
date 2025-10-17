import React from 'react';
import './StaticPage.css';

const PrivacyPolicyScreen: React.FC<{
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
        <h1>سياسة الخصوصية</h1>
      </header>
      <main className="app-content static-page-content">
        <h2>1. المعلومات التي نجمعها</h2>
        <p>نحن نجمع المعلومات التي تقدمها مباشرة إلينا. على سبيل المثال، نجمع المعلومات عند إنشاء حساب، أو المشاركة في أي ميزات تفاعلية للخدمات، أو ملء نموذج، أو التواصل معنا.</p>
        
        <h2>2. كيف نستخدم معلوماتك</h2>
        <p>نستخدم المعلومات التي نجمعها عنك لتقديم خدماتنا وصيانتها وتحسينها. قد نستخدم المعلومات أيضًا لإرسال إشعارات إليك، بما في ذلك معلومات حول حسابك ومعاملاتك.</p>
        
        <h2>3. مشاركة المعلومات</h2>
        <p>قد نشارك المعلومات التي نجمعها عنك كما هو موضح في سياسة الخصوصية هذه أو كما هو موضح في وقت جمع المعلومات أو مشاركتها.</p>
      </main>
    </div>
  );
};

export default PrivacyPolicyScreen;
