import React from 'react';
import { Team } from '../types';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface TeamCardProps {
  team: Team;
  onSelect?: (team: Team) => void;
  onDelete?: (team: Team) => void;
  isOwner?: boolean;
}

/**
 * TeamCard component for displaying team information
 */
const TeamCard: React.FC<TeamCardProps> = ({ team, onSelect, onDelete, isOwner = false }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return 'Created yesterday';
    if (diffDays < 7) return `Created ${diffDays} days ago`;
    if (diffDays < 30) return `Created ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Created ${Math.floor(diffDays / 30)} months ago`;
    return `Created ${Math.floor(diffDays / 365)} years ago`;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && isOwner) {
      if (
        confirm(
          `Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`,
        )
      ) {
        onDelete(team);
      }
    } else {
      showErrorToast('Only team owners can delete teams');
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(team)}
      className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${
        onSelect ? 'border-slate-200 hover:border-primary-300' : 'border-slate-200'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
              <p className="text-xs text-slate-500">{formatDate(team.createdAt)}</p>
            </div>
          </div>
          {isOwner && onDelete && (
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete team"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          )}
        </div>

        {team.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{team.description}</p>
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-500 text-[20px]">group</span>
            <div>
              <p className="text-xs text-slate-500">Members</p>
              <p className="text-sm font-bold text-slate-900">{team.memberCount || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500 text-[20px]">
              description
            </span>
            <div>
              <p className="text-xs text-slate-500">Shared Resumes</p>
              <p className="text-sm font-bold text-slate-900">{team.resumeCount || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCard;
