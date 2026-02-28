import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) {
      return { score: 0, label: '', color: 'bg-slate-200' };
    }

    let score = 0;
    
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/|]/.test(pwd);
    
    const varietyCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    score += varietyCount;

    if (score <= 2) {
      return { score, label: 'Weak', color: 'bg-red-500' };
    } else if (score <= 4) {
      return { score, label: 'Medium', color: 'bg-yellow-500' };
    } else if (score <= 5) {
      return { score, label: 'Strong', color: 'bg-green-500' };
    } else {
      return { score, label: 'Very Strong', color: 'bg-emerald-600' };
    }
  };

  const strength = calculateStrength(password);

  if (!strength.label) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">Password Strength:</span>
        <span className={'text-xs font-bold text-white px-2 py-0.5 rounded {strength.color}'}>
          {strength.label}
        </span>
      </div>
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={'h-full transition-all duration-300 {strength.color}'}
          style={{ width: \`\${(strength.score / 6) * 100}%\` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500">
        <p>Requirements:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li className={password.length >= 8 ? 'text-green-600' : 'text-slate-400'}>
            At least 8 characters
          </li>
          <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-400'}>
            At least one uppercase letter
          </li>
          <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-slate-400'}>
            At least one lowercase letter
          </li>
          <li className={/\d/.test(password) ? 'text-green-600' : 'text-slate-400'}>
            At least one number
          </li>
          <li className={/[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/|]/.test(password) ? 'text-green-600' : 'text-slate-400'}>
            At least one special character (!@#$%^&*)
          </li>
        </ul>
      </div>
    </div>
  );
};
