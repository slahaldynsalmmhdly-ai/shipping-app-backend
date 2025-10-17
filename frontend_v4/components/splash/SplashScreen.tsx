import React from 'react';
import './SplashScreen.css';

const SplashScreen: React.FC<{ 
  className?: string;
  onOpenAccountTypeModal: () => void;
  onOpenLoginModal: () => void;
  onOpenForgotPasswordModal: () => void;
}> = ({ className, onOpenAccountTypeModal, onOpenLoginModal, onOpenForgotPasswordModal }) => {
  return (
    <div className={`app-container splash-container ${className || ''}`}>
      <div className="map-background">
        <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
          <path className="map-path" d="M100,250 C300,100 600,400 900,250" />
          <path className="map-path" d="M50,150 C250,300 500,50 800,200" />
          <path className="map-path" d="M200,450 C400,350 700,400 950,150" />
          <path className="route" d="M100,250 C300,100 600,400 900,250" />
          <path className="route route-2" d="M50,150 C250,300 500,50 800,200" />
          <path className="route route-3" d="M200,450 C400,350 700,400 950,150" />
        </svg>
      </div>

      <header className="app-header">
        <div className="logo-container">
          <svg className="logo-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="logo-text">شحن سريع</span>
        </div>
      </header>
      
      <main className="app-content">
        <h1 className="headline">تتبع شحنتك بسهولة</h1>
        <div className="features">
          <div className="feature">
            <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
            </svg>
            <p>شحن سريع</p>
          </div>
          <div className="feature">
            <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>تتبع مباشر</p>
          </div>
          <div className="feature">
            <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p>موثوقية وأمان</p>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <button className="btn btn-primary" onClick={onOpenLoginModal} aria-label="تسجيل الدخول">
          تسجيل الدخول
        </button>
        <button className="btn btn-secondary" onClick={onOpenAccountTypeModal} aria-label="إنشاء حساب جديد">
          إنشاء حساب جديد
        </button>
        <a href="#" onClick={(e) => { e.preventDefault(); onOpenForgotPasswordModal(); }} className="forgot-password-link">
          نسيت كلمة السر؟
        </a>
      </footer>
    </div>
  );
};

export default SplashScreen;