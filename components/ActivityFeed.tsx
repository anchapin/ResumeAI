import React from 'react';
import { TeamActivity } from '../types';

interface ActivityFeedProps {
  activities: TeamActivity[];
  loading?: boolean;
}

/**
 * ActivityFeed component for displaying recent team actions
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    if (diffDays < 365)
      return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
  };

  const getActivityIcon = (type: TeamActivity['type']): { icon: string; color: string } => {
    switch (type) {
      case 'team_created':
        return { icon: 'group_add', color: 'text-green-500' };
      case 'member_joined':
        return { icon: 'person_add', color: 'text-blue-500' };
      case 'member_left':
        return { icon: 'person_remove', color: 'text-red-500' };
      case 'role_changed':
        return { icon: 'swap_horiz', color: 'text-amber-500' };
      case 'resume_shared':
        return { icon: 'share', color: 'text-purple-500' };
      case 'resume_unshared':
        return { icon: 'link_off', color: 'text-red-500' };
      case 'team_updated':
        return { icon: 'edit', color: 'text-blue-500' };
      case 'team_deleted':
        return { icon: 'delete', color: 'text-red-500' };
      default:
        return { icon: 'info', color: 'text-slate-500' };
    }
  };

  const getActivityDescription = (activity: TeamActivity): string => {
    const userName = activity.userName || 'Someone';

    switch (activity.type) {
      case 'team_created':
        return `${userName} created the team`;
      case 'member_joined':
        return `${userName} joined the team`;
      case 'member_left':
        return `${userName} left the team`;
      case 'role_changed':
        return `${userName} changed a member's role`;
      case 'resume_shared':
        return `${userName} shared a resume`;
      case 'resume_unshared':
        return `${userName} unshared a resume`;
      case 'team_updated':
        return `${userName} updated team details`;
      case 'team_deleted':
        return `${userName} deleted the team`;
      default:
        return activity.description;
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-xl">
        <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">history</span>
        <p className="text-slate-500 font-medium mb-2">No activity yet</p>
        <p className="text-slate-400 text-sm">Recent team actions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900">Recent Activity</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[20px] top-0 bottom-0 w-0.5 bg-slate-200"></div>

        {activities.map((activity, index) => {
          const { icon, color } = getActivityIcon(activity.type);
          const isLast = index === activities.length - 1;

          return (
            <div key={activity.id} className={`relative flex gap-4 ${isLast ? '' : 'mb-4'}`}>
              {/* Timeline dot */}
              <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0 z-10">
                <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
              </div>

              {/* Activity content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  {activity.userName && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(activity.userName)}
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-900">
                    {getActivityDescription(activity)}
                  </p>
                </div>

                {activity.description && (
                  <p className="text-sm text-slate-600 ml-8">{activity.description}</p>
                )}

                <p className="text-xs text-slate-400 ml-8 mt-1">{formatDate(activity.createdAt)}</p>

                {/* Activity metadata */}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 ml-8 p-3 bg-slate-50 rounded-lg">
                    {Object.entries(activity.metadata).map(([key, value]) => (
                      <div key={key} className="text-xs text-slate-600">
                        <span className="font-medium">{key}:</span>{' '}
                        <span className="font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;
