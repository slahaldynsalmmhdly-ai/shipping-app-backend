import React, { useState, useEffect } from 'react';
import './VoiceCallScreen.css';

interface VoiceCallScreenProps {
  className?: string;
  user: { name: string; avatarUrl: string; } | null;
  onEndCall: () => void;
}

const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({ className, user, onEndCall }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isCallConnected, setIsCallConnected] = useState(false);

  // States for toggling controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const isActive = className?.includes('page-active');

  // Effect to reset state and manage connection when the screen becomes active
  useEffect(() => {
    let connectTimeout: number | undefined;

    if (isActive) {
      // Reset all states for a new call
      setCallDuration(0);
      setIsCallConnected(false);
      setIsMuted(false);
      setIsSpeakerOn(false);
      setIsRecording(false);
      
      // Simulate connection delay
      connectTimeout = setTimeout(() => {
        setIsCallConnected(true);
      }, 2000);
    } else {
        // If screen is not active, ensure connection is false and timers are potentially cleared
        setIsCallConnected(false);
    }
    
    // Cleanup on unmount or when isActive changes
    return () => {
      clearTimeout(connectTimeout);
    };
  }, [isActive]);


  // Timer effect, runs only when call is connected and screen is active
  useEffect(() => {
    let intervalId: number | undefined;
    if (isCallConnected && isActive) {
      intervalId = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    // Cleanup function to clear interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isCallConnected, isActive]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (!user) return null;
  
  // Define a robust slash path for muted state to prevent rendering issues
  const slashPath = "M4.71 3.29a1 1 0 0 0-1.42 1.42l16 16a1 1 0 0 0 1.42-1.42L4.71 3.29z";


  return (
    <div className={`app-container voice-call-container ${className || ''}`}>
      <main className="app-content voice-call-content">
        <div className="caller-info">
          <div className="avatar-animation-wrapper">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
            <img src={user.avatarUrl} alt={user.name} className="caller-avatar" />
          </div>
          <h1 className="caller-name">{user.name}</h1>
          <p className="call-status">
            {isCallConnected ? formatTime(callDuration) : 'جارٍ الاتصال...'}
          </p>
        </div>

        <div className="call-controls">
          <button className={`control-btn ${isMuted ? 'active' : ''}`} onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <g fillOpacity={isMuted ? 0.5 : 1}>
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.75 6.75 0 11-13.5 0v-1.5a.75.75 0 01.75-.75z" />
              </g>
              {isMuted && <path d={slashPath} />}
            </svg>
          </button>
          <button className={`control-btn ${isSpeakerOn ? 'active' : ''}`} onClick={() => setIsSpeakerOn(!isSpeakerOn)} aria-label={isSpeakerOn ? "إيقاف مكبر الصوت" : "تشغيل مكبر الصوت"}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
               <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
             </svg>
          </button>
           <button className={`control-btn ${isRecording ? 'active record-active' : ''}`} onClick={() => setIsRecording(!isRecording)} aria-label={isRecording ? "إيقاف التسجيل" : "بدء التسجيل"}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
              {isRecording && <circle cx="12" cy="12" r="4" fill="currentColor" />}
            </svg>
          </button>
          <button className="control-btn end-call-btn" onClick={onEndCall} aria-label="إنهاء المكالمة">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
               <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
             </svg>
          </button>
        </div>
      </main>
    </div>
  );
};

export default VoiceCallScreen;