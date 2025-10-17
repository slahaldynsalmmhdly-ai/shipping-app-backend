import React, { useState, useEffect } from 'react';
import MediaUpload from '../shared/MediaUpload';
import './Ads.css';

interface CreateTruckAdScreenProps {
  className?: string;
  onNavigateBack: () => void;
  coinBalance: number;
  isAdToBeFeatured: boolean;
  setIsAdToBeFeatured: (value: React.SetStateAction<boolean>) => void;
  onOpenSubscriptionModal: () => void;
}

const CreateTruckAdScreen: React.FC<CreateTruckAdScreenProps> = ({ className, onNavigateBack, coinBalance, isAdToBeFeatured, setIsAdToBeFeatured, onOpenSubscriptionModal }) => {
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [truckType, setTruckType] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const isValid = currentLocation.trim() !== '' &&
                    truckType.trim() !== '' &&
                    availableDate.trim() !== '';
    setIsFormValid(isValid);
  }, [currentLocation, truckType, availableDate]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    // Handle truck ad creation logic, now including featured status
    console.log("Truck Ad Submitted", { featured: isAdToBeFeatured });
    onNavigateBack(); // Go back to home
  };

  const handleFeatureAdClick = () => {
    if (coinBalance > 0) {
      setIsAdToBeFeatured(prev => !prev);
    } else {
      onOpenSubscriptionModal();
    }
  };

  return (
    <div className={`app-container ad-creation-container ${className || ''}`}>
      <form className="ad-creation-form-wrapper" onSubmit={handleFormSubmit} id="create-truck-ad-form">
        <header className="ad-creation-header">
          <button type="button" onClick={onNavigateBack} className="ad-header-btn back-btn" aria-label="الرجوع">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1>إعلان عن شاحنة فارغة</h1>
           <div className="header-actions-group">
            <button type="button" onClick={handleFeatureAdClick} className={`ad-header-btn feature-ad-btn ${isAdToBeFeatured ? 'active' : ''}`} aria-label="تمييز الإعلان">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.868 2.884c.321-.772 1.305-.772 1.626 0l1.838 4.445 4.904.712c.852.124 1.191 1.174.574 1.773l-3.549 3.458.839 4.884c.146.848-.744 1.497-1.502.999L10 16.549l-4.37 2.3a1.002 1.002 0 01-1.502-1l.839-4.884-3.55-3.458c-.617-.6-.278-1.649.574-1.773l4.904-.712 1.838-4.445z" clipRule="evenodd" />
                </svg>
                <span>تمييز</span>
            </button>
            <button type="submit" form="create-truck-ad-form" className="ad-header-btn send-btn" disabled={!isFormValid} aria-label="نشر الإعلان">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </header>
        <main className="app-content">
          <div className="ad-creation-form">
            <MediaUpload mediaPreview={mediaPreview} setMediaPreview={setMediaPreview} />
            
            <div className="form-row">
                <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <input type="text" placeholder="الموقع الحالي" required aria-label="الموقع الحالي للشاحنة" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} />
                </div>
                <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.75M9 11.25h6.75M9 15.75h6.75M9 20.25h6.75" />
                  </svg>
                  <input type="text" placeholder="الوجهة المفضلة" aria-label="الوجهة المفضلة" value={destination} onChange={e => setDestination(e.target.value)} />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
                  </svg>
                  <input type="text" placeholder="نوع الشاحنة" required aria-label="نوع الشاحنة" value={truckType} onChange={(e) => setTruckType(e.target.value)} />
                </div>
                <div className="form-group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" />
                  </svg>
                  <input type="text" placeholder="تاريخ التوفر" onFocus={(e) => (e.target.type = 'date')} onBlur={(e) => (e.target.type = 'text')} required aria-label="تاريخ التوفر" value={availableDate} onChange={(e) => setAvailableDate(e.target.value)} />
                </div>
            </div>

            <div className="form-group form-group-textarea">
              <div className="form-group-textarea-header">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <label htmlFor="truck-notes">ملاحظات إضافية</label>
              </div>
              <textarea
                id="truck-notes"
                rows={4}
                placeholder="هل هناك أي تفاصيل أخرى تود إضافتها؟ (مثل: الشاحنة مجهزة بمبرد، السائق متاح للمساعدة...)"
                aria-label="ملاحظات إضافية"
              ></textarea>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default CreateTruckAdScreen;
