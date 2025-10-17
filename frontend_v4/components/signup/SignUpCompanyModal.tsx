import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';
import PasswordStrengthMeter from '../shared/PasswordStrengthMeter';
import '../auth/Modal.css';
import './SignUpModal.css';

interface SignUpCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupSuccess: (data: { token: string; user: any }) => void;
}

const SignUpCompanyModal: React.FC<SignUpCompanyModalProps> = ({ isOpen, onClose, onSignupSuccess }) => {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          email,
          password,
          userType: 'company',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'فشل إنشاء الحساب');
      }
      onSignupSuccess(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content signup-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <h2>إنشاء حساب شركة</h2>
        {error && <p className="modal-error">{error}</p>}
        <form onSubmit={handleFormSubmit} className="modal-form signup-form">
          {/* --- Simplified Fields as per user request --- */}
          <div className="form-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1" /></svg>
            <input type="text" placeholder="اسم الشركة" required aria-label="اسم الشركة" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isLoading} />
          </div>
          <div className="form-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <input type="email" placeholder="البريد الإلكتروني" required aria-label="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <input type="password" placeholder="كلمة المرور" required aria-label="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
            <div className="form-group">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <input type="password" placeholder="تأكيد كلمة المرور" required aria-label="تأكيد كلمة المرور" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          <PasswordStrengthMeter password={password} />
          
          <button type="submit" className="btn btn-primary modal-btn" disabled={isLoading}>
             {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpCompanyModal;