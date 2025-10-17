import React, { useState } from 'react';
import './SettingsScreen.css';

const SettingsScreen: React.FC<{
  className?: string;
  onNavigateBack: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenAboutApp: () => void;
  onOpenHelpCenter: () => void;
  onOpenReportProblem: () => void;
  onOpenWarnings: () => void;
  onOpenSubscriptionModal: () => void;
}> = ({ className, onNavigateBack, onOpenPrivacyPolicy, onOpenAboutApp, onOpenHelpCenter, onOpenReportProblem, onOpenWarnings, onOpenSubscriptionModal }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => document.body.classList.contains('dark-mode'));

  const handleToggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    setIsDarkMode(prev => !prev);
  };
  
  // Dummy data for user
  const user = {
    name: 'محمد الأحمد',
    avatarUrl: `https://ui-avatars.com/api/?name=M&background=3498db&color=fff&size=128`,
  };

  return (
    <div className={`app-container settings-container ${className || ''}`}>
      <header className="settings-header">
         <div className="settings-header-top-bar">
            <h1>الإعدادات</h1>
         </div>
        {/* User Profile Merged into Header */}
        <div className="settings-header-profile">
          <img src={user.avatarUrl} alt="User Avatar" className="settings-header-avatar" />
          <div className="settings-header-user-info">
            <h2>{user.name}</h2>
            <span>مستخدم عادي</span>
          </div>
        </div>
         {/* Subscription CTA */}
        <div className="subscription-cta-container">
          <div className="cta-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.518a.75.75 0 01-.364.646l-1.488.992a.75.75 0 00-.364.646V16.5a.75.75 0 01-1.5 0v-11a.75.75 0 00-.364-.646L5.604 3.868A.75.75 0 015.24 3.22v-.97a.75.75 0 01.75-.75h4zm4.12 6.542a.75.75 0 00-1.038.27l-2.18 3.634a.75.75 0 001.276.768l2.18-3.634a.75.75 0 00-.238-1.038zM18 10a.75.75 0 01-.75.75h-2.19a.75.75 0 010-1.5H17.25A.75.75 0 0118 10zm-3.958 2.825a.75.75 0 01.27 1.038l-2.18 3.634a.75.75 0 11-1.276-.768l2.18-3.634a.75.75 0 011.006-.27zM4.12 8.542a.75.75 0 00-.238 1.038l2.18 3.634a.75.75 0 001.276-.768L5.158 8.812a.75.75 0 00-1.038-.27zM4.458 12.825a.75.75 0 00-1.006.27l-2.18 3.634a.75.75 0 101.276.768l2.18-3.634a.75.75 0 00-.27-1.038zM2.75 10a.75.75 0 01.75-.75h2.19a.75.75 0 010 1.5H3.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="cta-text">
            <h3>الترقية إلى بريميوم</h3>
            <p>احصل على ميزات حصرية.</p>
          </div>
          <button className="cta-button" onClick={onOpenSubscriptionModal}>اشترك الآن</button>
        </div>
      </header>
      <main className="app-content settings-content">
        <div className="settings-list">
            <div className="settings-row">
                <div className="settings-item">
                    <div className="settings-item-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <span>الإشعارات</span>
                    </div>
                </div>
                <div className="settings-item-toggle" onClick={handleToggleDarkMode}>
                    <div className="settings-item-info">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                     <span>الليل</span>
                    </div>
                     <div className={`toggle-switch ${isDarkMode ? 'active' : ''}`}>
                        <div className="toggle-knob" />
                     </div>
                </div>
            </div>
            <div className="settings-row">
                 <div className="settings-item">
                     <div className="settings-item-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10-5-10h6.088l4.912 10-4.912 10H11z" /></svg>
                        <span>اللغة</span>
                    </div>
                </div>
                <div className="settings-item" onClick={onOpenPrivacyPolicy}>
                    <div className="settings-item-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        <span>الخصوصية</span>
                    </div>
                </div>
            </div>
            <div className="settings-row">
                <div className="settings-item" onClick={onOpenHelpCenter}>
                    <div className="settings-item-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>المساعدة</span>
                    </div>
                </div>
                <div className="settings-item" onClick={onOpenReportProblem}>
                    <div className="settings-item-info">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                       </svg>
                        <span>الإبلاغ</span>
                    </div>
                </div>
            </div>
            <div className="settings-row">
                <div className="settings-item" onClick={onOpenAboutApp}>
                    <div className="settings-item-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>عن التطبيق</span>
                    </div>
                </div>
                <div className="settings-item warning-item" onClick={onOpenWarnings}>
                    <div className="settings-item-info">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                       </svg>
                        <span>تحذيرات</span>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsScreen;
