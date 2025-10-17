import React, { useState, useEffect } from 'react';
import ProfileImageUpload from '../shared/ProfileImageUpload';
import { API_BASE_URL } from '../../config';
import type { CachedProfileData } from '../../App';
import '../posts/CreatePostScreen.css'; // Re-use header style
import './Profile.css'; // Re-use specific profile styles

const getFullImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('data:image') || url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

interface EditProfileIndividualScreenProps {
    className?: string;
    onNavigateBack: () => void;
    onSave: (payload: any) => Promise<void>;
    profileCache: Map<string, CachedProfileData>;
}

const EditProfileIndividualScreen: React.FC<EditProfileIndividualScreenProps> = ({
    className,
    onNavigateBack,
    onSave,
    profileCache,
}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [about, setAbout] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isFormValid = name.trim() !== '';
    const isActive = className?.includes('page-active');

    useEffect(() => {
        if (isActive) {
            const cachedData = profileCache.get('me');
            if (cachedData?.profile) {
                const profile = cachedData.profile;
                setName(profile.name || '');
                setEmail(profile.email || '');
                setPhone(profile.phone || '');
                setAbout(profile.description || '');
                setProfileImage(profile.avatar || null);
                setIsLoading(false);
            } else {
                // If cache is empty, you might want to show a loading state or fetch again
                // For simplicity, we assume cache is populated before reaching this screen.
                setIsLoading(true); 
            }
        }
    }, [isActive, profileCache]);
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const payload = {
            name,
            phone,
            description: about,
            avatar: profileImage,
        };

        onSave(payload);
    };
    
    if (isLoading && isActive) {
        return (
             <div className={`app-container create-post-container edit-profile-individual-container ${className || ''}`}>
                <p>جار التحميل...</p>
             </div>
        )
    }

    return (
        <div className={`app-container create-post-container edit-profile-individual-container ${className || ''}`}>
            <form className="create-post-form-wrapper" onSubmit={handleFormSubmit} id="edit-individual-profile-form">
                <header className="create-post-header">
                    <button type="button" onClick={onNavigateBack} className="post-header-btn close-btn" aria-label="إغلاق">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <h1>تعديل الملف الشخصي</h1>
                    <button type="submit" form="edit-individual-profile-form" className="post-header-btn publish-btn" disabled={!isFormValid} aria-label="حفظ">
                        حفظ
                    </button>
                </header>
                <main className="app-content create-post-content">
                    <ProfileImageUpload profileImage={getFullImageUrl(profileImage)} setProfileImage={setProfileImage} />
                    
                    <div className="form-row">
                        <div className="form-group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <input type="email" placeholder="البريد الإلكتروني" value={email} disabled />
                        </div>
                        <div className="form-group">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <input type="text" placeholder="الاسم الكامل" required value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                    </div>

                     <div className="form-group">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <input type="tel" placeholder="رقم الهاتف (اختياري)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    
                    <div className="form-group form-group-textarea">
                        <div className="form-group-textarea-header">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                            <label htmlFor="user-about">نبذة عني</label>
                        </div>
                        <textarea
                            id="user-about"
                            rows={4}
                            placeholder="اكتب نبذة مختصرة عنك..."
                            aria-label="نبذة عني"
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                        ></textarea>
                    </div>


                </main>
            </form>
        </div>
    );
};

export default EditProfileIndividualScreen;