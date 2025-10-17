import React from 'react';
import './SubscriptionModal.css';
import '../auth/Modal.css'; // Reusing base modal styles

// A new, robust digital coin icon to prevent rendering issues.
const DigitalCoinIcon: React.FC<{className?: string}> = ({ className }) => (
    <span className={`digital-coin-icon-wrapper ${className || ''}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" fill="#F7931A"/>
            <circle cx="24" cy="24" r="19" fill="#F9A33D" stroke="#FFFFFF" strokeWidth="2"/>
            <path d="M24 13L26.472 20.2188L34 21.183L29.236 25.5218L30.294 33L24 29.25L17.706 33L18.764 25.5218L14 21.183L21.528 20.2188L24 13Z" fill="white"/>
        </svg>
    </span>
);

const SubscriptionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const purchaseOptions = [
    { coins: 1, price: 10, discount: null, bestValue: false },
    { coins: 10, price: 95, discount: '5%', bestValue: false },
    { coins: 50, price: 450, discount: '10%', bestValue: false },
    { coins: 100, price: 750, discount: '25%', bestValue: true },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content subscription-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>

        <header className="classic-wallet">
            <div className="wallet-details">
                <div className="wallet-info">
                    <h2>رصيد المحفظة</h2>
                    <p className="wallet-balance">
                      <span>0</span>
                      <DigitalCoinIcon className="digital-coin-icon-small" />
                    </p>
                </div>
                 <div className="wallet-branding">
                    <div className="wallet-chip"></div>
                    <span className="wallet-app-name">شحن سريع</span>
                </div>
            </div>
        </header>

        <main className="purchase-options-container">
          <p className="purchase-title">شراء عملات لتمييز إعلاناتك والحصول على ميزات حصرية.</p>
          <div className="purchase-options-list">
            {purchaseOptions.map((option, index) => (
              <div key={index} className={`purchase-option-card ${option.bestValue ? 'best-value' : ''}`}>
                {option.bestValue && <div className="best-value-badge">الأكثر توفيراً</div>}
                <div className="option-details">
                  <DigitalCoinIcon className="digital-coin-icon-large" />
                  <div className="option-text">
                    <h3>{option.coins.toLocaleString('ar-SA')} عملة</h3>
                    {option.discount && <p>خصم {option.discount}</p>}
                  </div>
                </div>
                <button className="purchase-btn">
                  <span>{option.price.toLocaleString('ar-SA')} ريال</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubscriptionModal;