import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

import SplashScreen from './components/splash/SplashScreen';
import HomeScreen from './components/home/HomeScreen';
import HistoryScreen from './components/history/HistoryScreen';
import NotificationsScreen from './components/notifications/NotificationsScreen';
import SearchScreen from './components/search/SearchScreen';
import LiveTrackingScreen from './components/tracking/LiveTrackingScreen';
import LoginModal from './components/auth/LoginModal';
import ForgotPasswordModal from './components/auth/ForgotPasswordModal';
import AccountTypeSelectionModal from './components/auth/AccountTypeSelectionModal';
import SignUpIndividualModal from './components/signup/SignUpIndividualModal';
import SignUpCompanyModal from './components/signup/SignUpCompanyModal';
import CreateAdModal from './components/ads/CreateAdModal';
import CreateCargoAdScreen from './components/ads/CreateCargoAdScreen';
import CreateTruckAdScreen from './components/ads/CreateTruckAdScreen';
import CreatePostScreen from './components/posts/CreatePostScreen';
import ProfileIndividualScreen from './components/profile/ProfileIndividualScreen';
import ProfileCompanyScreen from './components/profile/ProfileCompanyScreen';
import EditProfileCompanyScreen from './components/profile/EditProfileCompanyScreen';
import EditProfileIndividualScreen from './components/profile/EditProfileIndividualScreen';
import SettingsScreen from './components/settings/SettingsScreen';
import PrivacyPolicyScreen from './components/settings/PrivacyPolicyScreen';
import AboutAppScreen from './components/settings/AboutAppScreen';
import HelpCenterScreen from './components/settings/HelpCenterScreen';
import ReportProblemScreen from './components/settings/ReportProblemScreen';
import WarningsScreen from './components/settings/WarningsScreen';
import BottomNav from './components/shared/BottomNav';
import ReportPostScreen from './components/reports/ReportPostScreen';
import SubscriptionModal from './components/subscription/SubscriptionModal';
import ChatScreen from './components/chat/ChatScreen';
import ChatListScreen from './components/chat/ChatListScreen';
import NewChatScreen from './components/chat/NewChatScreen';
import FleetManagementScreen from './components/profile/FleetManagementScreen';
import AddVehicleModal from './components/profile/AddVehicleModal';
import ConfirmationModal from './components/shared/ConfirmationModal';
import LogoutConfirmationModal from './components/shared/LogoutConfirmationModal';
import ReportChatScreen from './components/chat/ReportChatScreen';
import VoiceCallScreen from './components/voicecall/VoiceCallScreen';
import VideoCallScreen from './components/videocall/VideoCallScreen';
import CommentSheet from './components/comments/CommentSheet';
import ReplySheet from './components/comments/ReplySheet';
import SavingIndicator from './components/shared/SavingIndicator'; // Import the new component
import AddReviewModal from './components/profile/AddReviewModal';
import './App.css';

export type Screen = 'splash' | 'home' | 'history' | 'notifications' | 'search' | 'liveTracking' | 'createCargoAd' | 'createTruckAd' | 'createPost' | 'profileIndividual' | 'profileCompany' | 'editProfileCompany' | 'editProfileIndividual' | 'settings' | 'privacyPolicy' | 'aboutApp' | 'helpCenter' | 'reportProblem' | 'warnings' | 'reportPost' | 'reportProfile' | 'chat' | 'chatList' | 'newChat' | 'fleetManagement' | 'reportChat' | 'voiceCall' | 'videoCall'; // Add videoCall screen
type UserType = 'individual' | 'company';

export interface Vehicle {
    id: string;
    driverName: string;
    vehicleName: string;
    licensePlate: string;
    vehicleType: string;
    color: string;
    model: string;
    imageUrl: string | null;
    currentLocation: string;
    status?: 'متاح' | 'في العمل';
    startLocation?: string;
    destination?: string;
    progress?: number;
}

export interface Company {
  _id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
}

// Define a type for the profile cache entry to ensure type safety.
export interface CachedProfileData {
    profile: any;
    vehicles: Vehicle[];
    reviews: any[];
}

