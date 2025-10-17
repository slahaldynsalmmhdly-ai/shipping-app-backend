import React from 'react';
import './FleetVehicleCard.css';
import type { Vehicle } from '../../App';

const TruckIconProgress: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.92,8.01H17V7c0-1.65-1.35-3-3-3h-4c-1.65,0-3,1.35-3,3v1H5.08c-1.1,0-2,0.9-2,2v5.11c0,0.55,0.45,1,1,1h1.45 c0.45,0.83,1.29,1.4,2.27,1.4s1.82-0.57,2.27-1.4h4.9c0.45,0.83,1.29,1.4,2.27,1.4s1.82-0.57,2.27-1.4H20c0.55,0,1-0.45,1-1 V10.01C20.92,8.91,20.02,8.01,18.92,8.01z M8.5,7c0-0.83,0.67-1.5,1.5-1.5h4c0.83,0,1.5,0.67,1.5,1.5v1H8.5V7z M7.73,16.5 C7.09,16.5,6.58,16.01,6.54,15.38C6.5,14.74,7,14.23,7.63,14.19c0.63-0.04,1.14,0.46,1.18,1.09C8.85,15.91,8.34,16.5,7.73,16.5z M17.73,16.5c-0.61,0-1.12-0.59-1.08-1.22c0.04-0.63,0.55-1.14,1.18-1.1c0.63,0.04,1.14,0.55,1.1,1.18 C18.88,16.01,18.37,16.5,17.73,16.5z"/>
    </svg>
);


const FleetVehicleCard: React.FC<{ vehicle: Vehicle; onOpenChat: () => void; }> = ({ vehicle, onOpenChat }) => {
    const { status, vehicleName, driverName, licensePlate, imageUrl, currentLocation, startLocation, destination, progress, color, model, vehicleType } = vehicle;
    const defaultImageUrl = `https://ui-avatars.com/api/?name=${vehicleName.charAt(0)}&background=bdc3c7&color=fff&size=60`;

    return (
        <div className="fleet-vehicle-card">
            <header className="vehicle-card-header">
                <img src={imageUrl || defaultImageUrl} alt={vehicleName} className="vehicle-card-avatar" />
                <div className="vehicle-card-driver-info">
                    <h4>{driverName}</h4>
                    <p>{licensePlate}</p>
                </div>
                <button className="vehicle-card-chat-btn" onClick={onOpenChat} aria-label="بدء الدردشة">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
            </header>

            <main className="vehicle-card-body">
                <div className="vehicle-main-details">
                    <p className="vehicle-info-line">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
                        </svg>
                        {vehicleName} - {vehicleType}
                    </p>
                    <p className="vehicle-info-line">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                        </svg>
                        {model} - {color}
                    </p>
                </div>

                {status === 'في العمل' && startLocation && destination && typeof progress !== 'undefined' ? (
                    <div className="vehicle-status-tracker">
                        <div className="location-point start">{startLocation}</div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            <div className="truck-icon-progress" style={{ right: `calc(${progress}% - 8px)` }}>
                                <TruckIconProgress />
                            </div>
                        </div>
                        <div className="location-point end">{destination}</div>
                    </div>
                ) : (
                    <div className="vehicle-status-available">
                        <div className="available-location">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.223.654-.369.254-.145.546-.32.84-.523.295-.203.618-.45.945-.737.327-.287.666-.612.988-.962a10 10 0 002.33-4.475 8 8 0 10-16 0 10 10 0 002.33 4.475c.322.35.66.675.988.962.327.287.65.534.945.737.294.203.586.378.84.523.254-.146.468.269.654.369a5.741 5.741 0 00.281.14l.018.008.006.003zM10 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
                            </svg>
                            <span>متواجد في: <strong>{currentLocation}</strong></span>
                        </div>
                        <span className={`status-badge ${status === 'في العمل' ? 'busy' : 'available'}`}>
                            {status || 'متاح'}
                        </span>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FleetVehicleCard;