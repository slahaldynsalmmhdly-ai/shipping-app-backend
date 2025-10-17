import React, { useState, useEffect } from 'react';
import './VideoCallScreen.css';

interface VideoCallScreenProps {
  className?: string;
  user: { name: string; avatarUrl: string; } | null;
  onEndCall: () => void;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({ className, user, onEndCall }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const isActive = className?.includes('page-active');

  // Effect to manage call connection and state reset
  useEffect(() => {
    let connectTimeout: number | undefined;
    if (isActive) {
      setIsCallConnected(false);
      setCallDuration(0);
      connectTimeout = setTimeout(() => {
        setIsCallConnected(true);
      }, 2000); // Simulate connection delay
    }
    return () => clearTimeout(connectTimeout);
  }, [isActive]);

  // Timer effect for call duration
  useEffect(() => {
    let intervalId: number | undefined;
    if (isCallConnected && isActive) {
      intervalId = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isCallConnected, isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (!user) return null;

  return (
    <div className={`app-container video-call-container ${className || ''}`}>
      <img src={user.avatarUrl} alt="Caller background" className="video-background-blurry" />
      <div className="video-overlay"></div>
      
      <header className="video-call-header">
        <div className="caller-info-top">
          <h3>{user.name}</h3>
          <p>{isCallConnected ? formatTime(callDuration) : 'جارٍ الاتصال...'}</p>
        </div>
      </header>

      <main className="app-content video-call-content">
        <div className="self-view-pip">
          <img src="https://ui-avatars.com/api/?name=You&background=8e44ad&color=fff&size=128" alt="Self view" className="self-view-image" />
          {isCameraOff && (
             <div className="camera-off-overlay">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 001.06-1.06l-18-18zM20.25 10.5c0-1.036-.84-1.875-1.875-1.875h-1.358c-.161 0-.317.035-.465.1l-2.733 1.64a.75.75 0 00-.267.59v1.336l-3.413-3.413a3 3 0 00-4.242 0L.964 12.98a.75.75 0 001.06 1.061l1.41-1.41a1.5 1.5 0 012.121 0l2.364 2.364 2.22-2.22a.75.75 0 00-1.06-1.061l-1.114 1.113-1.642-1.642a.75.75 0 00-1.06 1.06l4.08 4.08-1.02 1.02a.75.75 0 001.06 1.06l1.02-1.02 4.103 4.104a.75.75 0 001.06-1.06l-4.103-4.104 1.113-1.113a.75.75 0 00-1.06-1.06l-2.221 2.22 2.016-2.016a.75.75 0 00-.267-.59L17.017 12h1.358c1.035 0 1.875-.84 1.875-1.875z" /></svg>
            </div>
          )}
        </div>
      </main>

      <footer className="video-controls-footer">
        <button className={`video-control-btn ${isMuted ? 'active' : ''}`} onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
        </button>
        <button className={`video-control-btn ${!isSpeakerOn ? 'active' : ''}`} onClick={() => setIsSpeakerOn(!isSpeakerOn)} aria-label={isSpeakerOn ? "إيقاف مكبر الصوت" : "تشغيل مكبر الصوت"}>
            {isSpeakerOn ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
            ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
            )}
        </button>
         <button className={`video-control-btn ${isCameraOff ? 'active' : ''}`} onClick={() => setIsCameraOff(!isCameraOff)} aria-label={isCameraOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
            </svg>
        </button>
        <button className="video-control-btn end-call-btn" onClick={onEndCall} aria-label="إنهاء المكالمة">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
           </svg>
        </button>
      </footer>
    </div>
  );
};

export default VideoCallScreen;