import React from 'react';

const StatusBadge = ({ status }: { status: string }) => {
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
