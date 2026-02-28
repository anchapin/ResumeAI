import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const calculatePasswordStrength = (
  pwd: string,
): {
  score: number;
  label: string;
  color: string;
  requirements: Array<{ met: boolean; label: string }>;
} => {
  if (!pwd) {
    return { score: 0, label: '', color: 'bg-slate-200', requirements: [] };
  }

  const hasLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[\]!@#$%^&*()_+\-={};:',.<>?/|]/.test(pwd);

  let score = 0;
  if (hasLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;

  const requirements = [
    { met: hasLength, label: 'At least 8 characters' },
    { met: hasUpper, label: 'At least one uppercase letter' },
    { met: hasLower, label: 'At least one lowercase letter' },
    { met: hasDigit, label: 'At least one number' },
    { met: hasSpecial, label: 'At least one special character' },
  ];

  if (score <= 2) {
    return { score, label: 'Weak', color: 'bg-red-500', requirements };
  } else if (score <= 3) {
    return { score, label: 'Fair', color: 'bg-yellow-500', requirements };
  } else if (score <= 4) {
    return { score, label: 'Good', color: 'bg-blue-500', requirements };
  } else {
    return { score, label: 'Strong', color: 'bg-green-500', requirements };
  }
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const strength = calculatePasswordStrength(password);

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
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500">
        <p>Requirements:</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          {strength.requirements.map((req, idx) => (
            <li key={idx} className={req.met ? 'text-green-600' : 'text-slate-400'}>
              {req.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
