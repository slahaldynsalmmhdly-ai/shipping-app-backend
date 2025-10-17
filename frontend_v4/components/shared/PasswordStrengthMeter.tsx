import React, { useMemo } from 'react';
import './PasswordStrengthMeter.css';

interface PasswordStrengthMeterProps {
  password?: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const getStrengthLabel = () => {
    switch (strength) {
      case 0:
      case 1:
        return 'ضعيفة جداً';
      case 2:
        return 'ضعيفة';
      case 3:
        return 'متوسطة';
      case 4:
        return 'قوية';
      case 5:
        return 'قوية جداً';
      default:
        return '';
    }
  };

  const strengthLabel = getStrengthLabel();
  const strengthClass = strength > 0 ? `strength-${strength}` : '';

  return (
    <div className="password-strength-meter">
      <div className="strength-bar">
        <div className={`strength-bar-fill ${strengthClass}`} style={{ width: `${strength * 20}%` }}></div>
      </div>
      {password && strengthLabel && (
        <p className={`strength-text ${strengthClass}`}>{strengthLabel}</p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;