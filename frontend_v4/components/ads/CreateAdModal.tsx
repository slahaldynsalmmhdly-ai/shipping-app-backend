import React from 'react';
import '../auth/Modal.css';

const CreateAdModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectCargo: () => void;
    onSelectTruck: () => void;
    onSelectPost: () => void;
}> = ({ isOpen, onClose, onSelectCargo, onSelectTruck, onSelectPost }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-ad-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <h2>إنشاء</h2>
        <div className="account-type-options">
            <button className="account-type-option-btn" onClick={onSelectPost}>
                <div className="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                </div>
                <h3>إنشاء منشور</h3>
            </button>
            <button className="account-type-option-btn" onClick={onSelectCargo}>
                <div className="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                </div>
                <h3>إعلان عن حمولة</h3>
            </button>
            <button className="account-type-option-btn" onClick={onSelectTruck}>
                 <div className="option-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
                    </svg>
                </div>
                <h3>إعلان عن شاحنة فارغة</h3>
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAdModal;