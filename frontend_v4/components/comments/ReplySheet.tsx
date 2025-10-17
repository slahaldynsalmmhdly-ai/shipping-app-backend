import React, { useState, useEffect, useRef } from 'react';
import './ReplySheet.css';

const dummyReplies = [
  { id: 101, name: 'أحمد', avatar: `https://ui-avatars.com/api/?name=A&background=random&color=fff&size=36`, text: 'شكراً على المعلومة!', time: '3د', likes: 2, isLiked: false },
  { id: 102, name: 'سارة', avatar: `https://ui-avatars.com/api/?name=S&background=random&color=fff&size=36`, text: 'بالضبط, هذا ما كنت أبحث عنه.', time: '1د', likes: 5, isLiked: true },
];

interface ReplySheetProps {
  isOpen: boolean;
  onClose: () => void;
  comment: any | null;
}

const ReplySheet: React.FC<ReplySheetProps> = ({ isOpen, onClose, comment }) => {
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState(dummyReplies);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [replyText]);

  const handleLike = (replyId: number) => {
    setReplies(prevReplies =>
      prevReplies.map(reply =>
        reply.id === replyId
          ? { ...reply, isLiked: !reply.isLiked, likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1 }
          : reply
      )
    );
  };
  
  if (!isOpen || !comment) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="reply-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle-bar"></div>
            <header className="reply-sheet-header">
                <button onClick={onClose} className="back-button" aria-label="الرجوع">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                </button>
                <h3>الردود</h3>
            </header>
            <main className="reply-sheet-body">
                <div className="original-comment-highlight">
                    <img src={comment.avatar} alt={comment.name} className="comment-avatar" />
                    <div className="comment-content">
                        <div className="comment-bubble">
                            <h4>{comment.name}</h4>
                            <p>{comment.text}</p>
                        </div>
                    </div>
                </div>
                <div className="replies-list">
                {replies.map(reply => (
                    <div key={reply.id} className="reply-item">
                    <img src={reply.avatar} alt={reply.name} className="reply-avatar" />
                    <div className="reply-content">
                        <div className="reply-bubble">
                        <h4>{reply.name}</h4>
                        <p>{reply.text}</p>
                        </div>
                        <div className="reply-actions">
                        <span>{reply.time}</span>
                        <button className={`like-btn ${reply.isLiked ? 'liked' : ''}`} onClick={() => handleLike(reply.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {reply.likes > 0 && <span>{reply.likes}</span>}
                        </button>
                        <button className="report-btn" aria-label="الإبلاغ عن مشكلة">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </main>
            <footer className="comment-input-footer">
                <div className="comment-input-area">
                    <textarea
                    ref={textareaRef}
                    placeholder="إضافة رد..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={1}
                    />
                </div>
                <button
                    className="comment-send-btn"
                    aria-label="إرسال"
                    disabled={!replyText.trim()}
                >
                    <svg className="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </footer>
        </div>
    </div>
  );
};

export default ReplySheet;