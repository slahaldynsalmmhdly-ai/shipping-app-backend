import React from 'react';
import './LiveTrackingScreen.css';

const LiveTrackingScreen: React.FC<{ className?: string; }> = ({ className }) => {
  return (
    <div className={`app-container tracking-container ${className || ''}`}>
      <header className="tracking-header">
        <h1>تتبع مباشر</h1>
      </header>
      <main className="app-content tracking-content">
        <div className="map-placeholder">
          {/* Using OpenStreetMap via an iframe for a free map solution */}
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src="https://www.openstreetmap.org/export/embed.html?bbox=46.60278320312501%2C24.62261208061327%2C46.84082031250001%2C24.78310030588665&layer=mapnik"
            style={{ border: 'none' }}
            title="Live Tracking Map"
            aria-label="Live Tracking Map"
          ></iframe>
        </div>
        <div className="tracking-info-panel">
            <p>يتم الآن تتبع الشحنة رقم #12345...</p>
            <span>من: الرياض | إلى: جدة</span>
        </div>
      </main>
    </div>
  );
};

export default LiveTrackingScreen;
