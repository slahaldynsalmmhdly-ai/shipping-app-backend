import React, { useState } from 'react';
import ProfileImageUpload from '../shared/ProfileImageUpload';
import './SignUp.css';

const SignUpIndividualScreen: React.FC<{ className?: string; onNavigateBack: () => void }> = ({ className, onNavigateBack }) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle individual account creation logic here
  };

  return (
    <div className={`app-container signup-container ${className || ''}`}>
      <header className="signup-header">
        <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1>إنشاء حساب فردي</h1>
      </header>
      <main className="app-content">
        <ProfileImageUpload profileImage={profileImage} setProfileImage={setProfileImage} />
        <form className="signup-form" onSubmit={handleFormSubmit} id="signup-individual-form">
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
        </form>
      </main>
      <footer className="app-footer">
        <button className="btn btn-primary" type="submit" form="signup-individual-form" aria-label="إنشاء حساب">
          إنشاء حساب
        </button>
        <p className="login-link">
          لديك حساب بالفعل؟ <a href="#" onClick={(e) => { e.preventDefault(); onNavigateBack(); }}>تسجيل الدخول</a>
        </p>
      </footer>
    </div>
  );
};

export default SignUpIndividualScreen;