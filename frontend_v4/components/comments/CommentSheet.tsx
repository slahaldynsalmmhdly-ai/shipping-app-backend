import React, { useState, useEffect, useRef } from 'react';
import './CommentSheet.css';

const initialComments = [
  { id: 1, name: 'سالم الدوسري', avatar: `https://ui-avatars.com/api/?name=S&background=random&color=fff&size=40`, text: 'خدمة ممتازة وسريعة، أنصح بالتعامل معهم.', time: '5د', replyCount: 2, likes: 12, isLiked: false },
  { id: 2, name: 'فاطمة علي', avatar: `https://ui-avatars.com/api/?name=F&background=random&color=fff&size=40`, text: 'هل يوجد لديكم شاحنات مبردة؟', time: '15د', replyCount: 1, likes: 3, isLiked: true },
  { id: 3, name: 'خالد الغامدي', avatar: `https://ui-avatars.com/api/?name=K&background=random&color=fff&size=40`, text: 'تجربة جيدة، وصلت الشحنة في الوقت المحدد.', time: '1س', replyCount: 0, likes: 7, isLiked: false },
];


interface CommentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: any | null;
  onOpenReplySheet: (comment: any) => void;
}

const CommentSheet: React.FC<CommentSheetProps> = ({ isOpen, onClose, post, onOpenReplySheet }) => {
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto'; // Reset height
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [commentText]);

  const handleLike = (commentId: number) => {
    setComments(prevComments =>
      prevComments.map(comment =>
        comment.id === commentId
          ? { ...comment, isLiked: !comment.isLiked, likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1 }
          : comment
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="comment-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <header className="comment-sheet-header">
          <h3>التعليقات</h3>
        </header>
        <main className="comment-sheet-body">
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <img src={comment.avatar} alt={comment.name} className="comment-avatar" />
              <div className="comment-content">
                <div className="comment-bubble">
                  <h4>{comment.name}</h4>
                  <p>{comment.text}</p>
                </div>
                <div className="comment-actions">
                  <span>{comment.time}</span>
                  <button className={`like-btn ${comment.isLiked ? 'liked' : ''}`} onClick={() => handleLike(comment.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {comment.likes > 0 && <span>{comment.likes}</span>}
                  </button>
                  <button className="reply-btn" onClick={() => onOpenReplySheet(comment)}>
                    رد
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
        </main>
        <footer className="comment-input-footer">
          <div className="comment-input-area">
            <img src="https://ui-avatars.com/api/?name=You&background=8e44ad&color=fff&size=40" alt="Your avatar" className="comment-input-avatar" />
            <textarea
              ref={textareaRef}
              placeholder="إضافة تعليق..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={1}
            />
          </div>
          <button
            className="comment-send-btn"
            aria-label="إرسال"
            disabled={!commentText.trim()}
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

export default CommentSheet;