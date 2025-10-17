import React from 'react';
import './StaticPage.css';

const AboutAppScreen: React.FC<{
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
        <h1>عن التطبيق</h1>
      </header>
      <main className="app-content static-page-content centered-content">
        <div className="about-app-logo">
           <svg className="logo-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2>شحن سريع</h2>
          <p>الإصدار 1.0.0</p>
        </div>
        <p>
            تطبيق "شحن سريع" هو الحل الأمثل لربط أصحاب البضائع مع أصحاب الشاحنات في جميع أنحاء المملكة العربية السعودية. يهدف التطبيق إلى تسهيل عملية الشحن، وزيادة الكفاءة، وتوفير فرص جديدة للجميع.
        </p>
        <p>
            سواء كنت فردًا ترغب في نقل أثاث منزلك، أو شركة تبحث عن حلول لوجستية موثوقة، فإن "شحن سريع" يوفر لك منصة سهلة الاستخدام وآمنة.
        </p>
      </main>
    </div>
  );
};

export default AboutAppScreen;