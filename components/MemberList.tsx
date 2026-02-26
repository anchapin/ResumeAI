import React, { useState, useCallback } from 'react';
import { TeamMember, MemberRole } from '../types';
import { updateMemberRole, removeMember } from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface MemberListProps {
  members: TeamMember[];
  teamId: number | string;
  currentUserId?: string;
  currentUserRole?: MemberRole;
  onRefresh?: () => void;
}

/**
 * MemberList component for managing team members
 */
const MemberList: React.FC<MemberListProps> = ({
  members,
  teamId,
  currentUserId,
  currentUserRole = 'member',
  onRefresh,
}) => {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const canManageMember = (member: TeamMember): boolean => {
    // Owner can manage everyone except themselves
    if (currentUserRole === 'owner') {
      return !member.is_owner;
    }
    // Admin can manage members, not other admins or owners
    if (currentUserRole === 'admin') {
      return member.role === 'member';
    }
    // Members can't manage anyone
    return false;
  };

  const handleRoleChange = async (member: TeamMember, newRole: MemberRole) => {
    if (!canManageMember(member)) {
      showErrorToast("You do not have permission to change this member's role");
      return;
    }

    if (newRole === 'owner' && currentUserRole !== 'owner') {
      showErrorToast('Only owners can promote members to owner');
      return;
    }

    setUpdatingUserId(member.user_id);
    try {
      await updateMemberRole(teamId, member.user_id, newRole);
      showSuccessToast(`${member.name || member.email}'s role updated to ${newRole}`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showErrorToast('Failed to update member role');
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!canManageMember(member)) {
      showErrorToast('You do not have permission to remove this member');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${member.name || member.email} from the team?`)) {
      return;
    }

    setLoadingUserId(member.user_id);
    try {
      await removeMember(teamId, member.user_id);
      showSuccessToast(`${member.name || member.email} removed from team`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showErrorToast('Failed to remove member');
      console.error(error);
    } finally {
      setLoadingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Joined today';
    if (diffDays === 1) return 'Joined yesterday';
    if (diffDays < 7) return `Joined ${diffDays} days ago`;
    if (diffDays < 30) return `Joined ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Joined ${Math.floor(diffDays / 30)} months ago`;
    return `Joined ${Math.floor(diffDays / 365)} years ago`;
  };

  const getRoleBadgeColor = (role: MemberRole): string => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'member':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.user_id}
          className={`flex items-center justify-between p-4 rounded-xl border ${
            member.user_id === currentUserId
              ? 'bg-primary-50 border-primary-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm">
              {getInitials(member.name, member.email)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900">
                  {member.name || member.email || 'Unknown'}
                </h4>
                {member.user_id === currentUserId && (
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                    You
                  </span>
                )}
              </div>
              {member.email && member.name && (
                <p className="text-sm text-slate-500">{member.email}</p>
              )}
              <p className="text-xs text-slate-400">{formatDate(member.joined_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}
            >
              {member.role}
            </span>

            {canManageMember(member) && (
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value as MemberRole)}
                  disabled={updatingUserId === member.user_id}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:opacity-50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  {currentUserRole === 'owner' && !member.is_owner && (
                    <option value="owner">Owner</option>
                  )}
                </select>

                <button
                  onClick={() => handleRemoveMember(member)}
                  disabled={loadingUserId === member.user_id || updatingUserId === member.user_id}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove member"
                >
                  {loadingUserId === member.user_id ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">person_remove</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">group_off</span>
          <p className="text-slate-500 font-medium mb-2">No members yet</p>
          <p className="text-slate-400 text-sm">Invite team members to start collaborating</p>
        </div>
      )}
    </div>
  );
};

export default MemberList;
