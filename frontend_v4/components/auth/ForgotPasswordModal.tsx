import React from 'react';
import './Modal.css';

const ForgotPasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle forgot password logic
    onClose(); // Close modal on submit for now
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <h2>إعادة تعيين كلمة المرور</h2>
        <p className="modal-subtitle">أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
        <form onSubmit={handleFormSubmit} className="modal-form">
          <div className="form-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input type="email" placeholder="البريد الإلكتروني" required aria-label="البريد الإلكتروني" />
          </div>
          <button type="submit" className="btn btn-primary modal-btn">إرسال الرابط</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;