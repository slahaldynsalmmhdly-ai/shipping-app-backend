import React from 'react';
import './ChatListScreen.css';

interface ChatListScreenProps {
  className?: string;
  onNavigateBack: () => void;
  onOpenNewChat: () => void;
  onOpenChat: (user: { name: string; avatarUrl: string }) => void;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ className, onNavigateBack, onOpenNewChat, onOpenChat }) => {
    // Dummy data for recent chats
    const recentChats = [
        {
            id: 1,
            name: 'شركة النقل السريع',
            avatarUrl: 'https://ui-avatars.com/api/?name=N&background=3498db&color=fff&size=50',
            lastMessage: 'تمام، في انتظارك.',
            timestamp: '10:45 ص',
        },
        {
            id: 2,
            name: 'لوجستيات الصحراء',
            avatarUrl: 'https://ui-avatars.com/api/?name=L&background=e74c3c&color=fff&size=50',
            lastMessage: 'وصلت الشحنة، شكراً جزيلاً.',
            timestamp: '9:15 ص',
        },
        {
            id: 3,
            name: 'شحن الخليج',
            avatarUrl: 'https://ui-avatars.com/api/?name=S&background=2ecc71&color=fff&size=50',
            lastMessage: 'هل السعر قابل للتفاوض؟',
            timestamp: 'أمس',
        },
        {
            id: 4,
            name: 'رواد النقل',
            avatarUrl: 'https://ui-avatars.com/api/?name=R&background=f1c40f&color=fff&size=50',
            lastMessage: 'تم إرسال المستندات المطلوبة.',
            timestamp: '2024/07/28',
        },
        {
            id: 5,
            name: 'نقل آمن',
            avatarUrl: 'https://ui-avatars.com/api/?name=A&background=9b59b6&color=fff&size=50',
            lastMessage: 'بالتأكيد، يمكننا توفير شاحنة مبردة.',
            timestamp: '2024/07/27',
        },
    ];

    return (
        <div className={`app-container chat-list-container ${className || ''}`}>
            <header className="chat-list-header">
                <div className="chat-list-header-top">
                    <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <h1>الدردشات</h1>
                </div>
                <div className="chat-list-search">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="search" placeholder="بحث في الدردشات..." />
                </div>
            </header>

            <main className="app-content chat-list-content">
                {recentChats.map(chat => (
                    <div key={chat.id} className="chat-list-item" onClick={() => onOpenChat({ name: chat.name, avatarUrl: chat.avatarUrl })}>
                        <img src={chat.avatarUrl} alt={chat.name} className="chat-list-item-avatar" />
                        <div className="chat-list-item-text">
                            <div className="name-time">
                                <h3>{chat.name}</h3>
                                <span className="timestamp">{chat.timestamp}</span>
                            </div>
                            <p className="last-message">{chat.lastMessage}</p>
                        </div>
                    </div>
                ))}
            </main>

            <button className="new-chat-fab" aria-label="استكشاف الشركات" onClick={onOpenNewChat}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5l3-3-3-3-3 3 3 3z" />
                </svg>
            </button>
        </div>
    );
};

export default ChatListScreen;