import React, { useState, useRef, useCallback } from 'react';
import './GeneralPost.css'; // New CSS file
import '../home/ShipmentPost.css'; // Re-use some post styles
import { API_BASE_URL } from '../../config';

const getFullImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('data:image') || url.startsWith('http')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

const reactions = [
  { name: 'like', icon: '👍', label: 'أعجبني', color: '#3498db' },
  { name: 'love', icon: '❤️', label: 'أحببته', color: '#e74c3c' },
  { name: 'haha', icon: '😂', label: 'أضحكني', color: '#f1c40f' },
  { name: 'wow', icon: '😮', label: 'أدهشني', color: '#f39c12' },
  { name: 'sad', icon: '😢', label: 'أحزنني', color: '#f39c12' },
  { name: 'angry', icon: '😠', label: 'أغضبني', color: '#d35400' },
];

const GeneralPost: React.FC<{ 
    post: any; 
    onOpenReportPost: () => void; 
    onOpenChat: () => void; 
    onOpenProfile: () => void; 
    onOpenCommentSheet: () => void;
    isOwner: boolean;
    onDeletePost: () => void;
}> = ({ post, onOpenReportPost, onOpenChat, onOpenProfile, onOpenCommentSheet, isOwner, onDeletePost }) => {
    const [showReactions, setShowReactions] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const pressTimer = useRef<number | undefined>();
    const longPressTriggered = useRef(false);

    const handleReactionSelect = (reactionName: string) => {
        setSelectedReaction(prev => (prev === reactionName ? null : reactionName));
        setShowReactions(false);
    };

    const cancelPress = useCallback(() => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = undefined;
        }
    }, []);

    const handlePressStart = useCallback(() => {
        longPressTriggered.current = false;
        pressTimer.current = window.setTimeout(() => {
            longPressTriggered.current = true;
            setShowReactions(true);
        }, 400);
    }, []);

    const handleClick = useCallback(() => {
        if (longPressTriggered.current) return;
        if (showReactions) {
            setShowReactions(false);
            return;
        }
        setSelectedReaction(prev => (prev ? null : 'like'));
    }, [showReactions]);

    const handleShare = async () => {
        const shareData = {
            title: `منشور من ${post.companyName}`,
            text: post.text ? post.text.substring(0, 100) + '...' : `شاهد هذا المنشور من ${post.companyName}`,
            url: `https://shahn-fast.com/post/${post.id}` // Dummy URL
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('خطأ في المشاركة:', error);
            }
        } else {
            alert('خاصية المشاركة غير مدعومة في هذا المتصفح.');
        }
    };

    const currentReaction = reactions.find(r => r.name === selectedReaction);

    return (
        <div className="general-post shipment-post"> {/* Reuse shipment-post for base styling */}
            <header className="general-post-header">
                <div className="post-header-actions">
                    <button className="post-icon-btn" aria-label="بدء الدردشة" onClick={onOpenChat}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                    <button className="post-icon-btn" aria-label="الإبلاغ عن المنشور" onClick={onOpenReportPost}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                        </svg>
                    </button>
                    {isOwner && (
                        <button className="post-icon-btn" aria-label="حذف المنشور" onClick={onDeletePost}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="post-identity" onClick={onOpenProfile} role="button" tabIndex={0}>
                    <img src={post.avatar} alt={post.companyName} className="post-avatar" />
                    <div className="post-author-details">
                        <h4 className="post-company-name">{post.companyName}</h4>
                        <p className="post-time">{post.timeAgo}</p>
                    </div>
                </div>
            </header>
            <div className="general-post-body">
                {post.text && <p className="post-text-content">{post.text}</p>}
                {post.media && post.media.length > 0 && (
                    <div className="post-media-container">
                        {post.media[0].type === 'video' ? (
                            <video src={getFullImageUrl(post.media[0].url)} controls className="post-media-content" />
                        ) : (
                            <img src={getFullImageUrl(post.media[0].url)} alt="Post content" className="post-media-content" />
                        )}
                    </div>
                )}
            </div>
            <div className="post-footer-actions post-actions-row">
                 <div className="post-action-btn-wrapper">
                    {showReactions && (
                        <div className="reactions-panel">
                            {reactions.map(reaction => (
                                <button
                                    key={reaction.name}
                                    className="reaction-button"
                                    onClick={() => handleReactionSelect(reaction.name)}
                                    aria-label={reaction.label}
                                >
                                    <span className="reaction-icon-emoji">{reaction.icon}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        className={`post-action-btn like-btn ${currentReaction ? 'reacted' : ''}`}
                        onClick={handleClick}
                        onMouseDown={handlePressStart}
                        onMouseUp={cancelPress}
                        onMouseLeave={cancelPress}
                        onTouchStart={handlePressStart}
                        onTouchEnd={cancelPress}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ color: currentReaction?.color }}
                    >
                        {currentReaction ? (
                            <span className="selected-reaction-icon">{currentReaction.icon}</span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM9 9l4.34-4.34L12 10h9v2l-3 7H9V9zM1 9h4v12H1V9z"/></svg>
                        )}
                        <span>{currentReaction ? currentReaction.label : 'أعجبني'}</span>
                    </button>
                </div>
                <button className="post-action-btn" onClick={onOpenCommentSheet}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.006 3 11.5c0 3.007 1.703 5.7 4.31 7.243l-1.31 2.447.791.425 2.716-1.54 1.258.199C10.125 20.093 11.043 20.25 12 20.25z" /></svg>
                    <span>تعليق</span>
                </button>
                <button className="post-action-btn" onClick={handleShare}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
                    <span>مشاركة</span>
                </button>
            </div>
        </div>
    );
};

export default GeneralPost;