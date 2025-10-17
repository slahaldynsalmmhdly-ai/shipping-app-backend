import React, { useState, useRef, useEffect } from 'react';
import './ChatScreen.css';
import type { Screen } from '../../App';


interface ChatScreenProps {
  className?: string;
  onNavigateBack: () => void;
  user: { name: string; avatarUrl: string; } | null;
  onOpenProfile: (user: { name: string; avatarUrl: string; }) => void;
  onOpenReportFromChat: (reportType: string) => void;
  onOpenVoiceCall: () => void;
  onOpenVideoCall: () => void;
  chatOrigin: Screen;
}

// New Attachment Panel Component with modern icons
const AttachmentPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="attachment-panel-overlay" onClick={onClose}>
            <div className="attachment-panel-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-handle-bar"></div>
                <div className="attachment-options-grid">
                    <div className="attachment-option">
                        <div className="icon-wrapper camera">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                             <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                           </svg>
                        </div>
                        <span>الكاميرا</span>
                    </div>
                     <div className="attachment-option">
                        <div className="icon-wrapper photos">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                           </svg>
                        </div>
                        <span>الصور</span>
                    </div>
                     <div className="attachment-option">
                        <div className="icon-wrapper ai">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.25l-.648-1.688a2.25 2.25 0 01-1.476-1.476L12.438 18l1.688-.648a2.25 2.25 0 011.476-1.476L17.25 15l.648 1.688a2.25 2.25 0 011.476 1.476L21 18.75l-1.688.648a2.25 2.25 0 01-1.476 1.476z" />
                            </svg>
                        </div>
                        <span>توظيف الذكاء الاصطناعي</span>
                    </div>
                     <div className="attachment-option">
                        <div className="icon-wrapper documents">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                           </svg>
                        </div>
                        <span>المستندات</span>
                    </div>
                     <div className="attachment-option">
                        <div className="icon-wrapper files">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3.375 3.375 0 1116.5 7.372L5.555 18.305a1.125 1.125 0 001.59 1.59l12.03-12.03" />
                          </svg>
                        </div>
                        <span>الملفات</span>
                    </div>
                    <div className="attachment-option">
                        <div className="icon-wrapper location">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                               <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                           </svg>
                        </div>
                        <span>تحديد الموقع</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChatMenu: React.FC<{ onClose: () => void; onSelectReport: (type: string) => void; }> = ({ onClose, onSelectReport }) => (
    <>
        <div className="menu-backdrop" onClick={onClose}></div>
        <div className="chat-menu-popover">
            <div className="chat-menu-arrow"></div>
            <ul>
                <li onClick={() => { onSelectReport('الإبلاغ عن المستخدم'); onClose(); }}>الإبلاغ عن المستخدم</li>
                <li onClick={() => { onSelectReport('سجل أضرار عن الدردشة'); onClose(); }}>سجل أضرار عن الدردشة</li>
                <li onClick={onClose}>حظر هذه الشركة</li>
                <li onClick={() => { onSelectReport('الإبلاغ والحظر'); onClose(); }}>الإبلاغ والحظر</li>
            </ul>
        </div>
    </>
);

const ChatScreen: React.FC<ChatScreenProps> = ({ className, onNavigateBack, user, onOpenProfile, onOpenReportFromChat, onOpenVoiceCall, onOpenVideoCall, chatOrigin }) => {
    const [message, setMessage] = useState('');
    const [isAttachmentPanelOpen, setAttachmentPanelOpen] = useState(false);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    // Dummy messages for demonstration
    const dummyMessages = [
        { id: 1, text: 'السلام عليكم، هل الشاحنة متاحة غداً؟', sender: 'me' },
        { id: 2, text: 'وعليكم السلام، نعم متاحة. متى التحميل؟', sender: 'other' },
        { id: 3, text: 'ممتاز، التحميل صباحاً من الرياض.', sender: 'me' },
        { id: 4, text: 'تمام، في انتظارك.', sender: 'other' },
        { id: 5, text: 'هل يمكن تحميل بضاعة إضافية؟ لدي بعض الأغراض الصغيرة.', sender: 'me' },
        { id: 6, text: 'لا مشكلة، المساحة كافية.', sender: 'other' },
    ];

    // Auto-scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [message]);
    
    if (!user) return null; // Don't render if no user is selected for chat

    const canOpenProfile = chatOrigin !== 'profileCompany';

    return (
        <div className={`app-container chat-container ${className || ''}`}>
            <header className="chat-header">
                <div className="chat-header-start">
                    <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button className="chat-user-info" onClick={() => onOpenProfile(user)} disabled={!canOpenProfile}>
                        <img src={user.avatarUrl} alt={user.name} className="chat-avatar" />
                        <div className="user-details">
                            <h3>{user.name}</h3>
                            <span>متصل الآن</span>
                        </div>
                    </button>
                </div>
                <div className="chat-header-end">
                    <button className="header-action-icon" aria-label="مكالمة فيديو" onClick={onOpenVideoCall}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
                        </svg>
                    </button>
                    <button className="header-action-icon" aria-label="اتصال" onClick={onOpenVoiceCall}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                    </button>
                    <div className="header-action-icon-wrapper">
                        <button className="header-action-icon" aria-label="المزيد من الخيارات" onClick={() => setMenuOpen(!isMenuOpen)}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                            </svg>
                        </button>
                         {isMenuOpen && <ChatMenu onClose={() => setMenuOpen(false)} onSelectReport={onOpenReportFromChat} />}
                    </div>
                </div>
            </header>

            <main className="app-content chat-messages">
                {dummyMessages.map(msg => (
                    <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                        <div className="chat-bubble">
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>

            <footer className="chat-footer">
                <div className="chat-input-area">
                    <button className="attachment-btn" aria-label="إرفاق ملف" onClick={() => setAttachmentPanelOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                    </button>
                    <textarea
                        ref={textareaRef}
                        placeholder="اكتب رسالتك..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={1}
                    />
                </div>
                <button 
                    className="chat-action-btn"
                    aria-label={message.trim() ? "إرسال" : "تسجيل صوتي"}
                    disabled={!message.trim()}
                >
                    {message.trim() ? (
                        <svg className="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    ) : (
                        <svg className="mic-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.75 6.75 0 11-13.5 0v-1.5A.75.75 0 016 10.5z" />
                        </svg>
                    )}
                </button>
            </footer>
             {isAttachmentPanelOpen && <AttachmentPanel onClose={() => setAttachmentPanelOpen(false)} />}
        </div>
    );
};

export default ChatScreen;