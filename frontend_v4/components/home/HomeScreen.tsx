import React, { useRef, useState, useEffect } from 'react';
import ShipmentPost from './ShipmentPost';
import GeneralPost from './GeneralPost';
import StoryCard from './StoryCard'; // Import the new component
import './HomeScreen.css';
import { API_BASE_URL } from '../../config';
import StoryCardSkeleton from './StoryCardSkeleton';
import type { Company } from '../../App';


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

const HomeScreen: React.FC<{ 
  className?: string; 
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  onOpenCreateAdModal: () => void; 
  onOpenReportPost: (post: any) => void;
  onOpenMyProfile: () => void;
  onOpenOtherProfile: (user: any) => void;
  onOpenChat: (user: any) => void;
  onOpenChatList: () => void;
  onOpenCommentSheet: (post: any) => void;
  companiesCache: Company[] | null;
  setCompaniesCache: (companies: Company[]) => void;
  user: any;
  postsVersion: number;
}> = ({ className, onOpenNotifications, onOpenSearch, onOpenCreateAdModal, onOpenReportPost, onOpenMyProfile, onOpenOtherProfile, onOpenChat, onOpenChatList, onOpenCommentSheet, companiesCache, setCompaniesCache, user, postsVersion }) => {
  const initialDummyPosts = [
    {
      id: 1,
      type: 'shipment',
      companyName: 'شركة النقل السريع',
      avatar: `https://ui-avatars.com/api/?name=N&background=3498db&color=fff&size=50`,
      timeAgo: 'قبل 5 دقائق',
      from: 'الرياض',
      to: 'جدة',
      truckType: 'تريلا',
      date: '2024-08-15',
    },
    {
      id: 2,
      type: 'shipment',
      companyName: 'لوجستيات الصحراء',
      avatar: `https://ui-avatars.com/api/?name=L&background=e74c3c&color=fff&size=50`,
      timeAgo: 'قبل ساعة',
      from: 'الدمام',
      to: 'المدينة المنورة',
      truckType: 'دينا',
      date: '2024-08-16',
    },
    {
      id: 3,
      type: 'shipment',
      companyName: 'شحن الخليج',
      avatar: `https://ui-avatars.com/api/?name=S&background=2ecc71&color=fff&size=50`,
      timeAgo: 'قبل 3 ساعات',
      from: 'أبها',
      to: 'تبوك',
      truckType: 'فريزر (براد)',
      date: '2024-08-15',
    },
  ];

  const feedRef = useRef<HTMLElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const isActive = className?.includes('page-active');

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      setCompaniesError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setCompaniesError('المستخدم غير مسجل دخوله.');
        setIsLoadingCompanies(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/profile/companies`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({ message: 'فشل في جلب قائمة الشركات.' }));
          throw new Error(errorData.message || 'فشل في جلب قائمة الشركات. يرجى التأكد من اتصالك بالإنترنت.');
        }

        const data: Company[] = await response.json();
        setCompanies(data || []);
        setCompaniesCache(data || []);
      } catch (err: any) {
        setCompaniesError(err.message);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    
    if (isActive) {
        if (companiesCache) {
            setCompanies(companiesCache);
            setIsLoadingCompanies(false);
            setCompaniesError(null);
        } else {
            fetchCompanies();
        }
    }
  }, [isActive, companiesCache, setCompaniesCache]);

  useEffect(() => {
    const fetchPosts = async () => {
        setIsLoadingPosts(true);
        setPostsError(null);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setPosts(initialDummyPosts); // Show only dummy shipment posts if not logged in
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/v1/posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('فشل في جلب المنشورات.');
            
            const data = await res.json();
            const fetchedPosts = (data || []).map((p: any) => ({
                ...p, 
                id: p._id, // Map _id to id for key prop
                type: 'general' 
            }));

            const shipmentPosts = initialDummyPosts.filter(p => p.type === 'shipment');
            // Sort by creation date, newest first
            const sortedPosts = fetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPosts([...sortedPosts, ...shipmentPosts]);

        } catch (err: any) {
            setPostsError(err.message);
            setPosts(initialDummyPosts);
        } finally {
            setIsLoadingPosts(false);
        }
    };
    
    if(isActive) {
        fetchPosts();
    }
  }, [isActive, postsVersion]);
  
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنشور؟')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('يجب تسجيل الدخول للحذف.');
      
      const res = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'فشل في حذف المنشور.');
      }
      
      // Update UI optimistically
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));

    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className={`app-container home-container ${className || ''}`}>
      <header className="home-header">
        <div className="header-top">
            <h1>الرئيسية</h1>
            <div className="header-actions">
               <button className="header-icon" aria-label="ابحث عن شحنة" onClick={onOpenSearch}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                 <button className="header-icon" aria-label="الدردشات" onClick={onOpenChatList}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
                <button className="header-icon" aria-label="الإشعارات" onClick={onOpenNotifications}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </button>
                <button className="header-icon" aria-label="الملف الشخصي" onClick={onOpenMyProfile}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
        </div>
      </header>
      <main ref={feedRef} className="app-content home-content-feed">
        <div className="home-header-scrollable-part">
            <button className="create-ad-container" onClick={onOpenCreateAdModal}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <p>إنشاء اعلان</p>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
                </svg>
            </button>
            <div className="stories-container">
                <StoryCard isAddStory={true} name="أضف حالة" />
                {isLoadingCompanies && [...Array(5)].map((_, i) => <StoryCardSkeleton key={i} />)}
                {companiesError && <div className="stories-feedback error">{companiesError}</div>}
                {!isLoadingCompanies && !companiesError && companies.map(company => (
                    <StoryCard 
                      key={company._id} 
                      avatarUrl={getFullImageUrl(company.avatar) || `https://ui-avatars.com/api/?name=${company.name.charAt(0)}&background=random&color=fff&size=60`}
                      name={company.name} 
                      onOpenProfile={() => onOpenOtherProfile(company)} 
                    />
                ))}
            </div>
        </div>
        <div className="shipment-feed">
            {isLoadingPosts && <p style={{textAlign: 'center', padding: '20px'}}>جاري تحميل المنشورات...</p>}
            {postsError && <p style={{textAlign: 'center', padding: '20px', color: 'var(--danger-color)'}}>{postsError}</p>}
            {posts.map(post => {
                if (!user && post.type !== 'shipment') return null; // Don't show general posts if not logged in
                const isOwner = user && post.user && user._id === post.user._id;
                const commonProps = {
                    key: post.id,
                    onOpenReportPost: () => onOpenReportPost(post),
                    onOpenChat: () => onOpenChat({ name: post.companyName || post.user.name, avatarUrl: post.avatar || getFullImageUrl(post.user.avatar) }),
                    onOpenProfile: () => onOpenOtherProfile(post.user),
                    onOpenCommentSheet: () => onOpenCommentSheet(post)
                };
                if (post.type === 'shipment') {
                    return <ShipmentPost {...commonProps} post={post} />;
                }
                if (post.type === 'general') {
                     const mappedPost = {
                        ...post,
                        companyName: post.user.name,
                        avatar: getFullImageUrl(post.user.avatar) || `https://ui-avatars.com/api/?name=${post.user.name.charAt(0)}&background=random&color=fff&size=50`,
                        timeAgo: timeAgo(post.createdAt),
                    };
                    return <GeneralPost 
                        {...commonProps} 
                        post={mappedPost} 
                        isOwner={isOwner} 
                        onDeletePost={() => handleDeletePost(post.id)}
                    />;
                }
                return null;
            })}
        </div>
      </main>
    </div>
  );
};

export default HomeScreen;