const App: React.FC = () => {
    const [activeScreen, setActiveScreen] = useState<Screen>('splash');
    const [exitingScreen, setExitingScreen] = useState<Screen | null>(null);
    const [navDirection, setNavDirection] = useState<'forward' | 'backward'>('forward');
    const [user, setUser] = useState<any>(null); // To store logged-in user data
    const [profileVersion, setProfileVersion] = useState(0);
    // Typed the profile cache state to avoid type errors when accessing its properties.
    const [profileCache, setProfileCache] = useState(() => new Map<string, CachedProfileData>());
    const [companiesCache, setCompaniesCache] = useState<Company[] | null>(null);
    const [postsVersion, setPostsVersion] = useState(0);
    
    const setScreen = (newScreen: Screen, direction: 'forward' | 'backward' = 'forward') => {
        if (newScreen === activeScreen) return;

        setNavDirection(direction);
        setExitingScreen(activeScreen);
        setActiveScreen(newScreen);

        // Clean up the exiting screen class after the animation completes
        setTimeout(() => {
            setExitingScreen(null);
        }, 400); // Should match animation duration
    };

    const getScreenClassName = (name: Screen) => {
        const isSplash = name === 'splash';
        const baseClass = isSplash ? 'splash-container' : '';

        if (name === activeScreen) {
            return `${baseClass} page-active page-enter-${navDirection}`;
        }
        if (name === exitingScreen) {
            return `${baseClass} page-exit page-exit-${navDirection}`;
        }
        return baseClass;
    };


    const [userType, setUserType] = useState<UserType>('individual'); // Default to 'company' to showcase the new profile
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [isForgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
    const [isAccountTypeModalOpen, setAccountTypeModalOpen] = useState(false);
    const [isSignUpIndividualModalOpen, setSignUpIndividualModalOpen] = useState(false);
    const [isSignUpCompanyModalOpen, setSignUpCompanyModalOpen] = useState(false);
    const [isCreateAdModalOpen, setCreateAdModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [reportedPost, setReportedPost] = useState<any | null>(null);
    const [reportedUser, setReportedUser] = useState<any | null>(null);
    const [chatTarget, setChatTarget] = useState<any | null>(null);
    const [chatOrigin, setChatOrigin] = useState<Screen>('home'); // To handle back navigation from chat
    const [reportOrigin, setReportOrigin] = useState<Screen>('home');
    const [chatReportType, setChatReportType] = useState<string>('');
    const [callTarget, setCallTarget] = useState<any | null>(null); // State for voice call target
    const [videoCallTarget, setVideoCallTarget] = useState<any | null>(null); // State for video call target

    // State for profile navigation
    const [profileTarget, setProfileTarget] = useState<any | null>(null);
    const [profileOrigin, setProfileOrigin] = useState<Screen>('home');


    // New state for ad featuring
    const [coinBalance, setCoinBalance] = useState(0); // Set to 0 to demonstrate modal opening
    const [isAdToBeFeatured, setIsAdToBeFeatured] = useState(false);

    // New state for fleet management
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [isAddVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
    const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
    const [savingState, setSavingState] = useState({ isSaving: false, messages: [] as string[] });


    // State for confirmation modal
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isLogoutConfirmModalOpen, setLogoutConfirmModalOpen] = useState(false);
    const [vehicleIdToDelete, setVehicleIdToDelete] = useState<string | null>(null);

    // State for comments and replies
    const [isCommentSheetOpen, setCommentSheetOpen] = useState(false);
    const [commentPostTarget, setCommentPostTarget] = useState<any | null>(null);
    const [isReplySheetOpen, setReplySheetOpen] = useState(false);
    const [activeCommentForReply, setActiveCommentForReply] = useState<any | null>(null);
    
    // State for Add Review Modal
    const [isAddReviewModalOpen, setAddReviewModalOpen] = useState(false);
    const [reviewTargetProfile, setReviewTargetProfile] = useState<any | null>(null);


    useEffect(() => {
        const fetchMyVehicles = async () => {
            const token = localStorage.getItem('authToken');
            if (!token || !user) {
                setFleet([]);
                return;
            }
            
            // فقط الشركات لديها أسطول
            if (userType !== 'company') {
                setFleet([]);
                return;
            }
    
            try {
                const res = await fetch(`${API_BASE_URL}/api/vehicles/my-vehicles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
    
                if (!res.ok) {
                    console.error("Failed to fetch fleet");
                    return;
                }
    
                const data = await res.json();
                const mappedVehicles: Vehicle[] = data.map((v: any) => ({
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
                setFleet(mappedVehicles);
            } catch (error) {
                console.error('Error fetching vehicles:', error);
            }
        };
    
        fetchMyVehicles();
    }, [user, userType]);


    const handleOpenCommentSheet = (post: any) => {
        setCommentPostTarget(post);
        setCommentSheetOpen(true);
    };

    const handleCloseCommentSheet = () => {
        setCommentSheetOpen(false);
    };

    const handleOpenReplySheet = (comment: any) => {
        setActiveCommentForReply(comment);
        setReplySheetOpen(true);
    };

    const handleCloseReplySheet = () => {
        setReplySheetOpen(false);
    };


    useEffect(() => {
      const validateTokenAndSetScreen = async () => {
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            // Assuming a /me endpoint exists to get current user
            const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error("Invalid token");
            }
            const userData = await res.json();
            setUser(userData.user); // Assuming user is in user property
            setUserType(userData.user.userType || 'individual');
            setActiveScreen('home');
          } catch(e) {
              localStorage.removeItem('authToken');
              setActiveScreen('splash');
          }
        } else {
            setActiveScreen('splash');
        }
        setTimeout(() => setIsInitialLoad(false), 10);
      };

      validateTokenAndSetScreen();
    }, []);

    const handleLogout = () => {
        setLogoutConfirmModalOpen(true);
    };

    const handleConfirmLogout = () => {
        setLogoutConfirmModalOpen(false);
        localStorage.removeItem('authToken');
        setUser(null);
        setProfileCache(new Map());
        setCompaniesCache(null);
        setScreen('splash', 'backward');
    };

    const handleSelectIndividual = () => {
        setAccountTypeModalOpen(false);
        setSignUpIndividualModalOpen(true);
    };

    const handleSelectCompany = () => {
        setAccountTypeModalOpen(false);
        setSignUpCompanyModalOpen(true);
    };
    
    const handleAuthSuccess = async (token: string, userId: string) => {
        // Pre-fetch and cache the user's own profile data to prevent skeleton loader on first visit.
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
    
            // Fetch profile, vehicles, and reviews in parallel
            const [profileRes, vehiclesRes, reviewsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/profile/me`, { headers }),
                fetch(`${API_BASE_URL}/api/vehicles/my-vehicles`, { headers }),
                fetch(`${API_BASE_URL}/api/reviews/${userId}`, { headers })
            ]);
    
            if (!profileRes.ok) {
                console.error("Failed to pre-fetch profile data.");
                return;
            }
    
            const newProfileData = await profileRes.json();
            const newVehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : [];
            const newReviewsData = reviewsRes.ok ? (await reviewsRes.json()).data || [] : [];
            
            const mappedVehicles: Vehicle[] = newVehiclesData.map((v: any) => ({
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
    
            const dataToCache: CachedProfileData = {
                profile: newProfileData,
                vehicles: mappedVehicles,
                reviews: newReviewsData,
            };
            
            setProfileCache(prev => new Map(prev).set('me', dataToCache));
    
        } catch (error) {
            console.error("Error pre-fetching profile data:", error);
        }
    };
    
    const handleLoginSuccess = (data: any) => {
        localStorage.setItem('authToken', data.token);
        setUser({
            _id: data._id,
            name: data.name,
            email: data.email,
            userType: data.userType
        });
        setUserType(data.userType);
        setLoginModalOpen(false);
        setScreen('home');
        handleAuthSuccess(data.token, data._id);
    };
    
    const handleSignupSuccess = (data: any) => {
        localStorage.setItem('authToken', data.token);
        setUser({
            _id: data._id,
            name: data.name,
            email: data.email,
            userType: data.userType
        });
        setUserType(data.userType);
        setSignUpIndividualModalOpen(false);
        setSignUpCompanyModalOpen(false);
        setScreen('home');
        handleAuthSuccess(data.token, data._id);
    };

    const handleOpenNotifications = () => {
        setScreen('notifications');
    };

    const handleOpenSearch = () => {
        setScreen('search');
    };
    
    const handleOpenMyProfile = (origin: Screen) => {
        setProfileTarget(null); // 'null' indicates it's the logged-in user's profile
        setProfileOrigin(origin);
        if (userType === 'individual') {
            setScreen('profileIndividual');
        } else {
            setScreen('profileCompany');
        }
    };

    const handleOpenOtherProfile = (user: any, origin: Screen) => {
        setProfileTarget(user);
        setProfileOrigin(origin);
        if (user.userType === 'individual') {
            setScreen('profileIndividual');
        } else {
            setScreen('profileCompany');
        }
    };

    const handleNavigateBackFromProfile = () => {
        setScreen(profileOrigin, 'backward');
    };


    const handleOpenSettings = () => {
        setScreen('settings');
    };
    
    const handleNavigateToHome = (direction: 'forward' | 'backward' = 'forward') => {
        setScreen('home', direction);
        if (direction === 'backward') {
            setIsAdToBeFeatured(false); // Reset featured status when navigating away from ad creation
        }
    };

    const handleNavigateToHistory = () => {
        setScreen('history');
    };
    
    const handleNavigateToLiveTracking = () => {
        setScreen('liveTracking');
    };

    const handleNavigateToProfileCompany = (refresh: boolean = false) => {
        if (refresh) {
            setProfileVersion(v => v + 1);
        }
        setScreen('profileCompany', 'backward');
    }

    const handleSelectCargoAd = () => {
        setCreateAdModalOpen(false);
        setScreen('createCargoAd');
    };

    const handleSelectTruckAd = () => {
        setCreateAdModalOpen(false);
        setScreen('createTruckAd');
    };

    const handleSelectCreatePost = () => {
        setCreateAdModalOpen(false);
        setScreen('createPost');
    };
    
    const handlePostCreated = () => {
        setPostsVersion(v => v + 1); // Trigger a refresh in HomeScreen
        handleNavigateToHome('backward');
    };

    const handleOpenEditProfile = () => {
        setScreen('editProfileCompany');
    }

    const handleOpenEditProfileIndividual = () => {
        setScreen('editProfileIndividual');
    };

    const handleOpenPrivacyPolicy = () => setScreen('privacyPolicy');
    const handleOpenAboutApp = () => setScreen('aboutApp');
    const handleOpenHelpCenter = () => setScreen('helpCenter');
    const handleOpenReportProblem = () => setScreen('reportProblem');
    const handleOpenWarnings = () => setScreen('warnings');

    const handleNavigateBackToSettings = () => {
        setScreen('settings', 'backward');
    };

    const handleOpenReportPost = (post: any, origin: Screen = 'home') => {
        setReportOrigin(origin);
        setReportedPost(post);
        setReportedUser(null);
        setScreen('reportPost');
    };
    
    const handleOpenReportProfile = (user: any, origin: Screen) => {
        setReportOrigin(origin);
        setReportedUser(user);
        setReportedPost(null);
        setScreen('reportProfile');
    };

    const handleNavigateBackFromReport = () => {
        setScreen(reportOrigin, 'backward');
    };

    const handleOpenSubscriptionModal = () => setSubscriptionModalOpen(true);

    const handleOpenChat = (user: { name: string; avatarUrl: string; }, origin: Screen) => {
        setChatTarget(user);
        setChatOrigin(origin);
        setScreen('chat');
    };
    
    const handleNavigateBackFromChat = () => {
        setScreen(chatOrigin, 'backward');
    };
    
    const handleOpenReportFromChat = (reportType: string) => {
        setChatReportType(reportType);
        setReportOrigin('chat'); // The origin is always the chat screen
        setScreen('reportChat');
    };

    const handleOpenVoiceCall = (user: { name: string; avatarUrl: string; }) => {
        setCallTarget(user);
        setScreen('voiceCall');
    };
    
    const handleEndCall = () => {
        setScreen(chatOrigin, 'backward'); // Return to wherever the call was initiated from (profile or chat)
    };
    
    const handleOpenVideoCall = (user: { name: string; avatarUrl: string; }) => {
        setVideoCallTarget(user);
        setScreen('videoCall');
    };

    const handleEndVideoCall = () => {
        setScreen(chatOrigin, 'backward'); // Return to wherever the call was initiated from (profile or chat)
    };

    const handleOpenChatList = () => {
        setScreen('chatList');
    };
    
    const handleOpenNewChat = () => {
        setScreen('newChat');
    };

    const handleOpenChatFromNew = (user: { name: string; avatarUrl: string; }) => {
        // When starting a chat from the "explore companies" screen, the origin for backing out
        // should be the explore screen itself.
        handleOpenChat(user, 'newChat');
    };

    const handleOpenFleetManagement = () => {
        setScreen('fleetManagement');
    };
    
    const handleOpenAddVehicle = () => {
        setVehicleToEdit(null);
        setAddVehicleModalOpen(true);
    };

    const handleOpenEditVehicle = (vehicle: Vehicle) => {
        setVehicleToEdit(vehicle);
        setAddVehicleModalOpen(true);
    };
    
    const handleDeleteVehicle = (vehicleId: string) => {
        setVehicleIdToDelete(vehicleId);
        setConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        setConfirmModalOpen(false);
    
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }
    
        if (vehicleIdToDelete === null) return;
    
        let deleteSuccess = false;
    
        setSavingState({ 
            isSaving: true, 
            messages: ["جاري الحذف...", "تحديث بيانات الأسطول", "لحظة من فضلك..."],
        });
    
        try {
            const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
    
            if (!res.ok) {
                throw new Error('فشل في حذف المركبة.');
            }
            
            const deletedId = vehicleIdToDelete;
            setFleet(prevFleet => prevFleet.filter(v => v.id !== deletedId));
    
            setProfileCache(prevCache => {
                const newCache = new Map(prevCache);
                const myProfileCache = newCache.get('me');
                if (myProfileCache) {
                    const typedMyProfileCache = myProfileCache as CachedProfileData;
                    const updatedVehicles = typedMyProfileCache.vehicles.filter((v: Vehicle) => v.id !== deletedId);
                    const updatedProfileData = { ...typedMyProfileCache, vehicles: updatedVehicles };
                    newCache.set('me', updatedProfileData);
                }
                return newCache;
            });
            
            deleteSuccess = true;
            
        } catch(e: any) {
            console.error("Error deleting vehicle:", e);
            alert(e.message || 'حدث خطأ ما.');
        } finally {
            if (deleteSuccess) {
                handleNavigateToProfileCompany(false);
                // Delay hiding to cover screen transition
                setTimeout(() => {
                    setSavingState({ isSaving: false, messages: [] });
                    setVehicleIdToDelete(null);
                }, 500);
            } else {
                // Hide immediately on failure
                setSavingState({ isSaving: false, messages: [] });
                setVehicleIdToDelete(null);
            }
        }
    };
    
    const handleSaveVehicle = async (vehicleData: any) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }
    
        setAddVehicleModalOpen(false);
        setSavingState({
            isSaving: true,
            messages: ["جاري الحفظ...", "نعزز أسطولك الآن", "نقوي بنيتك"],
        });
    
        try {
            let finalVehicleData = { ...vehicleData };
    
            // Handle image upload if a new image (base64) is present
            if (finalVehicleData.imageUrl && finalVehicleData.imageUrl.startsWith('data:')) {
                const blob = await fetch(finalVehicleData.imageUrl).then(res => res.blob());
                const formData = new FormData();
                formData.append('file', blob);
    
                const uploadRes = await fetch(`${API_BASE_URL}/api/upload/single`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
    
                if (!uploadRes.ok) throw new Error('فشل في تحميل صورة المركبة.');
    
                const uploadData = await uploadRes.json();
                finalVehicleData.imageUrl = uploadData.filePath; // Replace base64 with Cloudinary URL
            }
    
            let finalVehicle: Vehicle;
    
            if (vehicleToEdit) {
                const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleToEdit.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(finalVehicleData),
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'فشل في تحديث المركبة');
                }
                const savedData = await res.json();
                finalVehicle = {
                    id: savedData._id,
                    status: savedData.status || 'متاح',
                    driverName: savedData.driverName,
                    vehicleName: savedData.vehicleName,
                    licensePlate: savedData.licensePlate,
                    imageUrl: savedData.imageUrl,
                    vehicleType: savedData.vehicleType,
                    currentLocation: savedData.currentLocation,
                    color: savedData.vehicleColor,
                    model: savedData.vehicleModel,
                };
                setFleet(prevFleet => prevFleet.map(v => (v.id === vehicleToEdit.id ? finalVehicle : v)));
            } else {
                const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(finalVehicleData),
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'فشل في إضافة المركبة');
                }
                const savedVehicle = await res.json();
                finalVehicle = {
                    id: savedVehicle._id,
                    status: savedVehicle.status || 'متاح',
                    driverName: savedVehicle.driverName,
                    vehicleName: savedVehicle.vehicleName,
                    licensePlate: savedVehicle.licensePlate,
                    imageUrl: savedVehicle.imageUrl,
                    vehicleType: savedVehicle.vehicleType,
                    currentLocation: savedVehicle.currentLocation,
                    color: savedVehicle.vehicleColor,
                    model: savedVehicle.vehicleModel,
                };
                setFleet(prevFleet => [...prevFleet, finalVehicle]);
            }
    
            // Manually update profile cache to prevent skeleton loader for a seamless experience
            setProfileCache(prevCache => {
                const newCache = new Map(prevCache);
                const myProfileCache = newCache.get('me');
                if (myProfileCache) {
                    const typedMyProfileCache = myProfileCache as CachedProfileData;
                    const updatedVehicles = vehicleToEdit
                        ? typedMyProfileCache.vehicles.map((v: Vehicle) => (v.id === vehicleToEdit.id ? finalVehicle : v))
                        : [...typedMyProfileCache.vehicles, finalVehicle];
    
                    const updatedProfileData = { ...typedMyProfileCache, vehicles: updatedVehicles };
                    newCache.set('me', updatedProfileData);
                }
                return newCache;
            });
    
            setVehicleToEdit(null);
            setSavingState({ isSaving: false, messages: [] });
            handleNavigateToProfileCompany(false); // Navigate WITHOUT triggering a refresh
    
        } catch (error: any) {
            console.error('Error saving vehicle:', error);
            alert(error.message || 'حدث خطأ أثناء حفظ المركبة');
            setSavingState({ isSaving: false, messages: [] });
        }
    };
    

    const handleUpdateProfile = async (profilePayload: any) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }
    
        setSavingState({
            isSaving: true,
            messages: ["يرجى الانتظار...", "نقوم بتحديث هويتك الرقمية", "نجعل ملفك أكثر جاذبية"],
        });
    
        let updateSuccess = false;
        let finalPayload = { ...profilePayload };
    
        try {
            const uploadFile = async (base64Data: string) => {
                const blob = await fetch(base64Data).then((res) => res.blob());
                const formData = new FormData();
                formData.append('file', blob);
                const res = await fetch(`${API_BASE_URL}/api/upload/single`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                if (!res.ok) throw new Error('فشل تحميل الملف.');
                const data = await res.json();
                return data.filePath;
            };
    
            if (finalPayload.avatar && finalPayload.avatar.startsWith('data:')) {
                finalPayload.avatar = await uploadFile(finalPayload.avatar);
            }
    
            if (finalPayload.coverImage && finalPayload.coverImage.startsWith('data:')) {
                finalPayload.coverImage = await uploadFile(finalPayload.coverImage);
            }
    
            if (finalPayload.fleetImages && Array.isArray(finalPayload.fleetImages)) {
                const newImagesBase64 = finalPayload.fleetImages.filter((img: string) => img.startsWith('data:'));
                const existingImageUrls = finalPayload.fleetImages.filter((img: string) => !img.startsWith('data:'));
    
                if (newImagesBase64.length > 0) {
                    const fleetFormData = new FormData();
                    const blobs = await Promise.all(newImagesBase64.map(b64 => fetch(b64).then(res => res.blob())));
                    blobs.forEach(blob => {
                        fleetFormData.append('files', blob);
                    });
    
                    const fleetRes = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: fleetFormData,
                    });
    
                    if (!fleetRes.ok) throw new Error('فشل في تحميل صور الأسطول.');
    
                    const fleetUploadData = await fleetRes.json();
                    const newUrls = fleetUploadData.map((f: any) => f.filePath);
                    finalPayload.fleetImages = [...existingImageUrls, ...newUrls];
                }
            }
    
            const res = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(finalPayload),
            });
    
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'فشل في تحديث الملف الشخصي.');
            }
    
            const updatedProfileData = await res.json();
    
            setProfileCache(prevCache => {
                const newCache = new Map(prevCache);
                const myProfileCache = newCache.get('me');
                if (myProfileCache) {
                    const typedMyProfileCache = myProfileCache as CachedProfileData;
                    const newCachedData = {
                        ...typedMyProfileCache,
                        profile: { ...typedMyProfileCache.profile, ...updatedProfileData },
                    };
                    newCache.set('me', newCachedData);
                } else {
                    newCache.set('me', { profile: updatedProfileData, vehicles: [], reviews: [] });
                }
                return newCache;
            });
    
            updateSuccess = true;
    
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(error.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
        } finally {
            if (updateSuccess) {
                handleNavigateToProfileCompany(false);
                setTimeout(() => {
                    setSavingState({ isSaving: false, messages: [] });
                }, 500);
            } else {
                setSavingState({ isSaving: false, messages: [] });
            }
        }
    };
    
    const handleUpdateIndividualProfile = async (profilePayload: any) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        setSavingState({ isSaving: true, messages: ["جاري حفظ التغييرات..."] });

        let updateSuccess = false;
        let finalPayload = { ...profilePayload };

        try {
            if (finalPayload.avatar && finalPayload.avatar.startsWith('data:')) {
                const blob = await fetch(finalPayload.avatar).then((res) => res.blob());
                const formData = new FormData();
                formData.append('file', blob);
                const res = await fetch(`${API_BASE_URL}/api/upload/single`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                if (!res.ok) throw new Error('فشل تحميل صورة الملف الشخصي.');
                const data = await res.json();
                finalPayload.avatar = data.filePath;
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(finalPayload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'فشل في تحديث الملف الشخصي.');
            }
            
            const updatedProfileData = await res.json();

            setProfileCache(prevCache => {
                const newCache = new Map(prevCache);
                const myProfileCache = newCache.get('me');
                if (myProfileCache) {
                    const typedMyProfileCache = myProfileCache as CachedProfileData;
                    const newCachedData = {
                        ...typedMyProfileCache,
                        profile: { ...typedMyProfileCache.profile, ...updatedProfileData },
                    };
                    newCache.set('me', newCachedData);
                } else {
                    newCache.set('me', { profile: updatedProfileData, vehicles: [], reviews: [] });
                }
                return newCache;
            });
            
            updateSuccess = true;

        } catch (error: any) {
            console.error('Error updating individual profile:', error);
            alert(error.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
        } finally {
            if (updateSuccess) {
                setScreen('profileIndividual', 'backward');
                setTimeout(() => {
                    setSavingState({ isSaving: false, messages: [] });
                }, 500); // Delay to allow screen transition
            } else {
                setSavingState({ isSaving: false, messages: [] });
            }
        }
    };


    const handleCloseVehicleModal = () => {
        setAddVehicleModalOpen(false);
        setVehicleToEdit(null);
    };

    const handleOpenAddReviewModal = (profile: any) => {
        setReviewTargetProfile(profile);
        setAddReviewModalOpen(true);
    };

    const handleCloseAddReviewModal = () => {
        setAddReviewModalOpen(false);
    };
    
    const handleReviewAdded = (newReview: any) => {
        const profileId = reviewTargetProfile?._id;
        if (!profileId || !newReview) {
            handleCloseAddReviewModal();
            return;
        }

        // Optimistically update the cache instead of invalidating it
        setProfileCache(prev => {
            const newCache = new Map(prev);
            const cachedData = newCache.get(profileId) as CachedProfileData | undefined;
            
            if (cachedData) {
                // Add the new review to the beginning of the list
                const updatedReviews = [newReview, ...cachedData.reviews];
                
                // Also update the review count and rating on the profile for immediate feedback
                const newReviewCount = (cachedData.profile.reviewCount || 0) + 1;
                const totalRating = (cachedData.profile.rating || 0) * (cachedData.profile.reviewCount || 0);
                const newAverageRating = (totalRating + newReview.rating) / newReviewCount;

                const updatedProfile = {
                    ...cachedData.profile,
                    reviewCount: newReviewCount,
                    rating: newAverageRating,
                };
                
                const updatedProfileData = { ...cachedData, profile: updatedProfile, reviews: updatedReviews };
                newCache.set(profileId, updatedProfileData);
            }
            return newCache;
        });
        
        handleCloseAddReviewModal();
        setReviewTargetProfile(null);
    };


    const screensWithBottomNav: Screen[] = ['home', 'history', 'liveTracking', 'settings'];

    return (
        <div className={`app-wrapper ${isInitialLoad ? 'initial-load' : ''}`}>
            {savingState.isSaving && <SavingIndicator messages={savingState.messages} />}
            <SplashScreen
                className={getScreenClassName('splash')}
                onOpenAccountTypeModal={() => setAccountTypeModalOpen(true)}
                onOpenLoginModal={() => setLoginModalOpen(true)}
                onOpenForgotPasswordModal={() => setForgotPasswordModalOpen(true)}
            />
            <HomeScreen
                className={getScreenClassName('home')}
                onOpenNotifications={handleOpenNotifications}
                onOpenSearch={handleOpenSearch}
                onOpenCreateAdModal={() => setCreateAdModalOpen(true)}
                onOpenReportPost={(post) => handleOpenReportPost(post, 'home')}
                onOpenMyProfile={() => handleOpenMyProfile('home')}
                onOpenOtherProfile={(user) => handleOpenOtherProfile(user, 'home')}
                onOpenChat={(user) => handleOpenChat(user, 'home')}
                onOpenChatList={handleOpenChatList}
                onOpenCommentSheet={handleOpenCommentSheet}
                companiesCache={companiesCache}
                setCompaniesCache={setCompaniesCache}
                user={user}
                postsVersion={postsVersion}
            />
             <HistoryScreen
                className={getScreenClassName('history')}
            />
            <LiveTrackingScreen
                className={getScreenClassName('liveTracking')}
            />
            <NotificationsScreen
                className={getScreenClassName('notifications')}
                onNavigateBack={() => handleNavigateToHome('backward')}
            />
             <SearchScreen
                className={getScreenClassName('search')}
                onNavigateBack={() => handleNavigateToHome('backward')}
            />
             <CreateCargoAdScreen
                className={getScreenClassName('createCargoAd')}
                onNavigateBack={() => handleNavigateToHome('backward')}
                coinBalance={coinBalance}
                isAdToBeFeatured={isAdToBeFeatured}
                setIsAdToBeFeatured={setIsAdToBeFeatured}
                onOpenSubscriptionModal={handleOpenSubscriptionModal}
            />
            <CreateTruckAdScreen
                className={getScreenClassName('createTruckAd')}
                onNavigateBack={() => handleNavigateToHome('backward')}
                coinBalance={coinBalance}
                isAdToBeFeatured={isAdToBeFeatured}
                setIsAdToBeFeatured={setIsAdToBeFeatured}
                onOpenSubscriptionModal={handleOpenSubscriptionModal}
            />
            <CreatePostScreen
                className={getScreenClassName('createPost')}
                onNavigateBack={() => handleNavigateToHome('backward')}
                onPostCreated={handlePostCreated}
                setSavingState={setSavingState}
                user={user}
            />
            <ProfileIndividualScreen
                className={getScreenClassName('profileIndividual')}
                onNavigateBack={handleNavigateBackFromProfile}
                onLogout={handleLogout}
                onOpenEditProfile={handleOpenEditProfileIndividual}
                profileCache={profileCache}
                setProfileCache={setProfileCache}
                profileData={profileTarget}
                onOpenChat={(user) => handleOpenChat(user, 'profileIndividual')}
                onOpenVoiceCall={handleOpenVoiceCall}
                onOpenVideoCall={handleOpenVideoCall}
                onOpenReportProfile={(user) => handleOpenReportProfile(user, 'profileIndividual')}
                profileOrigin={profileOrigin}
            />
            <ProfileCompanyScreen
                key={profileTarget?._id || user?._id || 'me-logged-out'}
                className={getScreenClassName('profileCompany')}
                onNavigateBack={handleNavigateBackFromProfile}
                onEditProfile={handleOpenEditProfile}
                onLogout={handleLogout}
                onOpenReportPost={(post) => handleOpenReportPost(post, 'profileCompany')}
                onOpenReportProfile={(user) => handleOpenReportProfile(user, 'profileCompany')}
                onOpenChat={() => handleOpenChat(profileTarget, 'profileCompany')}
                onOpenVoiceCall={() => handleOpenVoiceCall(profileTarget)}
                onOpenVideoCall={() => handleOpenVideoCall(profileTarget)}
                onOpenFleetManagement={handleOpenFleetManagement}
                onOpenAddReviewModal={handleOpenAddReviewModal}
                profileData={profileTarget}
                profileOrigin={profileOrigin}
                profileVersion={profileVersion}
                profileCache={profileCache}
                setProfileCache={setProfileCache}
            />
            <EditProfileCompanyScreen
                className={getScreenClassName('editProfileCompany')}
                onNavigateBack={handleNavigateToProfileCompany}
                setSavingState={setSavingState}
                onSave={handleUpdateProfile}
                profileCache={profileCache}
            />
            <EditProfileIndividualScreen
                className={getScreenClassName('editProfileIndividual')}
                onNavigateBack={() => setScreen('profileIndividual', 'backward')}
                onSave={handleUpdateIndividualProfile}
                profileCache={profileCache}
            />
             <FleetManagementScreen
                className={getScreenClassName('fleetManagement')}
                onNavigateBack={() => handleNavigateToProfileCompany()}
                fleet={fleet}
                onOpenAddVehicleModal={handleOpenAddVehicle}
                onEditVehicle={handleOpenEditVehicle}
                onDeleteVehicle={handleDeleteVehicle}
            />
            <SettingsScreen
                className={getScreenClassName('settings')}
                onNavigateBack={() => handleNavigateToHome('backward')}
                onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
                onOpenAboutApp={handleOpenAboutApp}
                onOpenHelpCenter={handleOpenHelpCenter}
                onOpenReportProblem={handleOpenReportProblem}
                onOpenWarnings={handleOpenWarnings}
                onOpenSubscriptionModal={handleOpenSubscriptionModal}
            />
            <PrivacyPolicyScreen
                className={getScreenClassName('privacyPolicy')}
                onNavigateBack={handleNavigateBackToSettings}
            />
            <AboutAppScreen
                className={getScreenClassName('aboutApp')}
                onNavigateBack={handleNavigateBackToSettings}
            />
            <HelpCenterScreen
                className={getScreenClassName('helpCenter')}
                onNavigateBack={handleNavigateBackToSettings}
            />
             <ReportProblemScreen
                className={getScreenClassName('reportProblem')}
                onNavigateBack={handleNavigateBackToSettings}
            />
            <WarningsScreen
                className={getScreenClassName('warnings')}
                onNavigateBack={handleNavigateBackToSettings}
            />
            <ReportPostScreen
                className={getScreenClassName(reportedPost ? 'reportPost' : 'reportProfile')}
                onNavigateBack={handleNavigateBackFromReport}
                post={reportedPost}
                user={reportedUser}
            />
            <ChatScreen
                className={getScreenClassName('chat')}
                user={chatTarget}
                onNavigateBack={handleNavigateBackFromChat}
                onOpenProfile={(user) => handleOpenOtherProfile(user, 'chat')}
                onOpenReportFromChat={handleOpenReportFromChat}
                onOpenVoiceCall={() => handleOpenVoiceCall(chatTarget)}
                onOpenVideoCall={() => handleOpenVideoCall(chatTarget)}
                chatOrigin={chatOrigin}
            />
             <ChatListScreen
                className={getScreenClassName('chatList')}
                onNavigateBack={() => handleNavigateToHome('backward')}
                onOpenNewChat={handleOpenNewChat}
                onOpenChat={(user) => handleOpenChat(user, 'chatList')}
            />
            <NewChatScreen
                className={getScreenClassName('newChat')}
                onNavigateBack={handleOpenChatList}
                onOpenChat={handleOpenChatFromNew}
            />
             <ReportChatScreen
                className={getScreenClassName('reportChat')}
                onNavigateBack={handleNavigateBackFromReport}
                reportType={chatReportType}
                user={chatTarget}
            />
            <VoiceCallScreen 
                className={getScreenClassName('voiceCall')}
                user={callTarget}
                onEndCall={handleEndCall}
            />
            <VideoCallScreen 
                className={getScreenClassName('videoCall')}
                user={videoCallTarget}
                onEndCall={handleEndVideoCall}
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
            <ForgotPasswordModal
                isOpen={isForgotPasswordModalOpen}
                onClose={() => setForgotPasswordModalOpen(false)}
            />
            <AccountTypeSelectionModal
                isOpen={isAccountTypeModalOpen}
                onClose={() => setAccountTypeModalOpen(false)}
                onSelectIndividual={handleSelectIndividual}
                onSelectCompany={handleSelectCompany}
            />
             <SignUpIndividualModal
                isOpen={isSignUpIndividualModalOpen}
                onClose={() => setSignUpIndividualModalOpen(false)}
                onSignupSuccess={handleSignupSuccess}
            />
            <SignUpCompanyModal
                isOpen={isSignUpCompanyModalOpen}
                onClose={() => setSignUpCompanyModalOpen(false)}
                onSignupSuccess={handleSignupSuccess}
            />
             <CreateAdModal
                isOpen={isCreateAdModalOpen}
                onClose={() => setCreateAdModalOpen(false)}
                onSelectCargo={handleSelectCargoAd}
                onSelectTruck={handleSelectTruckAd}
                onSelectPost={handleSelectCreatePost}
            />
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setSubscriptionModalOpen(false)}
            />
            <AddVehicleModal
                isOpen={isAddVehicleModalOpen}
                onClose={handleCloseVehicleModal}
                onSaveVehicle={handleSaveVehicle}
                vehicleToEdit={vehicleToEdit}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من رغبتك في حذف هذه المركبة؟ لا يمكن التراجع عن هذا الإجراء."
                confirmButtonText="نعم، احذف"
            />
             <LogoutConfirmationModal 
                isOpen={isLogoutConfirmModalOpen}
                onClose={() => setLogoutConfirmModalOpen(false)}
                onConfirm={handleConfirmLogout}
            />
            
            <CommentSheet 
                isOpen={isCommentSheetOpen}
                onClose={handleCloseCommentSheet}
                post={commentPostTarget}
                onOpenReplySheet={handleOpenReplySheet}
            />
            <ReplySheet 
                isOpen={isReplySheetOpen}
                onClose={handleCloseReplySheet}
                comment={activeCommentForReply}
            />
            
            <AddReviewModal 
                isOpen={isAddReviewModalOpen} 
                onClose={handleCloseAddReviewModal}
                profileId={reviewTargetProfile?._id}
                onReviewAdded={handleReviewAdded}
            />

            {screensWithBottomNav.includes(activeScreen) && (
                <BottomNav
                    activeScreen={activeScreen}
                    onNavigateHome={() => handleNavigateToHome('forward')}
                    onNavigateHistory={handleNavigateToHistory}
                    onNavigateLiveTracking={handleNavigateToLiveTracking}
                    onOpenSettings={handleOpenSettings}
                />
            )}
        </div>
    );
};

export default App;
