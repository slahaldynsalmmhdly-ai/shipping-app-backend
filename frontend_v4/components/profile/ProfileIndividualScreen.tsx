import React, { useState, useEffect, useMemo } from 'react';
import './Profile.css';
import { API_BASE_URL } from '../../config';
import type { CachedProfileData, Screen, ConfirmationModalConfig, ToastType, ChatTarget } from '../../App';
import AutoPlayVideo from '../shared/AutoPlayVideo';
import { getOptimizedImageUrl } from '../../utils/cloudinaryHelper';

const getFullImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('data:image') || url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

interface PostGridItemProps {
    item: any;
    onOpenPostDetail: (post: any) => void;
}

const PostGridItem: React.FC<PostGridItemProps> = ({ item, onOpenPostDetail }) => {
    const media = item.media && item.media[0];
    const likeCount = item.reactions?.length || 0;

    const getTextSnippet = () => {
        const text = item.text || '';
        return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    };
    
    const getPostTypeIcon = () => {
        return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>;
    }

    return (
        <button className="post-grid-item" onClick={() => onOpenPostDetail(item)}>
            {media ? (
                media.type === 'video' 
                    ? <AutoPlayVideo
                        src={getFullImageUrl(media.url)!}
                        width={media.width}
                        height={media.height}
                        showPlayIconOnPause={false}
                        />
                    : <img src={getOptimizedImageUrl(getFullImageUrl(media.url)!)} alt="Post thumbnail" loading="lazy" />
            ) : (
                <div className="text-thumbnail">
                    {getPostTypeIcon()}
                    <p>{getTextSnippet()}</p>
                </div>
            )}
            {media && media.type === 'video' && (
                <div className="grid-item-video-indicator">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            )}
            <div className="grid-item-overlay">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                <span>{likeCount}</span>
            </div>
        </button>
    );
};


interface ProfileIndividualScreenProps {
    className?: string;
    onNavigateBack: () => void;
    profileCache: Map<string, CachedProfileData>;
    setProfileCache: React.Dispatch<React.SetStateAction<Map<string, CachedProfileData>>>;
    profileData: any | null;
    onOpenReportProfile: (user: any, origin: Screen) => void;
    profileOrigin: Screen;
    onOpenConfirmationModal: (config: Omit<ConfirmationModalConfig, 'isOpen'>) => void;
    onShowToast: (message: string, type?: ToastType) => void;
    onOpenPostDetail: (post: any) => void;
    onOpenNotifications: () => void;
    user: any;
    onOpenChat: (chatData: ChatTarget, origin: Screen) => void;
}

