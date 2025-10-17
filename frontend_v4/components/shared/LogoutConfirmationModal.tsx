import React from 'react';
import './ConfirmationModal.css'; // Reuses styles for content layout
import '../auth/Modal.css'; // Reuses styles for modal overlay and container

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <div className="confirmation-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </div>
        <h2>تسجيل الخروج</h2>
        <p className="modal-subtitle">هل أنت متأكد من رغبتك في تسجيل الخروج؟</p>
        <div className="confirmation-actions">
          <button onClick={onConfirm} className="btn btn-danger">نعم، تسجيل الخروج</button>
          <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;