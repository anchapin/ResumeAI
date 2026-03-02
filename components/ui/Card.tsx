import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isSelected?: boolean;
  isHoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  isSelected = false,
  isHoverable = true,
  padding = 'md',
  ...props
}) => {
  const baseStyles = 'bg-white rounded-xl border-2 transition-all duration-200';

  const selectionStyles = isSelected
    ? 'border-primary-500 ring-4 ring-primary-100'
    : 'border-slate-200';

  const hoverStyles =
    isHoverable && !isSelected ? 'hover:border-primary-300 hover:shadow-lg cursor-pointer' : '';

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };

  const combinedClassName = `${baseStyles} ${selectionStyles} ${hoverStyles} ${paddings[padding]} ${className}`;

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

export default Card;
