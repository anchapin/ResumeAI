import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    const baseInputStyles =
      'w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 outline-none focus:ring-4 focus:ring-primary-100 text-sm';
    const borderStyles = error
      ? 'border-red-300 focus:border-red-500'
      : 'border-slate-200 focus:border-primary-500';
    const paddingStyles = leftIcon ? 'pl-11' : '';

    const combinedInputClassName = `${baseInputStyles} ${borderStyles} ${paddingStyles} ${className}`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-bold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input ref={ref} id={inputId} className={combinedInputClassName} {...props} />
        </div>
        {error ? (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
