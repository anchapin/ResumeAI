import React from 'react';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number;
  requirements: PasswordRequirement[];
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  const requirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least one digit', met: /\d/.test(password) },
    {
      label: 'At least one special character',
      met: /[!@#$%^&*()_+=\-[\]{}|;:,.<>?]/.test(password),
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  let score: number;

  if (password.length === 0) {
    score = 0;
  } else if (metCount < 2) {
    score = 1;
  } else if (metCount < 3) {
    score = 2;
  } else if (metCount < 4) {
    score = 3;
  } else if (metCount < 5) {
    score = 4;
  } else {
    score = 5;
  }

  return { score, requirements };
};

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { score, requirements } = calculatePasswordStrength(password);

  const getStrengthLabel = (score: number): string => {
    switch (score) {
      case 0:
        return 'No password';
      case 1:
        return 'Very weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Fair';
      case 4:
        return 'Strong';
      case 5:
        return 'Very strong';
      default:
        return '';
    }
  };

  const getStrengthColor = (score: number): string => {
    switch (score) {
      case 0:
        return 'bg-slate-200';
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-amber-500';
      case 4:
        return 'bg-green-500';
      case 5:
        return 'bg-green-600';
      default:
        return 'bg-slate-200';
    }
  };

  const strengthColor = getStrengthColor(score);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600">Password strength</span>
          <span
            className={`text-xs font-medium ${
              score <= 2 ? 'text-red-600' : score <= 3 ? 'text-amber-600' : 'text-green-600'
            }`}
          >
            {getStrengthLabel(score)}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index < score ? strengthColor : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      <ul className="space-y-1.5">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 text-xs ${
              req.met ? 'text-green-600' : 'text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {req.met ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;
