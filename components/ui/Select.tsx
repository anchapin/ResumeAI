import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, leftIcon, rightIcon, children, id, ...props }, ref) => {
    const selectId =
      id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const errorId = `${selectId}-error`;

    const baseStyles =
      'w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-200 appearance-none text-slate-900 text-sm font-medium disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed';

    const combinedClassName = `${baseStyles} ${error ? 'border-red-500 focus:ring-red-100' : ''} ${className}`;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-sm font-bold text-slate-700 block px-1" htmlFor={selectId}>
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors pointer-events-none">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            className={`${combinedClassName} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : 'pr-10'}`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {rightIcon || (
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                unfold_more
              </span>
            )}
          </div>
        </div>
        {error && (
          <p
            id={errorId}
            className="text-xs font-medium text-red-500 px-1 mt-1 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              error
            </span>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
