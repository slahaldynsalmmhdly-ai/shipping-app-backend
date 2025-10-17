import React, { useState, useEffect } from 'react';
import './Profile.css';
import ShipmentPost from '../home/ShipmentPost'; // Reuse for ads list
import FleetVehicleCard from './FleetVehicleCard'; // This is now the COMPACT card
import type { Vehicle, Screen } from '../../App';
import { API_BASE_URL } from '../../config';
import ProfileCompanySkeleton from './ProfileCompanySkeleton';
import './ProfileCompanySkeleton.css';


const getFullImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('data:image') || url.startsWith('http')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="star-rating">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`full-${i}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      ))}
      {halfStar && <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>}
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={`empty-${i}`} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>
      ))}
    </div>
  );
};

interface CompanyProfile {
    _id: string;
    name: string;
    email: string;
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
    truckCount?: number;
    truckTypes?: string;
    address?: string;
    city?: string;
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

interface CachedProfileData {
    profile: CompanyProfile;
    vehicles: Vehicle[];
    reviews: Review[];
}

interface ProfileCompanyScreenProps {
    className?: string; 
    onNavigateBack: () => void; 
    onEditProfile: () => void; 
    onLogout: () => void;
    onOpenReportPost: (post: any) => void;
    onOpenReportProfile: (user: any) => void;
    onOpenChat: (user: { name: string; avatarUrl: string }) => void;
    onOpenVoiceCall: (user: { name: string; avatarUrl: string }) => void;
    onOpenVideoCall: (user: { name: string; avatarUrl: string }) => void;
    onOpenFleetManagement: () => void;
    onOpenAddReviewModal: (profile: any) => void;
    profileData: { _id?: string, name: string; avatarUrl: string; } | null;
    profileOrigin: Screen;
    profileVersion: number;
    profileCache: Map<string, CachedProfileData>;
    setProfileCache: React.Dispatch<React.SetStateAction<Map<string, CachedProfileData>>>;
}

const ProfileCompanyScreen: React.FC<ProfileCompanyScreenProps> = ({ 
    className, onNavigateBack, onEditProfile, onLogout, onOpenReportPost, onOpenReportProfile, onOpenChat, onOpenVoiceCall, onOpenVideoCall, onOpenFleetManagement, 
    onOpenAddReviewModal, profileData, profileOrigin, profileVersion, profileCache, setProfileCache 
}) => {
    const isMyProfile = !profileData;
    const profileIdToFetch = isMyProfile ? 'me' : profileData?._id;
    const isActive = className?.includes('page-active');

    const [activeTab, setActiveTab] = useState<'ads' | 'reviews'>('ads');
    
    const cachedDataOnMount = profileIdToFetch ? profileCache.get(profileIdToFetch) : undefined;

    // Data states
    const [profile, setProfile] = useState<CompanyProfile | null>(cachedDataOnMount?.profile ?? null);
    const [reviews, setReviews] = useState<Review[]>(cachedDataOnMount?.reviews ?? []);
    const [vehicles, setVehicles] = useState<Vehicle[]>(cachedDataOnMount?.vehicles ?? []);
    
    // Control states
    const [isLoading, setIsLoading] = useState(!cachedDataOnMount);
    const [error, setError] = useState<string | null>(null);

    // Effect to invalidate 'me' cache when a refresh is triggered (e.g., from Edit Profile)
    useEffect(() => {
        if (isMyProfile && profileVersion > 0) {
            setProfileCache(prev => {
                const newCache = new Map(prev);
                newCache.delete('me');
                return newCache;
            });
            setIsLoading(true);
        }
    }, [profileVersion, isMyProfile, setProfileCache]);

    // This effect is now the single source of truth for fetching data or loading from cache.
    useEffect(() => {
        if (!isActive || !profileIdToFetch) {
            return;
        }

        const cachedData = profileCache.get(profileIdToFetch);

        if (cachedData) {
            // Data is in cache, so we use it directly.
            setProfile(cachedData.profile);
            setReviews(cachedData.reviews);
            setVehicles(cachedData.vehicles);
            setIsLoading(false);
            setError(null);
        } else {
            // Data is not in cache, so we need to fetch it.
            setIsLoading(true);
            setError(null);
            
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

                    const [vehiclesRes, reviewsRes] = await Promise.all([
                        fetch(vehiclesEndpoint, { headers }),
                        fetch(reviewsEndpoint, { headers })
                    ]);

                    let newVehicles: Vehicle[] = [];
                    let vehiclesError: string | null = null;
                    if (vehiclesRes.ok) {
                        const vehiclesData = await vehiclesRes.json();
                        newVehicles = vehiclesData.map((v: any) => ({
                            id: v._id, driverName: v.driverName, vehicleName: v.vehicleName, licensePlate: v.licensePlate, imageUrl: v.imageUrl, vehicleType: v.vehicleType, currentLocation: v.currentLocation, color: v.vehicleColor, model: v.vehicleModel, status: v.status || 'متاح'
                        }));
                    } else {
                        vehiclesError = 'فشل في جلب الأسطول.';
                    }
                    
                    let newReviews: Review[] = [];
                    if (reviewsRes.ok) {
                        const reviewsData = await reviewsRes.json();
                        newReviews = reviewsData.data || [];
                    }
                    
                    const dataToCache = { profile: newProfileData, vehicles: newVehicles, reviews: newReviews };
                    setProfileCache(prev => new Map(prev).set(profileIdToFetch!, dataToCache));
                    
                    setProfile(newProfileData);
                    setVehicles(newVehicles);
                    setReviews(newReviews);

                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            loadAllData();
        }
    }, [isActive, profileIdToFetch, profileCache, setProfileCache, isMyProfile]);
    
    if (isLoading) {
        return (
            <div className={`app-container profile-container ${className || ''}`}>
                <main className="app-content" style={{ padding: 0 }}>
                    <ProfileCompanySkeleton />
                </main>
            </div>
        )
    }

    if (error) {
         return (
            <div className={`app-container profile-container ${className || ''}`}>
                 <header className="profile-header-company">
                    <div className="profile-cover"></div>
                 </header>
                 <main className="app-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '80px' }}>
                    <p style={{color: 'var(--danger-color)'}}>{error}</p>
                </main>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className={`app-container profile-container ${className || ''}`}>
                 <main className="app-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <p>لا توجد بيانات للملف الشخصي.</p>
                </main>
            </div>
        )
    }
    
    const company = {
        _id: profile._id,
        name: profile.companyName || profile.name || '',
        email: profile.email || '',
        coverUrl: getFullImageUrl(profile.coverImage),
        avatarUrl: getFullImageUrl(profile.avatar || profile.avatarUrl),
        description: profile.description || '',
        rating: profile.rating ?? 0,
        reviewCount: profile.reviewCount ?? 0,
        fleetImages: profile.fleetImages ?? [],
        address: profile.address || '',
        city: profile.city || '',
        truckCount: profile.truckCount ?? 0,
        truckTypes: profile.truckTypes || '',
    };

    const targetUserForActions = {
        name: company.name,
        avatarUrl: company.avatarUrl || '',
    };

    return (
    <div className={`app-container profile-container ${className || ''}`}>
        <header className="profile-header-company">
            <div className="profile-cover">
                {company.coverUrl && <img src={company.coverUrl} alt="Company Cover" />}
            </div>
            <div className="profile-avatar-wrapper">
                 {company.avatarUrl && <img src={company.avatarUrl} alt="Company Avatar" className="profile-avatar-img"/>}
            </div>
        </header>

        <main className="app-content profile-content-company">
            <div className="company-info-header">
                <div className="company-name-container">
                     <div className="company-name-verified">
                        <h1>{company.name}</h1>
                        <svg className="verified-badge" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zM7.854 14.854a.5.5 0 00.708 0L14.5 8.914a.5.5 0 10-.708-.708L8.5 13.793l-1.646-1.647a.5.5 0 10-.708.708l2 2z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="company-rating-summary">
                        <StarRating rating={company.rating} />
                        <span>{company.rating.toFixed(1)} ({company.reviewCount} تقييم)</span>
                    </div>
                </div>

                <div className="profile-header-actions">
                     {isMyProfile ? (
                        <>
                            <button onClick={onNavigateBack} className="edit-profile-icon-btn" aria-label="الرجوع">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                            <button onClick={onEditProfile} className="edit-profile-icon-btn" aria-label="تعديل الملف الشخصي">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            </button>
                            <button className="edit-profile-icon-btn" aria-label="مكالمة جماعية للأسطول">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                </svg>
                            </button>
                            <button onClick={onLogout} className="edit-profile-icon-btn" aria-label="تسجيل الخروج">
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                            </button>
                        </>
                    ) : (
                         <>
                            <button className="profile-action-icon-btn" onClick={() => onOpenChat(targetUserForActions)} aria-label="مراسلة" disabled={profileOrigin === 'chat'}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </button>
                            <button className="profile-action-icon-btn" onClick={() => onOpenVoiceCall(targetUserForActions)} aria-label="مكالمة صوتية">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            </button>
                            <button className="profile-action-icon-btn" onClick={() => onOpenVideoCall(targetUserForActions)} aria-label="مكالمة فيديو">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg>
                            </button>
                            <button className="profile-action-icon-btn secondary" onClick={() => onOpenReportProfile(profileData)} aria-label="إبلاغ">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                            </button>
                            <button className="profile-action-icon-btn secondary" onClick={onNavigateBack} aria-label="خروج">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <section className="profile-section fleet-compact-section">
                <div className="fleet-compact-header">
                    <h2>أسطولنا</h2>
                    {isMyProfile && (
                        <button onClick={onOpenFleetManagement} className="manage-fleet-btn">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.108 1.204.165.397.505.71.93.78l.894.149c.542.09.94.56.94 1.11v1.093c0 .55-.398 1.02-.94 1.11l-.894.149c-.425.07-.765.383-.93.78-.164.398-.142.854.108 1.204l.527.738c.32.447.27.96-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.93l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 01-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.149c-.542-.09-.94-.56-.94-1.11v-1.094c0 .55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.164-.398.142.854-.108-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.93l.15-.894z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>إدارة</span>
                        </button>
                    )}
                </div>
                 <div className="fleet-compact-scroll-container">
                    {vehicles.length > 0 ? (
                        vehicles.map(vehicle => (
                            <FleetVehicleCard 
                                key={vehicle.id} 
                                vehicle={vehicle}
                                onOpenChat={() => onOpenChat({ 
                                    name: vehicle.driverName, 
                                    avatarUrl: getFullImageUrl(vehicle.imageUrl)! 
                                })} 
                            />
                        ))
                    ) : (
                        <p className="no-data-message">لم تتم إضافة أي مركبات للأسطول بعد.</p>
                    )}
                </div>
            </section>
            
            {company.fleetImages.length > 0 && (
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

            <section className="profile-section">
                <h2>نبذة عن الشركة</h2>
                <p>{company.description || 'لا يوجد وصف للشركة.'}</p>
            </section>

            <div className="company-info-list">
                {(company.address && company.city) && (
                    <div className="info-item">
                        <div className="info-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.223.654-.369.254-.145.546-.32.84-.523.295-.203.618-.45.945-.737.327-.287.666-.612.988-.962a10 10 0 002.33-4.475 8 8 0 10-16 0 10 10 0 002.33 4.475c.322.35.66.675.988.962.327.287.65.534.945.737.294.203.586.378.84.523.254-.146.468.269.654.369a5.741 5.741 0 00.281.14l.018.008.006.003zM10 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="info-item-content">
                            <span className="info-item-label">العنوان</span>
                            <span className="info-item-value">{`${company.address}, ${company.city}`}</span>
                        </div>
                    </div>
                )}
                {(company.truckCount > 0 || company.truckTypes) && (
                    <div className="info-item">
                        <div className="info-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" /></svg>
                        </div>
                        <div className="info-item-content">
                            <span className="info-item-label">الأسطول</span>
                            <span className="info-item-value">{company.truckTypes ? `${company.truckCount} شاحنات (${company.truckTypes})` : `${company.truckCount} شاحنات`}</span>
                        </div>
                    </div>
                )}
                {profile.phone && (
                    <div className="info-item">
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
                    <div className="info-item">
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

            <section className="add-review-prompt-section">
                <button className="add-review-prompt-btn" onClick={() => onOpenAddReviewModal(profile)}>
                    أضف تقييمًا
                </button>
            </section>
            
            <section className="profile-section">
                 <div className="profile-tabs-nav">
                    <button 
                        className={`profile-tab-btn ${activeTab === 'ads' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ads')}
                        aria-selected={activeTab === 'ads'}
                    >
                        أحدث الإعلانات
                    </button>
                    <button 
                        className={`profile-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reviews')}
                        aria-selected={activeTab === 'reviews'}
                    >
                        التقييمات
                    </button>
                </div>
                <div className="profile-tab-content">
                    {activeTab === 'ads' && (
                        <div className="profile-ads-list">
                             <p className="no-data-message">لا توجد إعلانات لعرضها.</p>
                        </div>
                    )}
                    {activeTab === 'reviews' && (
                       <div className="reviews-list">
                            {reviews.length > 0 ? (
                                reviews.map((review) => (
                                    <div key={review._id} className="review-card">
                                        <div className="review-header">
                                            <img src={getFullImageUrl(review.author?.avatar) || `https://ui-avatars.com/api/?name=${review.author?.name?.charAt(0) || '?'}&background=random&color=fff&size=40`} alt={review.author?.name || 'مستخدم محذوف'} />
                                            <div className="review-info">
                                                <h4>{review.author?.name || 'مستخدم محذوف'}</h4>
                                                <StarRating rating={review.rating} />
                                            </div>
                                        </div>
                                        <p className="review-text">{review.comment}</p>
                                        {review.media && review.media.length > 0 && (
                                            <div className="review-media-gallery">
                                                {review.media.map((url, index) => (
                                                    <div key={index}>
                                                        {url.includes('video') ? (
                                                            <video src={getFullImageUrl(url)} controls className="review-media-item" />
                                                        ) : (
                                                            <img src={getFullImageUrl(url)} alt={`review-media-${index}`} className="review-media-item" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="no-data-message">لا توجد تقييمات لعرضها.</p>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    </div>
    );
};

export default ProfileCompanyScreen;