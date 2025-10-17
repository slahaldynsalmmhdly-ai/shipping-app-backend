import React, { useState, useEffect } from 'react';
import MediaUpload from '../shared/MediaUpload';
import './Ads.css';

interface CreateCargoAdScreenProps {
  className?: string;
  onNavigateBack: () => void;
  coinBalance: number;
  isAdToBeFeatured: boolean;
  setIsAdToBeFeatured: (value: React.SetStateAction<boolean>) => void;
  onOpenSubscriptionModal: () => void;
}

const CreateCargoAdScreen: React.FC<CreateCargoAdScreenProps> = ({ className, onNavigateBack, coinBalance, isAdToBeFeatured, setIsAdToBeFeatured, onOpenSubscriptionModal }) => {
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [truckType, setTruckType] = useState('');
  const [loadDate, setLoadDate] = useState('');
  const [description, setDescription] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const isValid = fromLocation.trim() !== '' &&
                    toLocation.trim() !== '' &&
                    truckType.trim() !== '' &&
                    loadDate.trim() !== '' &&
                    description.trim() !== '';
    setIsFormValid(isValid);
  }, [fromLocation, toLocation, truckType, loadDate, description]);


  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    // Handle cargo ad creation logic, now including featured status
    console.log("Cargo Ad Submitted", { featured: isAdToBeFeatured });
    onNavigateBack(); // Go back to home
  };

  const handleFeatureAdClick = () => {
    if (coinBalance > 0) {
      setIsAdToBeFeatured(prev => !prev);
      // In a real app, you would decrement the balance upon successful submission
    } else {
      onOpenSubscriptionModal();
    }
  };


  return (
    <div className={`app-container ad-creation-container ${className || ''}`}>
      <form className="ad-creation-form-wrapper" onSubmit={handleFormSubmit} id="create-cargo-ad-form">
        <header className="ad-creation-header">
          <button type="button" onClick={onNavigateBack} className="ad-header-btn back-btn" aria-label="الرجوع">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1>إنشاء إعلان حمولة</h1>
          <div className="header-actions-group">
            <button type="button" onClick={handleFeatureAdClick} className={`ad-header-btn feature-ad-btn ${isAdToBeFeatured ? 'active' : ''}`} aria-label="تمييز الإعلان">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.868 2.884c.321-.772 1.305-.772 1.626 0l1.838 4.445 4.904.712c.852.124 1.191 1.174.574 1.773l-3.549 3.458.839 4.884c.146.848-.744 1.497-1.502.999L10 16.549l-4.37 2.3a1.002 1.002 0 01-1.502-1l.839-4.884-3.55-3.458c-.617-.6-.278-1.649.574-1.773l4.904-.712 1.838-4.445z" clipRule="evenodd" />
                </svg>
                <span>تمييز</span>
            </button>
            <button type="submit" form="create-cargo-ad-form" className="ad-header-btn send-btn" disabled={!isFormValid} aria-label="نشر الإعلان">
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.75M9 11.25h6.75M9 15.75h6.75M9 20.25h6.75" />
                </svg>
                <input type="text" placeholder="مكان التحميل" required aria-label="مكان التحميل" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} />
              </div>
              <div className="form-group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <input type="text" placeholder="مكان التوصيل" required aria-label="مكان التوصيل" value={toLocation} onChange={(e) => setToLocation(e.target.value)} />
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
                <input type="text" placeholder="تاريخ التحميل" onFocus={(e) => (e.target.type = 'date')} onBlur={(e) => (e.target.type = 'text')} required aria-label="تاريخ التحميل" value={loadDate} onChange={(e) => setLoadDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group form-group-textarea">
              <div className="form-group-textarea-header">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <label htmlFor="cargo-description">وصف الحمولة</label>
              </div>
              <textarea
                  id="cargo-description"
                  rows={4}
                  placeholder="وصف الحمولة (مثال: أثاث منزلي، مواد بناء...)"
                  aria-label="وصف الحمولة"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default CreateCargoAdScreen;
