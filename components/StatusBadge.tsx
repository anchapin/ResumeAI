import React from 'react';

/**
 * @component
 * @description A badge component that displays status with appropriate styling
 * @param {{ status: string }} props - Component properties
 * @param {string} props.status - The status to display (e.g., 'Applied', 'Interview', 'Offer', 'Rejected')
 * @returns {JSX.Element} The rendered status badge component
 *
 * @example
 * ```tsx
 * <StatusBadge status="Applied" />
 * <StatusBadge status="Interview" />
 * <StatusBadge status="Offer" />
 * ```
 */
const StatusBadge = React.memo<{ status: string }>(({ status }) => {
  let colorClass = '';
  switch (status) {
    case 'Applied':
      colorClass = 'bg-blue-100 text-blue-700';
      break;
    case 'Interview':
      colorClass = 'bg-purple-100 text-purple-700';
      break;
    case 'Offer':
      colorClass = 'bg-emerald-100 text-emerald-700';
      break;
    case 'Rejected':
      colorClass = 'bg-red-100 text-red-700';
      break;
    default:
      colorClass = 'bg-slate-100 text-slate-700';
  }

  return (
    <span
      data-testid="status-badge"
      data-status={status}
      aria-label={`Status: ${status}`}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}
    >
      {status}
    </span>
  );
});

export default StatusBadge;
