import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * @component
 * @description Skeleton loading component with shimmer animation
 * @param {SkeletonProps} props - Component properties
 * @param {string} props.className - Additional CSS classes
 * @param {string | number} props.width - Width of skeleton
 * @param {string | number} props.height - Height of skeleton
 * @param {'text' | 'circular' | 'rectangular' | 'rounded'} props.variant - Shape variant
 * @param {'pulse' | 'wave' | 'none'} props.animation - Animation type
 * @returns {JSX.Element} The rendered skeleton component
 */
const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-slate-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Skeleton;
