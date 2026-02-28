import React from 'react';

interface SkipLinkProps {
  targetId: string;
  label: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ targetId, label }) => (
  <a
    href={`#${targetId}`}
    className="fixed top-4 left-4 z-[100] -translate-y-full px-4 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-lg focus:translate-y-0 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
    onClick={(e) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }}
  >
    {label}
  </a>
);

export const SkipNavigation: React.FC = () => (
  <>
    <SkipLink targetId="main-content" label="Skip to main content" />
    <SkipLink targetId="main-nav" label="Skip to navigation" />
  </>
);

export default SkipNavigation;
