import React, { useState, useRef, useEffect } from 'react';
import ProfileImageUpload from '../shared/ProfileImageUpload';
import '../signup/SignUp.css'; // Reuse styles
import './Profile.css'; // For edit-specific styles
import { API_BASE_URL } from '../../config';
import type { CachedProfileData } from '../../App';


const getFullImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) {
        return undefined;
    }
    if (url.startsWith('data:image') || url.startsWith('http')) {
        return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

interface EditProfileCompanyScreenProps {
    className?: string;
    onNavigateBack: (refresh?: boolean) => void;
    setSavingState: React.Dispatch<React.SetStateAction<{ isSaving: boolean; messages: string[] }>>;
    onSave: (payload: any) => Promise<void>;
    profileCache: Map<string, CachedProfileData>;
}

const EditProfileCompanyScreen: React.FC<EditProfileCompanyScreenProps> = ({ 
    className, onNavigateBack, setSavingState, onSave, profileCache
}) => {
    
    const initialData = profileCache.get('me')?.profile;

    const [formData, setFormData] = useState({
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        companyName: initialData?.companyName || '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        description: initialData?.description || '',
        truckCount: initialData?.truckCount?.toString() || '',
        truckTypes: initialData?.truckTypes || '',
        registrationNumber: initialData?.registrationNumber || '',
    });
    const [profileImage, setProfileImage] = useState<string | null>(initialData?.avatar || null);
    const [coverImage, setCoverImage] = useState<string | null>(initialData?.coverImage || null);
    const [fleetImages, setFleetImages] = useState<string[]>(initialData?.fleetImages || []);
    const [isFetching, setIsFetching] = useState(!profileCache.has('me'));
    const [error, setError] = useState<string | null>(null);
    
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const fleetFileInputRef = useRef<HTMLInputElement>(null);
    const isActive = className?.includes('page-active');

    useEffect(() => {
        if (!isActive) {
            return;
        }

        const cachedData = profileCache.get('me');
        if (cachedData) {
            const profile = cachedData.profile;
            setFormData({
                phone: profile?.phone || '',
                email: profile?.email || '',
                companyName: profile?.companyName || '',
                address: profile?.address || '',
                city: profile?.city || '',
                description: profile?.description || '',
                truckCount: profile?.truckCount?.toString() || '',
                truckTypes: profile?.truckTypes || '',
                registrationNumber: profile?.registrationNumber || '',
            });
            setProfileImage(profile?.avatar || null);
            setCoverImage(profile?.coverImage || null);
            setFleetImages(profile?.fleetImages || []);
            setIsFetching(false);
            return;
        }

        const fetchProfile = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError("المستخدم غير مسجل دخوله.");
                setIsFetching(false);
                setSavingState({ isSaving: false, messages: [] });
                return;
            }
            
            setError(null);
            
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('فشل في تحميل بيانات الملف الشخصي.');
                
                const data = await res.json();
                const profile = data;
                
                setFormData({
                    phone: profile?.phone || '',
                    email: profile?.email || '',
                    companyName: profile?.companyName || '',
                    address: profile?.address || '',
                    city: profile?.city || '',
                    description: profile?.description || '',
                    truckCount: profile?.truckCount?.toString() || '',
                    truckTypes: profile?.truckTypes || '',
                    registrationNumber: profile?.registrationNumber || '',
                });
                setProfileImage(profile?.avatar || null);
                setCoverImage(profile?.coverImage || null);
                setFleetImages(profile?.fleetImages || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsFetching(false);
                setSavingState({ isSaving: false, messages: [] });
            }
        };

        setIsFetching(true);
        setSavingState({
            isSaving: true,
            messages: ["جاري جلب بيانات ملفك الشخصي...", "لحظة من فضلك..."],
        });
        fetchProfile();

    }, [isActive, profileCache, setSavingState]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const payload = {
            phone: formData.phone,
            email: formData.email,
            companyName: formData.companyName,
            name: formData.companyName, // Also update name for consistency
            address: formData.address,
            city: formData.city,
            description: formData.description,
            truckCount: Number(formData.truckCount) || 0,
            truckTypes: formData.truckTypes,
            registrationNumber: formData.registrationNumber,
            avatar: profileImage,
            coverImage: coverImage,
            fleetImages: fleetImages,
        };

        await onSave(payload);
    };
    
    const handleCoverUploadClick = () => {
        coverFileInputRef.current?.click();
    };

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleFleetUploadClick = () => {
        fleetFileInputRef.current?.click();
    };

    const handleFleetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            
            const readPromises = filesArray.map((file: File) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            resolve(reader.result);
                        } else {
                            reject(new Error('File could not be read as a data URL.'));
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(readPromises)
                .then(base64Images => {
                    setFleetImages([...fleetImages, ...base64Images]);
                })
                .catch(error => console.error("Error reading files:", error));
        }
    };
    
    const handleRemoveFleetImage = (index: number) => {
        setFleetImages(fleetImages.filter((_, i) => i !== index));
    };

    const isSaving = className?.includes('saving'); // A way to know if App.tsx is saving

    return (
    <div className={`app-container signup-container profile-edit-screen ${className || ''}`}>
        <main className="app-content">
            <div className="edit-cover-upload" onClick={handleCoverUploadClick}>
                <input
                    type="file"
                    ref={coverFileInputRef}
                    onChange={handleCoverFileChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
                {coverImage ? (
                    <img src={getFullImageUrl(coverImage)} alt="Cover Preview" className="edit-cover-preview" />
                ) : (
                    <div className="edit-cover-placeholder"></div>
                )}
                <div className="edit-cover-overlay">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 2h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 6H19a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm5 4a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" /></svg>
                    <span>تغيير صورة الغلاف</span>
                </div>
            </div>
            
            <div className="edit-profile-content-wrapper">
                <div className="edit-avatar-container">
                     <ProfileImageUpload profileImage={getFullImageUrl(profileImage)} setProfileImage={setProfileImage} />
                </div>
                
                 <div className="edit-profile-header-actions">
                    <h1 className="edit-profile-title">تعديل الملف الشخصي</h1>
                    <button onClick={() => onNavigateBack()} className="back-button-header" aria-label="الرجوع">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="edit-profile-top-actions">
                    <button type="button" onClick={handleFleetUploadClick} className="btn btn-secondary edit-profile-action-icon" aria-label="إضافة صور للأسطول">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 2h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 6H19a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm5 4a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" /></svg>
                        <span>صور الأسطول</span>
                    </button>
                     <button type="submit" form="edit-company-profile-form" className="btn btn-primary edit-profile-action-icon" aria-label="حفظ التعديلات" disabled={isFetching || isSaving}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                        <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
                    </button>
                </div>
                
                {error && <p className="modal-error" style={{width: '100%', marginBottom: '16px'}}>{error}</p>}

                <form className="signup-form" onSubmit={handleFormSubmit} id="edit-company-profile-form">
                    <div className="form-section">
                        <h3 className="column-title">معلومات التواصل</h3>
                        <div className="form-group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <input type="tel" placeholder="رقم الهاتف" required name="phone" value={formData.phone} onChange={handleInputChange} disabled={isFetching} />
                        </div>
                        <div className="form-group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <input type="email" placeholder="البريد الإلكتروني" required name="email" value={formData.email} onChange={handleInputChange} disabled={isFetching} />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="column-title">معلومات الشركة</h3>
                        <div className="form-group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" /></svg>
                            <input type="text" placeholder="اسم الشركة" required name="companyName" value={formData.companyName} onChange={handleInputChange} disabled={isFetching} />
                        </div>
                        <div className="form-row">
                             <div className="form-group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                <input type="text" placeholder="عنوان الشركة" required name="address" value={formData.address} onChange={handleInputChange} disabled={isFetching} />
                            </div>
                            <div className="form-group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18h16.5M4.5 21V3m15 18V3" /></svg>
                                <input type="text" placeholder="المدينة" required name="city" value={formData.city} onChange={handleInputChange} disabled={isFetching} />
                            </div>
                        </div>

                        <div className="form-group form-group-textarea">
                            <div className="form-group-textarea-header">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                                <label htmlFor="company-description">وصف الشركة</label>
                            </div>
                            <textarea
                                id="company-description"
                                rows={4}
                                placeholder="أدخل وصفًا تفصيليًا للشركة..."
                                aria-label="وصف الشركة"
                                required
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                disabled={isFetching}
                            ></textarea>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M5 9h14M5 15h14" /></svg>
                                <input type="number" placeholder="عدد الشاحنات" required name="truckCount" value={formData.truckCount} onChange={handleInputChange} disabled={isFetching} />
                            </div>
                            <div className="form-group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" /></svg>
                                <input type="text" placeholder="أنواع الشاحنات (دينا، تريلا...)" required name="truckTypes" value={formData.truckTypes} onChange={handleInputChange} disabled={isFetching} />
                            </div>
                        </div>

                        <div className="form-group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            <input type="text" placeholder="رقم تسجيل المركبة" required name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} disabled={isFetching} />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="column-title">صور الأسطول</h3>
                        <input
                            type="file"
                            ref={fleetFileInputRef}
                            onChange={handleFleetFileChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                            multiple
                        />
                         {fleetImages.length > 0 && (
                            <div className="fleet-photos-scroll-container">
                                {fleetImages.map((img, index) => (
                                    <div key={index} className="fleet-photo-item">
                                        <img src={getFullImageUrl(img)} alt={`Fleet vehicle ${index + 1}`} />
                                        <button type="button" className="remove-fleet-photo-btn" onClick={() => handleRemoveFleetImage(index)} aria-label="إزالة الصورة">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </main>
    </div>
    );
};

export default EditProfileCompanyScreen;