const ProfileIndividualScreen: React.FC<ProfileIndividualScreenProps> = ({ 
    className, onNavigateBack, profileCache, setProfileCache, profileData, onOpenReportProfile, profileOrigin, onOpenConfirmationModal, onShowToast, onOpenPostDetail, onOpenNotifications, user, onOpenChat
}) => {
    
    const isMyProfile = !profileData;
    const profileIdToFetch = isMyProfile ? 'me' : profileData?._id;
    const isActive = className?.includes('page-active');

    const [profile, setProfile] = useState<any | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'videos'>('posts');
    const [isSubscribed, setIsSubscribed] = useState(false);
    
    useEffect(() => {
        if (!isActive || !profileIdToFetch) {
            return;
        }

        const cachedData = profileCache.get(profileIdToFetch);

        const fetchAllData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

                const profileEndpoint = isMyProfile ? `${API_BASE_URL}/api/v1/profile/me` : `${API_BASE_URL}/api/v1/profile/${profileIdToFetch}`;
                
                const profileRes = await fetch(profileEndpoint, { headers });
                if (!profileRes.ok) throw new Error('فشل في جلب بيانات الملف الشخصي.');
                const newProfileData = await profileRes.json();
                const id = newProfileData._id;

                const [postsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/v1/posts/user/${id}`, { headers }),
                ]);

                const newPosts = postsRes.ok ? await postsRes.json() : [];
                
                const dataToCache: CachedProfileData = { 
                    profile: newProfileData, 
                    posts: newPosts,
                    vehicles: [],
                    reviews: []
                };

                setProfile(newProfileData);
                setPosts(newPosts);
                setProfileCache(prev => new Map(prev).set(profileIdToFetch!, dataToCache));
                
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (cachedData && cachedData.posts !== undefined) {
            setProfile(cachedData.profile);
            setPosts(cachedData.posts || []);
            setIsLoading(false);
            setError(null);
        } else {
            setIsLoading(true);
            setError(null);
            setProfile(null);
            setPosts([]);
            fetchAllData();
        }
    }, [isActive, profileIdToFetch, profileCache, setProfileCache, isMyProfile]);
    
    const { nonVideoPosts, allVideoItems } = useMemo(() => {
        const videos = posts.filter(item => item.media && item.media[0]?.type === 'video');
        const nonVideos = posts.filter(item => !item.media || item.media[0]?.type !== 'video');

        return {
            nonVideoPosts: nonVideos.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            allVideoItems: videos.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        };
    }, [posts]);
    
    const totalLikes = useMemo(() => {
        if (isLoading) return 0;
        return posts.reduce((sum, item) => sum + (item.reactions?.length || 0), 0);
    }, [posts, isLoading]);

    const itemsToShow = activeTab === 'posts' 
        ? nonVideoPosts
        : allVideoItems;

    const handleShare = () => {
        if (!profile) return;
        navigator.share({
            title: `ملف ${profile.name} الشخصي`,
            text: `شاهد ملف ${profile.name} على تطبيق شحن سريع`,
            url: window.location.href
        }).catch(err => console.error("Error sharing profile:", err));
    };
    
    const handleBellClick = () => {
        if (isMyProfile) {
            onShowToast('ميزة زيارات الملف الشخصي قيد التطوير.', 'info');
        } else {
            setIsSubscribed(prev => !prev);
            onShowToast(isSubscribed ? 'تم إلغاء تفعيل الإشعارات' : 'تم تفعيل الإشعارات للمستخدم', 'success');
        }
    };

    const handleStartChat = async () => {
        if (!profile) return;
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onShowToast('يجب تسجيل الدخول أولاً.', 'error');
                return;
            }
    
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ participantId: profile._id })
            });
            
            if (!response.ok) throw new Error("Failed to start or get conversation.");
            
            const conversationData = await response.json();
            onOpenChat({ participant: profile, conversationId: conversationData._id }, 'profileIndividual');
    
        } catch (error: any) {
            onShowToast(error.message, 'error');
        }
    };

    return (
        <div className={`app-container profile-container-individual tiktok-style ${className || ''}`}>
            <header className="profile-tiktok-header">
                <button onClick={onNavigateBack} className="header-icon-btn back-btn" aria-label="الرجوع"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                <div className="profile-header-actions">
                    <button className="header-icon-btn" aria-label="مشاركة" onClick={handleShare}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                           <polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                        </svg>
                    </button>
                    <button className={`header-icon-btn ${isSubscribed ? 'subscribed' : ''}`} aria-label="الإشعارات" onClick={handleBellClick}>
                        {isMyProfile ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                        )}
                    </button>
                </div>
            </header>
            <main className="app-content profile-tiktok-content">
                <div className="profile-tiktok-info-wrapper">
                    {isLoading ? (
                        <>
                            <div className="skeleton-animation profile-tiktok-avatar" />
                            <div className="profile-tiktok-identity">
                                <div className="skeleton-animation skeleton-line" style={{ width: '150px', height: '14px', margin: '0 auto 4px' }} />
                                <div className="skeleton-animation skeleton-line" style={{ width: '120px', height: '22px', margin: '0 auto' }} />
                            </div>
                            <div className="profile-tiktok-stats">
                                <div className="profile-tiktok-stat-item">
                                    <div className="skeleton-animation skeleton-line" style={{ width: '40px', height: '20px' }} />
                                    <div className="skeleton-animation skeleton-line" style={{ width: '50px', height: '14px', marginTop: '4px' }} />
                                </div>
                                <div className="stat-item-separator" />
                                <div className="profile-tiktok-stat-item">
                                    <div className="skeleton-animation skeleton-line" style={{ width: '40px', height: '20px' }} />
                                    <div className="skeleton-animation skeleton-line" style={{ width: '50px', height: '14px', marginTop: '4px' }} />
                                </div>
                                <div className="stat-item-separator" />
                                <div className="profile-tiktok-stat-item">
                                    <div className="skeleton-animation skeleton-line" style={{ width: '40px', height: '20px' }} />
                                    <div className="skeleton-animation skeleton-line" style={{ width: '50px', height: '14px', marginTop: '4px' }} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                             <img 
                                src={getFullImageUrl(profile?.avatar) || `https://ui-avatars.com/api/?name=${(profile?.name || user?.name || '?').charAt(0)}&background=random&color=fff&size=128`} 
                                alt={profile?.name || ''}
                                className="profile-tiktok-avatar"
                            />
                            <div className="profile-tiktok-identity">
                              <p className="profile-tiktok-email">{profile?.email || ''}</p>
                              <h2 className="profile-tiktok-name" title={profile?.name}>{profile?.name || ''}</h2>
                            </div>
                            
                            <div className="profile-tiktok-stats">
                                <div className="profile-tiktok-stat-item">
                                    <span className="stat-item-number">{profile?.followingCount ?? 0}</span>
                                    <span className="stat-item-label">يتابع</span>
                                </div>
                                <div className="stat-item-separator"></div>
                                <div className="profile-tiktok-stat-item">
                                    <span className="stat-item-number">{profile?.followersCount ?? 0}</span>
                                    <span className="stat-item-label">متابعون</span>
                                </div>
                                <div className="stat-item-separator"></div>
                                <div className="profile-tiktok-stat-item">
                                    <span className="stat-item-number">{totalLikes}</span>
                                    <span className="stat-item-label">إعجاب</span>
                                </div>
                            </div>
                            
                            {!isMyProfile && (
                                <div className="profile-tiktok-actions">
                                    <button className={`btn ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}>{isSubscribed ? 'أتابعه' : 'متابعة'}</button>
                                    <button className="btn btn-secondary" onClick={handleStartChat}>مراسلة</button>
                                </div>
                            )}

                            {profile?.description && <p className="profile-tiktok-bio">{profile.description}</p>}
                        </>
                    )}
                </div>

                <div className="profile-tiktok-tabs">
                    <button className={`profile-tiktok-tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                        <span>المنشورات</span>
                    </button>
                    <button className={`profile-tiktok-tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                        </svg>
                        <span>الفيديوهات</span>
                    </button>
                </div>
                <div className="profile-tiktok-grid">
                    {isLoading ? (
                        <div className="profile-grid-loader">
                            <div className="tiktok-loader small">
                                <div className="dot dot-1"></div>
                                <div className="dot dot-2"></div>
                                <div className="dot dot-3"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <p className="no-posts-message" style={{ gridColumn: '1 / -1' }}>{error}</p>
                    ) : itemsToShow.length > 0 ? (
                        itemsToShow.map(item => (
                            <PostGridItem 
                                key={item._id} 
                                item={item} 
                                onOpenPostDetail={onOpenPostDetail}
                            />
                        ))
                    ) : (
                        <p className="no-posts-message">لا توجد عناصر لعرضها.</p>
                    )}
                </div>

            </main>
        </div>
    );
};

export default ProfileIndividualScreen;