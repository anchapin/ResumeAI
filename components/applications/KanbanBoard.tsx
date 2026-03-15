import React from 'react';
import { JobApplication, ApplicationStatus, STATUS_CONFIG } from '../../utils/applications-api';

interface KanbanColumnProps {
  status: ApplicationStatus;
  applications: JobApplication[];
  onCardClick: (app: JobApplication) => void;
  onStatusChange: (appId: number, newStatus: ApplicationStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  applications,
  onCardClick,
  onStatusChange,
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex-1 min-w-72 bg-gray-100 rounded-lg p-3">
      {/* Column Header */}
      <div className={`flex items-center justify-between mb-3 px-2 py-2 rounded ${config.bgColor}`}>
        <h3 className={`font-semibold ${config.color}`}>
          {config.label}
        </h3>
        <span className={`text-sm font-medium ${config.color}`}>
          {applications.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
        {applications.map((app) => (
          <KanbanCard
            key={app.id}
            application={app}
            onClick={() => onCardClick(app)}
            onStatusChange={onStatusChange}
          />
        ))}

        {applications.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No applications
          </div>
        )}
      </div>
    </div>
  );
};

interface KanbanCardProps {
  application: JobApplication;
  onClick: () => void;
  onStatusChange: (appId: number, newStatus: ApplicationStatus) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  application,
  onClick,
  onStatusChange,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('applicationId', application.id.toString());
    e.dataTransfer.setData('fromStatus', application.status);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromStatus = e.dataTransfer.getData('fromStatus') as ApplicationStatus;
    if (fromStatus !== application.status) {
      onStatusChange(application.id, application.status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate days since applied
  const daysSinceApplied = application.date_applied
    ? Math.floor((Date.now() - new Date(application.date_applied).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={onClick}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition ${
        isDragging ? 'opacity-50' : ''
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Company and Title */}
      <h4 className="font-semibold text-gray-900 mb-1">{application.company_name}</h4>
      <p className="text-sm text-gray-600 mb-2">{application.job_title}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {application.priority === 'high' && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
            High Priority
          </span>
        )}
        {application.follow_up_date && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            Follow-up
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {application.location && (
          <span className="flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {application.location.length > 15 ? application.location.substring(0, 15) + '...' : application.location}
          </span>
        )}
        {daysSinceApplied !== null && (
          <span>{daysSinceApplied}d ago</span>
        )}
      </div>

      {/* Salary (if available) */}
      {application.salary_min && application.salary_max && (
        <div className="mt-2 text-xs text-gray-500">
          ${application.salary_min.toLocaleString()} - ${application.salary_max.toLocaleString()}
          {application.salary_period === 'yearly' ? '/year' : ''}
        </div>
      )}
    </div>
  );
};

interface KanbanBoardProps {
  applications: JobApplication[];
  onCardClick: (app: JobApplication) => void;
  onStatusChange: (appId: number, newStatus: ApplicationStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onCardClick,
  onStatusChange,
}) => {
  // Group applications by status
  const applicationsByStatus: Record<ApplicationStatus, JobApplication[]> = {
    draft: [],
    applied: [],
    screening: [],
    interviewing: [],
    offer: [],
    accepted: [],
    rejected: [],
    withdrawn: [],
    archived: [],
  };

  applications.forEach((app) => {
    applicationsByStatus[app.status].push(app);
  });

  // Only show columns with applications or key statuses
  const visibleStatuses: ApplicationStatus[] = [
    'draft',
    'applied',
    'screening',
    'interviewing',
    'offer',
    'accepted',
    'rejected',
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleStatuses.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          applications={applicationsByStatus[status]}
          onCardClick={onCardClick}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
};
