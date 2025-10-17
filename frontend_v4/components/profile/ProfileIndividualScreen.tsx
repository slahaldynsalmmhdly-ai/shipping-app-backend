import React, { useState, useEffect } from 'react';
import './Profile.css';
import { API_BASE_URL } from '../../config';
import type { CachedProfileData, Screen } from '../../App';
import ProfileIndividualSkeleton from './ProfileIndividualSkeleton'; // Import the new skeleton component

// Helper function to construct full image URLs
const getFullImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('data:image') || url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    about?: string;
    avatar?: string;
}

interface ProfileIndividualScreenProps {
    className?: string;
    onNavigateBack: () => void;
    onLogout: () => void;
    onOpenEditProfile: () => void;
    profileCache: Map<string, CachedProfileData>;
    setProfileCache: React.Dispatch<React.SetStateAction<Map<string, CachedProfileData>>>;
    profileData: any | null;
    onOpenChat: (user: any) => void;
    onOpenVoiceCall: (user: any) => void;
    onOpenVideoCall: (user: any) => void;
    onOpenReportProfile: (user: any) => void;
    profileOrigin: Screen;
}

const ProfileIndividualScreen: React.FC<ProfileIndividualScreenProps> = ({ 
    className, onNavigateBack, onLogout, onOpenEditProfile, profileCache, setProfileCache, profileData, onOpenChat, onOpenVoiceCall, onOpenVideoCall, onOpenReportProfile, profileOrigin 
}) => {
    
    const isMyProfile = !profileData;
    const profileIdToFetch = isMyProfile ? 'me' : profileData?._id;
    const isActive = className?.includes('page-active');

    const cachedDataOnMount = profileIdToFetch ? profileCache.get(profileIdToFetch) : undefined;

    const [profile, setProfile] = useState<UserProfile | null>(cachedDataOnMount?.profile ?? null);
    const [isLoading, setIsLoading] = useState(!cachedDataOnMount);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isActive || !profileIdToFetch) return;

        const cachedData = profileCache.get(profileIdToFetch);
        if (cachedData) {
            const data = cachedData.profile;
            setProfile({
                _id: data._id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                about: data.description,
                avatar: data.avatar,
            });
            setIsLoading(false);
            setError(null);
            return;
        }

        const fetchProfile = async () => {
            const token = localStorage.getItem('authToken');
            if (!token && isMyProfile) {
                setError("المستخدم غير مسجل دخوله.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const endpoint = isMyProfile 
                    ? `${API_BASE_URL}/api/v1/profile/me` 
                    : `${API_BASE_URL}/api/v1/profile/${profileIdToFetch}`;
                
                const res = await fetch(endpoint, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (!res.ok) {
                    throw new Error('فشل في جلب بيانات الملف الشخصي.');
                }
                const data = await res.json();
                
                const newProfile = {
                    _id: data._id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    about: data.description,
                    avatar: data.avatar,
                };
                setProfile(newProfile);
                
                // Save to cache
                setProfileCache(prev => new Map(prev).set(profileIdToFetch, { profile: data, vehicles: [], reviews: [] }));
            } catch (err: any) {
                setError(err.message || 'حدث خطأ ما.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [isActive, profileIdToFetch, profileCache, isMyProfile, setProfileCache]);


    const renderContent = () => {
        if (isLoading) {
            return <ProfileIndividualSkeleton />;
        }
    
        if (error) {
            return <div className="error-message-container"><p>{error}</p></div>;
        }

        if (!profile) {
            return <div className="error-message-container"><p>لم يتم العثور على الملف الشخصي.</p></div>;
        }
        
        const targetUserForActions = {
            _id: profile._id,
            name: profile.name,
            avatarUrl: getFullImageUrl(profile.avatar) || '',
            userType: 'individual',
        };

        return (
            <>
                <div className="profile-individual-avatar-section">
                    <img 
                        src={getFullImageUrl(profile.avatar) || `https://ui-avatars.com/api/?name=${profile.name.charAt(0)}&background=random&color=fff&size=140`} 
                        alt={profile.name}
                        className="profile-individual-avatar-img"
                    />
                </div>
                
                <h2 className="profile-individual-name">{profile.name}</h2>
                <p className="profile-individual-detail">{profile.email}</p>
                {profile.phone && <p className="profile-individual-detail">{profile.phone}</p>}
                {profile.about && <p className="profile-individual-detail about">{profile.about}</p>}

                {isMyProfile ? (
                    <div className="profile-individual-actions-grid my-profile">
                        <button className="profile-action-item" onClick={onNavigateBack}>
                           <div className="profile-action-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
                           <span className="profile-action-label">رجوع</span>
                        </button>
                        <button className="profile-action-item" onClick={onOpenEditProfile}>
                           <div className="profile-action-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></div>
                           <span className="profile-action-label">تعديل</span>
                        </button>
                        <button className="profile-action-item" onClick={onLogout}>
                           <div className="profile-action-icon-wrapper logout"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg></div>
                           <span className="profile-action-label logout">خروج</span>
                        </button>
                    </div>
                ) : (
                    <div className="profile-individual-actions-grid other-profile">
                        <button className="profile-action-item" onClick={onNavigateBack}><div className="profile-action-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div><span className="profile-action-label">رجوع</span></button>
                        <button className="profile-action-item" onClick={() => onOpenChat(targetUserForActions)} disabled={profileOrigin === 'chat'}><div className="profile-action-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.53-0.417m-4.47-4.47a9.75 9.75 0 01-1.326-4.328C3 7.444 7.03 3.75 12 3.75c4.97 0 9 3.694 9 8.25z" /></svg></div><span className="profile-action-label">دردشة</span></button>
                        <button className="profile-action-item" onClick={() => onOpenVoiceCall(targetUserForActions)}><div className="profile-action-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></div><span className="profile-action-label">صوتي</span></button>
                        <button className="profile-action-item" onClick={() => onOpenVideoCall(targetUserForActions)}><div className="profile-action-icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg></div><span className="profile-action-label">فيديو</span></button>
                        <button className="profile-action-item" onClick={() => onOpenReportProfile(targetUserForActions)}><div className="profile-action-icon-wrapper logout"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg></div><span className="profile-action-label logout">إبلاغ</span></button>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className={`app-container profile-container profile-individual-container ${className || ''}`}>
            <header className="profile-individual-header">
                <h1 className="profile-individual-title">الملف الشخصي</h1>
            </header>
            <main className="app-content profile-individual-content">
               {renderContent()}
            </main>
        </div>
    );
};

export default ProfileIndividualScreen;