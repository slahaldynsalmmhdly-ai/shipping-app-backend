import React, { useState, useEffect, useMemo } from 'react';
import './Profile.css';
import GeneralPost from '../home/GeneralPost';
import RepostedPost from '../home/RepostedPost'; // New Import
import FleetVehicleCard from './FleetVehicleCard'; // This is now the COMPACT card
import type { Vehicle, Screen, ToastType, CachedProfileData, ChatTarget } from '../../App';
import { API_BASE_URL } from '../../config';
import TruncatedText from '../shared/TruncatedText';


const getFullImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('data:image') || url.startsWith('http')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `قبل ${Math.floor(interval)} سنة`;
    interval = seconds / 2592000;
    if (interval > 1) return `قبل ${Math.floor(interval)} شهر`;
    interval = seconds / 86400;
    if (interval > 1) return `قبل ${Math.floor(interval)} يوم`;
    interval = seconds / 3600;
    if (interval > 1) return `قبل ${Math.floor(interval)} ساعة`;
    interval = seconds / 60;
    if (interval > 1) return `قبل ${Math.floor(interval)} دقيقة`;
    return `قبل ثوانٍ`;
};


const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    // A single, robust path for a standard star.
    const starPath = "m5.825 21 2.325-7.6-5.6-5.45 7.625-1.125L12 0l2.825 6.825 7.625 1.125-5.6 5.45L19.175 21 12 17.275Z";
    // A consistent color for the empty part of the rating.
    const emptyStarColor = "#e0e0e0";

    return (
        <div className="star-rating">
            {/* Render full stars */}
            {[...Array(fullStars)].map((_, i) => (
                <svg key={`full-${i}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d={starPath} />
                </svg>
            ))}
            
            {/* Render a half star if needed, using a robust clip-path method for RTL */}
            {halfStar && (
                <svg key="half" viewBox="0 0 24 24">
                    <defs>
                        <clipPath id="half-star-clip-rtl">
                            {/* This rectangle covers the RIGHT half of the star for RTL display */}
                            <rect x="12" y="0" width="12" height="24" />
                        </clipPath>
                    </defs>
                    {/* Render the empty star in the background */}
                    <path d={starPath} fill={emptyStarColor} />
                    {/* Render the filled star in the foreground, clipped to show only the right half */}
                    <path d={starPath} fill="currentColor" clipPath="url(#half-star-clip-rtl)" />
                </svg>
            )}

            {/* Render remaining empty stars */}
            {[...Array(emptyStars)].map((_, i) => (
                <svg key={`empty-${i}`} viewBox="0 0 24 24" fill={emptyStarColor}>
                    <path d={starPath} />
                </svg>
            ))}
        </div>
    );
};

interface CompanyProfile {
    _id: string;
    name: string;
    email: string;
    userType?: 'individual' | 'company';
    coverImage?: string;
    cover?: string;
    avatar?: string;
    avatarUrl?: string; // Keep for prop compatibility
    companyName?: string;
    description?: string;
    phone?: string;
    rating?: number;
    reviewCount?: number;
    fleetImages?: string[];
    licenseImages?: string[];
    truckCount?: number;
    truckTypes?: string;
    address?: string;
    city?: string;
    likesCount?: number;
    followersCount?: number;
    followingCount?: number;
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  media?: string[];
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  profile: string;
  createdAt: string;
}

interface ProfileCompanyScreenProps {
    className?: string; 
    onNavigateBack: () => void; 
    onOpenReportPost: (post: any) => void;
    onOpenReportProfile: (user: any, origin: Screen) => void;
    onOpenAddReviewModal: (profile: any) => void;
    onOpenDeleteReviewModal: (review: any) => void;
    onOpenCommentSheet: (post: any) => void;
    onOpenRepostModal: (post: any) => void;
    onOpenEditPost: (post: any, origin: Screen) => void;
    profileData: { _id?: string, name: string; avatarUrl: string; } | null;
    profileOrigin: Screen;
    profileCache: Map<string, any>;
    setProfileCache: React.Dispatch<React.SetStateAction<Map<string, any>>>;
    onOpenConfirmationModal: (config: { title: string, message: string, onConfirm: () => void }) => void;
    addDeletedItemId: (itemId: string) => void;
    onShowToast: (message: string, type: ToastType) => void;
    user: any;
    onOpenChat: (chatData: ChatTarget, origin: Screen) => void;
}

const ProfileCompanyScreen: React.FC<ProfileCompanyScreenProps> = ({ 
    className, onNavigateBack, onOpenReportPost, onOpenReportProfile, 
    onOpenAddReviewModal, onOpenDeleteReviewModal, onOpenCommentSheet, onOpenRepostModal, onOpenEditPost, profileData, profileOrigin, profileCache, setProfileCache, onOpenConfirmationModal, addDeletedItemId, onShowToast, user, onOpenChat
}) => {
    const isMyProfile = !profileData;
    const profileIdToFetch = isMyProfile ? 'me' : profileData?._id;
    const isActive = className?.includes('page-active');

    const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
    const [openReviewMenuId, setOpenReviewMenuId] = useState<string | null>(null);
    const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
    
    // Read from localStorage first
    const getCachedFollowStatus = () => {
        if (!profileIdToFetch || profileIdToFetch === 'me') return false;
        const cached = localStorage.getItem(`follow_${profileIdToFetch}`);
        return cached === 'true';
    };
    
    const [isFollowing, setIsFollowing] = useState(getCachedFollowStatus());
    
    const cachedDataOnMount = profileIdToFetch ? profileCache.get(profileIdToFetch) : undefined;

    // Data states
    const [profile, setProfile] = useState<CompanyProfile | null>(cachedDataOnMount?.profile ?? null);
    const [reviews, setReviews] = useState<Review[]>(cachedDataOnMount?.reviews ?? []);
    const [vehicles, setVehicles] = useState<Vehicle[]>(cachedDataOnMount?.vehicles ?? []);
    const [posts, setPosts] = useState<any[]>(cachedDataOnMount?.posts ?? []);

    
    // Control states
    const [isLoading, setIsLoading] = useState(!cachedDataOnMount || cachedDataOnMount.posts === undefined);
    const [error, setError] = useState<string | null>(null);

    const getToken = () => localStorage.getItem("authToken");

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
            onOpenChat({ participant: profile, conversationId: conversationData._id }, 'profileCompany');
    
        } catch (error: any) {
            onShowToast(error.message, 'error');
        }
    };

    const checkFollowStatus = async () => {
        if (!profileIdToFetch || profileIdToFetch === 'me' || isMyProfile) return;
        
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/follow/${profileIdToFetch}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setIsFollowing(data.isFollowing);
                localStorage.setItem(`follow_${profileIdToFetch}`, data.isFollowing.toString());
            }
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const handleFollowClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!profileIdToFetch || profileIdToFetch === 'me') return;
        
        const token = getToken();
        if (!token) {
            onShowToast('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        const method = isFollowing ? 'DELETE' : 'POST';
        const previousFollowState = isFollowing;
        const previousFollowersCount = profile?.followersCount || 0;

        // Optimistic update
        setIsFollowing(!isFollowing);
        localStorage.setItem(`follow_${profileIdToFetch}`, (!isFollowing).toString());
        if (profile) {
            setProfile({
                ...profile,
                followersCount: isFollowing ? previousFollowersCount - 1 : previousFollowersCount + 1
            });
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/follow/${profileIdToFetch}`, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (profile) {
                    setProfile({
                        ...profile,
                        followersCount: data.followersCount
                    });
                }
            } else {
                // Revert
                setIsFollowing(previousFollowState);
                localStorage.setItem(`follow_${profileIdToFetch}`, previousFollowState.toString());
                if (profile) {
                    setProfile({
                        ...profile,
                        followersCount: previousFollowersCount
                    });
                }
                onShowToast('حدث خطأ، حاول مرة أخرى', 'error');
            }
        } catch (error) {
            console.error('Error following/unfollowing:', error);
            // Revert
            setIsFollowing(previousFollowState);
            localStorage.setItem(`follow_${profileIdToFetch}`, previousFollowState.toString());
            if (profile) {
                setProfile({
                    ...profile,
                    followersCount: previousFollowersCount
                });
            }
            onShowToast('حدث خطأ في الاتصال', 'error');
        }
    };

    const handleReportReview = (reviewToReport: Review) => {
        setOpenReviewMenuId(null);
        onOpenReportPost(reviewToReport);
    };


    const isIndividualProfile = profile?.userType === 'individual';

    // Effect to handle switching away from a now-hidden tab
    useEffect(() => {
        if (isIndividualProfile && activeTab === 'reviews') {
            setActiveTab('posts');
        }
    }, [isIndividualProfile, activeTab]);

    const handleUpdateReactions = (itemId: string, newReactions: any[]) => {
        const updateState = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
            setter(prevItems =>
                prevItems.map(item =>
                    item._id === itemId ? { ...item, reactions: newReactions } : item
                )
            );
        };
        updateState(setPosts);
    
        // Also update the cache
        if (profileIdToFetch) {
            setProfileCache(prevCache => {
                const newCache = new Map(prevCache);
                const cachedData = newCache.get(profileIdToFetch) as CachedProfileData | undefined;
                if (cachedData) {
                    const updatedCachedData = {
                        ...cachedData,
                        posts: (cachedData.posts || []).map(item => item._id === itemId ? { ...item, reactions: newReactions } : item),
                    };
                    newCache.set(profileIdToFetch, updatedCachedData);
                }
                return newCache;
            });
        }
    };

    const createDeleteHandler = (itemId: string) => {
        onOpenConfirmationModal({
            title: "تأكيد الحذف",
            message: "هل أنت متأكد من رغبتك في حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.",
            onConfirm: async () => {
                if (!profileIdToFetch) return;

                const originalData = [...posts];
                const optimisticUpdate = () => setPosts(prev => prev.filter(p => p._id !== itemId));
                const revertUpdate = () => setPosts(originalData);
                const endpoint = `${API_BASE_URL}/api/v1/posts/${itemId}`;

                // Optimistic UI update
                optimisticUpdate();
                addDeletedItemId(itemId);
                
                try {
                    const res = await fetch(endpoint, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${getToken()}` }
                    });

                    if (!res.ok) {
                         const errorData = await res.json();
                         throw new Error(errorData.message || "فشل الحذف");
                    }

                    // On success, update the cache permanently
                    setProfileCache(prev => {
                        const newCache = new Map(prev);
                        const cachedData = newCache.get(profileIdToFetch) as CachedProfileData | undefined;
                        if (cachedData?.posts) {
                            const updatedItems = cachedData.posts.filter(item => item._id !== itemId);
                            newCache.set(profileIdToFetch, { ...cachedData, posts: updatedItems });
                        }
                        return newCache;
                    });
                    
                    onShowToast('تم الحذف بنجاح', 'success');
                } catch (err: any) {
                    // Revert UI on failure
                    revertUpdate();
                    onShowToast(err.message, 'error');
                }
            }
        });
    };

    useEffect(() => {
        if (!isActive || !profileIdToFetch) {
            return;
        }

        const cachedData = profileCache.get(profileIdToFetch);

        if (cachedData && cachedData.posts !== undefined) {
            setProfile(cachedData.profile);
            setReviews(cachedData.reviews);
            setVehicles(cachedData.vehicles);
            setPosts(cachedData.posts);
            setIsLoading(false);
            setError(null);
        } else {
            setIsLoading(true);
            setError(null);
            setProfile(null);
            setReviews([]);
            setVehicles([]);
            setPosts([]);
            
            const loadAllData = async () => {
                try {
                    const token = localStorage.getItem('authToken');
                    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

                    const profileEndpoint = isMyProfile 
                        ? `${API_BASE_URL}/api/v1/profile/me` 
                        : `${API_BASE_URL}/api/v1/profile/${profileIdToFetch}`;
                    
                    const profileRes = await fetch(profileEndpoint, { headers });
                    if (!profileRes.ok) throw new Error('فشل في جلب بيانات الملف الشخصي.');
                    const newProfileData: CompanyProfile = await profileRes.json();
                    const id = newProfileData._id;
                    if (!id) throw new Error('لم يتم العثور على معرف الملف الشخصي.');

                    const vehiclesEndpoint = isMyProfile
                      ? `${API_BASE_URL}/api/vehicles/my-vehicles`
                      : `${API_BASE_URL}/api/vehicles/user/${id}`;
                    const reviewsEndpoint = `${API_BASE_URL}/api/reviews/${id}`;
                    const postsEndpoint = `${API_BASE_URL}/api/v1/posts/user/${id}`;


                    const [vehiclesRes, reviewsRes, postsRes] = await Promise.all([
                        fetch(vehiclesEndpoint, { headers }),
                        fetch(reviewsEndpoint, { headers }),
                        fetch(postsEndpoint, { headers }),
                    ]);

                    let newVehicles: Vehicle[] = [];
                    if (vehiclesRes.ok) {
                        const rawVehiclesData = await vehiclesRes.json();
                        const vehiclesDataArray = Array.isArray(rawVehiclesData) ? rawVehiclesData : (rawVehiclesData.data || []);
                        newVehicles = vehiclesDataArray.map((v: any) => ({
                            id: v._id, 
                            driverName: v.driverName, 
                            vehicleName: v.vehicleName, 
                            licensePlate: v.licensePlate, 
                            imageUrl: v.imageUrl, 
                            vehicleType: v.vehicleType, 
                            currentLocation: v.currentLocation, 
                            color: v.vehicleColor, 
                            model: v.vehicleModel, 
                            status: v.status || 'متاح'
                        }));
                    }
                    
                    const newReviews: Review[] = reviewsRes.ok ? (await reviewsRes.json()).data || [] : [];
                    const newPosts: any[] = postsRes.ok ? await postsRes.json() : [];
                    
                    const dataToCache: CachedProfileData = { 
                        profile: newProfileData, 
                        vehicles: newVehicles, 
                        reviews: newReviews,
                        posts: newPosts,
                     };
                    setProfileCache(prev => new Map(prev).set(profileIdToFetch!, dataToCache));
                    
                    setProfile(newProfileData);
                    setVehicles(newVehicles);
                    setReviews(newReviews);
                    setPosts(newPosts);

                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            loadAllData();
        }
    }, [isActive, profileIdToFetch, profileCache, setProfileCache, isMyProfile]);
    
    useEffect(() => {
        if (isActive && !isMyProfile && profile) {
            checkFollowStatus();
        }
    }, [isActive, isMyProfile, profile?._id]);
    
    const company = useMemo(() => ({
        _id: profile?._id || '',
        name: profile?.companyName || profile?.name || '',
        email: profile?.email || '',
        coverUrl: getFullImageUrl(profile?.coverImage || profile?.cover),
        avatarUrl: getFullImageUrl(profile?.avatar || profile?.avatarUrl),
        description: profile?.description || '',
        rating: profile?.rating ?? 0,
        reviewCount: profile?.reviewCount ?? 0,
        fleetImages: profile?.fleetImages ?? [],
        licenseImages: profile?.licenseImages ?? [],
        address: profile?.address || '',
        city: profile?.city || '',
        truckCount: profile?.truckCount ?? 0,
        truckTypes: profile?.truckTypes || '',
    }), [profile]);
    
    const hasCompanyDetails = (company.address && company.city) || (company.truckCount > 0 || company.truckTypes) || profile?.phone || company.email;
    const hasIndividualDetails = profile?.phone || company.email;

    const token = getToken();
    
    const renderPostItem = (item: any) => {
        if (!user) return null;
        const isOwner = user && item.user && user._id === item.user._id;

        const commonProps = {
            isOwner,
            user,
            token,
            onOpenReportPost: () => onOpenReportPost(item),
            onOpenProfile: () => {}, // In profile, clicking header does nothing
            onOpenCommentSheet: () => onOpenCommentSheet(item),
            onOpenRepostModal: () => onOpenRepostModal(item),
            onEditPost: () => onOpenEditPost(item, 'profileCompany'),
            onShowToast: onShowToast,
            onUpdateReactions: (reactions: any[]) => handleUpdateReactions(item._id, reactions),
        };

        const mappedPost = {
            ...item,
            id: item._id,
            companyName: item.user.name,
            avatar: getFullImageUrl(item.user.avatar),
            timeAgo: timeAgo(item.createdAt)
        };
        
        if (item.isRepost && item.originalPost) {
            return <RepostedPost key={item._id} post={mappedPost} onDeletePost={() => createDeleteHandler(item._id)} {...commonProps} />;
        }
        return <GeneralPost key={item._id} post={mappedPost} onDeletePost={() => createDeleteHandler(item._id)} {...commonProps} />;
    };

    const renderReviewItem = (review: Review) => {
        const isReviewOwner = user?._id === review.author._id;
        return (
            <div key={review._id} className="review-card">
                <div className="review-header">
                    <img src={getFullImageUrl(review.author.avatar) || `https://ui-avatars.com/api/?name=${review.author.name.charAt(0)}`} alt={review.author.name} />
                    <div className="review-info">
                        <h4>{review.author.name}</h4>
                        <div className="review-meta">
                            <StarRating rating={review.rating} />
                            <span className="review-date">{timeAgo(review.createdAt)}</span>
                        </div>
                    </div>
                    {(isReviewOwner || isMyProfile) && (
                         <div className="post-menu-wrapper">
                            <button className="post-icon-btn" onClick={(e) => { e.stopPropagation(); setOpenReviewMenuId(review._id); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                </svg>
                            </button>
                            {openReviewMenuId === review._id && (
                                 <div className="post-menu-popover">
                                    <ul>
                                        {isReviewOwner && (
                                            <li className="danger" onClick={() => { setOpenReviewMenuId(null); onOpenDeleteReviewModal(review); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                <span>طلب حذف</span>
                                            </li>
                                        )}
                                        {!isReviewOwner && (
                                             <li className="danger" onClick={() => handleReportReview(review)}>
                                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                                                <span>الإبلاغ عن التقييم</span>
                                            </li>
                                        )}
                                    </ul>
                                 </div>
                            )}
                         </div>
                    )}
                </div>
                <p className="review-text">{review.comment}</p>
                {review.media && review.media.length > 0 && (
                    <div className="review-media-gallery">
                        <div className="review-media-item-wrapper">
                             <img src={getFullImageUrl(review.media[0])} alt="Review media" className="review-media-item" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const renderMainContent = () => {
        if (isLoading) {
             return (
                <div className="profile-content-loader">
                    <div className="tiktok-loader small">
                        <div className="dot dot-1"></div>
                        <div className="dot dot-2"></div>
                        <div className="dot dot-3"></div>
                    </div>
                </div>
            );
        }
    
        if (error) {
            return (
                 <div style={{ textAlign: 'center', paddingTop: '80px', color: 'var(--danger-color)' }}>
                    <p>{error}</p>
                    <button onClick={onNavigateBack} className="btn btn-secondary">الرجوع</button>
                </div>
            );
        }
        
        if (!profile) {
            return (
                <div style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <p>لا توجد بيانات للملف الشخصي.</p>
                    <button onClick={onNavigateBack} className="btn btn-secondary">الرجوع</button>
                </div>
            );
        }

        return (
            <>
                <div className="company-info-header">
                    <div className="company-name-container">
                        <div className="company-name-verified">
                            <h1>{company.name}</h1>
                            {!isIndividualProfile && <svg className="verified-badge" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zM7.854 14.854a.5.5 0 00.708 0L14.5 8.914a.5.5 0 10-.708-.708L8.5 13.793l-1.646-1.647a.5.5 0 10-.708.708l2 2z" clipRule="evenodd" /></svg>}
                        </div>
                        {!isIndividualProfile && (
                            <div className="company-rating-summary">
                                <StarRating rating={company.rating} />
                                <span>{company.rating.toFixed(1)} ({company.reviewCount} تقييم)</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-page-actions">
                    {!isMyProfile && (
                    <>
                        <button 
                            className={`profile-action-btn ${isFollowing ? 'following' : ''}`} 
                            onClick={handleFollowClick}
                        >
                            {isFollowing ? 'متابع' : 'متابعة'}
                        </button>
                        <button className="profile-action-btn" onClick={handleStartChat}>
                        مراسلة
                        </button>
                    </>
                    )}
                </div>
                
                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-number">{profile?.likesCount || 0}</span>
                        <span className="stat-label">إعجاب</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">{profile?.followersCount || 0}</span>
                        <span className="stat-label">متابع</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">{profile?.followingCount || 0}</span>
                        <span className="stat-label">يتابع</span>
                    </div>
                </div>

                {!isIndividualProfile && (
                    <section className="profile-section fleet-compact-section first-section">
                        <div className="fleet-compact-header">
                            <h2>أسطولنا</h2>
                        </div>
                        <div className="fleet-compact-scroll-container">
                            {vehicles.length > 0 ? (
                                vehicles.map(vehicle => (
                                    <FleetVehicleCard 
                                        key={vehicle.id} 
                                        vehicle={vehicle}
                                        onOpenChat={() => onShowToast('ميزة الدردشة غير متاحة حاليًا.', 'info')} 
                                    />
                                ))
                            ) : (
                                <p className="no-data-message">لم تتم إضافة أي مركبات للأسطول بعد.</p>
                            )}
                        </div>
                    </section>
                )}
                
                {!isIndividualProfile && company.fleetImages.length > 0 && (
                    <section className="profile-section fleet-photos-section">
                        <h2>صور الأسطول</h2>
                        <div className="fleet-photos-display-container">
                            {company.fleetImages.map((img, index) => (
                                <div key={index} className="fleet-photo-display-item">
                                    <img src={getFullImageUrl(img)} alt={`Fleet photo ${index + 1}`} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {!isIndividualProfile && company.licenseImages && company.licenseImages.length > 0 && (
                    <section className="profile-section fleet-photos-section">
                        <h2>صور التراخيص</h2>
                        <div className="fleet-photos-display-container">
                            {company.licenseImages.map((img, index) => (
                                <div key={index} className="fleet-photo-display-item">
                                    <img src={getFullImageUrl(img)} alt={`License photo ${index + 1}`} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {company.description && (
                    <section className="profile-section">
                        <h2>{isIndividualProfile ? 'نبذة' : 'نبذة عن الشركة'}</h2>
                        <p>{company.description}</p>
                    </section>
                )}

                {(hasCompanyDetails || hasIndividualDetails) && (
                    <section className="profile-section company-details-section">
                        <h2>{isIndividualProfile ? 'معلومات التواصل' : 'معلومات الشركة'}</h2>
                        <div className="company-details-grid">
                            {!isIndividualProfile && (company.address && company.city) && (
                                <div className="detail-grid-item">
                                    <div className="info-item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="info-item-content">
                                        <span className="info-item-label">العنوان</span>
                                        <span className="info-item-value">{`${company.address}, ${company.city}`}</span>
                                    </div>
                                </div>
                            )}
                            {!isIndividualProfile && (company.truckCount > 0 || company.truckTypes) && (
                                <div className="detail-grid-item">
                                    <div className="info-item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" /></svg>
                                    </div>
                                    <div className="info-item-content">
                                        <span className="info-item-label">الأسطول</span>
                                        <span className="info-item-value">{company.truckTypes ? `${company.truckCount} شاحنات (${company.truckTypes})` : `${company.truckCount} شاحنات`}</span>
                                    </div>
                                </div>
                            )}
                            {profile?.phone && (
                                <div className="detail-grid-item">
                                    <div className="info-item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </div>
                                    <div className="info-item-content">
                                        <span className="info-item-label">رقم الهاتف</span>
                                        <span className="info-item-value">{profile.phone}</span>
                                    </div>
                                </div>
                            )}
                            {company.email && (
                                <div className="detail-grid-item">
                                    <div className="info-item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div className="info-item-content">
                                        <span className="info-item-label">البريد الإلكتروني</span>
                                        <span className="info-item-value">{company.email}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {!isMyProfile && !isIndividualProfile && (
                    <section className="add-review-prompt-section">
                        <button className="add-review-prompt-btn" onClick={() => onOpenAddReviewModal(profile)}>
                            أضف تقييمًا
                        </button>
                    </section>
                )}
                
                <section className="profile-section profile-posts-section">
                    <div className="profile-tabs-nav">
                        <button className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
                            المنشورات
                        </button>
                        {!isIndividualProfile && (
                            <button className={`profile-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
                                التقييمات
                            </button>
                        )}
                    </div>
                    <div className="profile-tab-content">
                        {activeTab === 'posts' && (
                            <div className="profile-posts-list">
                                {posts.length > 0 ? (
                                    posts.map(item => renderPostItem(item))
                                ) : (
                                    <p className="no-data-message">لا توجد منشورات لعرضها.</p>
                                )}
                            </div>
                        )}
                        {activeTab === 'reviews' && !isIndividualProfile && (
                            <div className="reviews-list">
                                {reviews.length > 0 ? (
                                    reviews.map(review => renderReviewItem(review))
                                ) : (
                                    <p className="no-data-message">لا توجد تقييمات لعرضها.</p>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </>
        );
    };

    return (
        <div className={`app-container profile-container ${className || ''}`}>
            {openReviewMenuId && <div className="post-menu-backdrop" onClick={() => setOpenReviewMenuId(null)}></div>}
            <header className="profile-header-company">
                <div className="profile-cover">
                    {company.coverUrl && <img src={company.coverUrl} alt="Company Cover" />}
                    <div className="profile-cover-overlay">
                        <button onClick={onNavigateBack} className="cover-action-btn back" aria-label="الرجوع">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        {!isMyProfile && (
                            <button onClick={() => setIsOptionsSheetOpen(true)} className="cover-action-btn options" aria-label="خيارات">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <div className="profile-avatar-wrapper">
                     {company.avatarUrl ? <img src={company.avatarUrl} alt="Company Avatar" className="profile-avatar-img" /> : <div className="profile-avatar-placeholder"></div>}
                </div>
            </header>
    
            <main className="app-content profile-content-company">
                {renderMainContent()}
            </main>

            {isOptionsSheetOpen && (
                <div className="options-sheet-overlay" onClick={() => setIsOptionsSheetOpen(false)}>
                    <div className="options-sheet-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle-bar"></div>
                        <ul className="options-sheet-list">
                            <li onClick={() => { setIsOptionsSheetOpen(false); if (profile) { onOpenReportProfile(profile, 'profileCompany'); } }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                                <span>الإبلاغ</span>
                            </li>
                            <li onClick={() => { setIsOptionsSheetOpen(false); onShowToast('ميزة تفعيل الإشعارات غير متاحة حالياً.', 'info'); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                                <span>تفعيل زر الجرس</span>
                            </li>
                            <li onClick={() => { setIsOptionsSheetOpen(false); handleStartChat(); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                                <span>الدردشة</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileCompanyScreen;