import React from 'react';
import './ConfirmationModal.css';
import '../auth/Modal.css'; // Reuse base modal styles

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'تأكيد',
  cancelButtonText = 'إلغاء'
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <div className="confirmation-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2>{title}</h2>
        <p className="modal-subtitle">{message}</p>
        <div className="confirmation-actions">
          <button onClick={onConfirm} className="btn btn-danger">{confirmButtonText}</button>
          <button onClick={onClose} className="btn btn-secondary">{cancelButtonText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;