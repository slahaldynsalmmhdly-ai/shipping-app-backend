import React from 'react';
import './NewChatScreen.css';

interface NewChatScreenProps {
  className?: string;
  onNavigateBack: () => void;
  onOpenChat: (user: { name: string; avatarUrl: string }) => void;
}

const NewChatScreen: React.FC<NewChatScreenProps> = ({ className, onNavigateBack, onOpenChat }) => {
    // Dummy data for all available contacts
    const allContacts = [
        { id: 1, name: 'الأسطول الحديث', avatarUrl: `https://ui-avatars.com/api/?name=F&background=34495e&color=fff&size=60` },
        { id: 2, name: 'البرق للشحن', avatarUrl: `https://ui-avatars.com/api/?name=B&background=1abc9c&color=fff&size=60` },
        { id: 3, name: 'البرق السريع', avatarUrl: `https://ui-avatars.com/api/?name=L&background=c0392b&color=fff&size=60` },
        { id: 4, name: 'خدمات الجنوب', avatarUrl: `https://ui-avatars.com/api/?name=S&background=8e44ad&color=fff&size=60` },
        { id: 5, name: 'رواد النقل', avatarUrl: `https://ui-avatars.com/api/?name=R&background=f1c40f&color=fff&size=60` },
        { id: 6, name: 'شحن الخليج', avatarUrl: `https://ui-avatars.com/api/?name=S&background=2ecc71&color=fff&size=60` },
        { id: 7, name: 'شحن الشمال', avatarUrl: `https://ui-avatars.com/api/?name=N&background=16a085&color=fff&size=60` },
        { id: 8, name: 'شركة النقل السريع', avatarUrl: 'https://ui-avatars.com/api/?name=N&background=3498db&color=fff&size=50' },
        { id: 9, name: 'لوجستيات الصحراء', avatarUrl: 'https://ui-avatars.com/api/?name=L&background=e74c3c&color=fff&size=50' },
        { id: 10, name: 'نقل آمن', avatarUrl: `https://ui-avatars.com/api/?name=A&background=9b59b6&color=fff&size=60` },
        { id: 11, name: 'النقل الموثوق', avatarUrl: `https://ui-avatars.com/api/?name=T&background=2980b9&color=fff&size=60` },
        { id: 12, name: 'نجمة الصحراء', avatarUrl: `https://ui-avatars.com/api/?name=D&background=e67e22&color=fff&size=60` },
    ];


    return (
        <div className={`app-container new-chat-container ${className || ''}`}>
            <header className="new-chat-header">
                <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                 <div className="new-chat-search-input">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="search" placeholder="بحث عن شركة..." autoFocus/>
                </div>
                <button className="mic-button" aria-label="بحث صوتي">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
            </header>

            <main className="app-content new-chat-content">
                <div className="contact-list">
                    {allContacts.sort((a, b) => a.name.localeCompare(b.name)).map(contact => (
                        <div key={contact.id} className="contact-item" onClick={() => onOpenChat(contact)}>
                            <img src={contact.avatarUrl} alt={contact.name} className="contact-item-avatar" />
                            <h3 className="contact-item-name">{contact.name}</h3>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default NewChatScreen;