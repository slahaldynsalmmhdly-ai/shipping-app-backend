import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { auth, googleProvider, signInWithPopup, getIdToken } from '../../firebase';
import './Modal.css';

const LoginModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onLoginSuccess: (data: { token: string; user: any }) => void; 
}> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // When the modal is closed, reset its internal state to prevent
    // credentials from showing up on the next open.
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await getIdToken(result.user);
        
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/firebase-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'فشل تسجيل الدخول باستخدام جوجل');
        }
        onLoginSuccess(data);
    } catch (err: any) {
        setError(err.message || 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <h2>تسجيل الدخول</h2>
        {error && <p className="modal-error">{error}</p>}
        <form onSubmit={handleEmailLogin} className="modal-form">
          <div className="form-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              required 
              aria-label="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input 
              type="password" 
              placeholder="كلمة المرور" 
              required 
              aria-label="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="btn btn-primary modal-btn" disabled={isLoading}>
            {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        <div className="modal-divider"><span>أو</span></div>
        <button className="btn btn-google modal-btn" onClick={handleGoogleLogin} disabled={isLoading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" />
          متابعة باستخدام جوجل
        </button>
      </div>
    </div>
  );
};

export default LoginModal;