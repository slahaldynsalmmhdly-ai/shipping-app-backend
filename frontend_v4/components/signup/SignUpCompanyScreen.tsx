import React, { useState } from 'react';
import ProfileImageUpload from '../shared/ProfileImageUpload';
import './SignUp.css';

const SignUpCompanyScreen: React.FC<{ className?: string; onNavigateBack: () => void }> = ({ className, onNavigateBack }) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle company account creation logic here
  };

  return (
    <div className={`app-container signup-container ${className || ''}`}>
      <header className="signup-header">
        <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1>إنشاء حساب شركة</h1>
      </header>
      <main className="app-content">
        <ProfileImageUpload profileImage={profileImage} setProfileImage={setProfileImage} />
        <form className="signup-form" onSubmit={handleFormSubmit} id="signup-company-form">
          <div className="form-columns-container">
            <div className="form-column">
              <h3 className="column-title">معلومات الحساب</h3>
               {/* --- Basic Fields --- */}
              <div className="form-group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input type="text" placeholder="الاسم الكامل" required aria-label="الاسم الكامل" />
              </div>
              <div className="form-group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <input type="tel" placeholder="رقم الهاتف" required aria-label="رقم الهاتف" />
              </div>
              <div className="form-group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input type="email" placeholder="البريد الإلكتروني" required aria-label="البريد الإلكتروني" />
              </div>
              <div className="form-group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type="password" placeholder="كلمة المرور" required aria-label="كلمة المرور" />
              </div>
              <div className="form-group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <input type="password" placeholder="تأكيد كلمة المرور" required aria-label="تأكيد كلمة المرور" />
              </div>
            </div>
            <div className="form-column">
               <h3 className="column-title">معلومات الشركة</h3>
              {/* --- Company Fields --- */}
              <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" />
                  </svg>
                  <input type="text" placeholder="اسم الشركة" required aria-label="اسم الشركة" />
                </div>
                <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M5 9h14M5 15h14" />
                  </svg>
                  <input type="number" placeholder="عدد الشاحنات" required aria-label="عدد الشاحنات" />
                </div>
                <div className="form-group">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
                    </svg>
                  <input type="text" placeholder="أنواع الشاحنات (دينا، تريلا...)" required aria-label="أنواع الشاحنات" />
                </div>
                <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <input type="text" placeholder="رقم تسجيل المركبة" required aria-label="رقم تسجيل المركبة" />
                </div>
            </div>
          </div>
        </form>
      </main>
      <footer className="app-footer">
        <button className="btn btn-primary" type="submit" form="signup-company-form" aria-label="إنشاء حساب">
          إنشاء حساب
        </button>
        <p className="login-link">
          لديك حساب بالفعل؟ <a href="#" onClick={(e) => { e.preventDefault(); onNavigateBack(); }}>تسجيل الدخول</a>
        </p>
      </footer>
    </div>
  );
};

export default SignUpCompanyScreen;