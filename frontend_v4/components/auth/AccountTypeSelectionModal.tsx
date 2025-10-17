import React from 'react';
import './Modal.css';

const AccountTypeSelectionModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSelectIndividual: () => void;
    onSelectCompany: () => void;
}> = ({ isOpen, onClose, onSelectIndividual, onSelectCompany }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-ad-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <h2>اختر نوع الحساب</h2>
        <p className="modal-subtitle">اختر نوع الحساب الذي يناسب احتياجاتك.</p>
        <div className="account-type-options">
            <button className="account-type-option-btn" onClick={onSelectIndividual}>
                <div className="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h3>تسجيل حساب فردي</h3>
            </button>
            <button className="account-type-option-btn" onClick={onSelectCompany}>
                 <div className="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" />
                    </svg>
                </div>
                <h3>تسجيل حساب شركة</h3>
            </button>
        </div>
      </div>
    </div>
  );
};

export default AccountTypeSelectionModal;