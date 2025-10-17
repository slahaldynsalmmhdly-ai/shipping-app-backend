import React from 'react';
import './BottomNav.css';
import type { Screen } from '../../App';

interface BottomNavProps {
    activeScreen: Screen;
    onNavigateHome: () => void;
    onNavigateHistory: () => void;
    onNavigateLiveTracking: () => void;
    onOpenSettings: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onNavigateHome, onNavigateHistory, onNavigateLiveTracking, onOpenSettings }) => {
    return (
        <footer className="bottom-nav">
            <button className={`nav-item ${activeScreen === 'home' ? 'active' : ''}`} aria-label="الرئيسية" onClick={onNavigateHome}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <p>الرئيسية</p>
            </button>
            <button className={`nav-item ${activeScreen === 'liveTracking' ? 'active' : ''}`} aria-label="تتبع مباشر" onClick={onNavigateLiveTracking}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0115 0" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12a4.5 4.5 0 019 0" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12a1.5 1.5 0 013 0" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v9m-4 0h8" />
                </svg>
                <p>تتبع</p>
            </button>
            <button className={`nav-item ${activeScreen === 'history' ? 'active' : ''}`} aria-label="سجل الشحنات" onClick={onNavigateHistory}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p>السجل</p>
            </button>
            <button className={`nav-item ${activeScreen === 'settings' ? 'active' : ''}`} aria-label="الإعدادات" onClick={onOpenSettings}>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995a6.473 6.473 0 010 .255c0 .382.145.755.438.995l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995a6.473 6.473 0 010-.255c0-.382-.145-.755-.438-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p>الإعدادات</p>
            </button>
        </footer>
    );
};

export default BottomNav;