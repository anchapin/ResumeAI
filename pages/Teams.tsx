import React, { useState, useEffect, useCallback } from 'react';
import { Team, TeamMember, TeamActivity, TeamResume, MemberRole } from '../types';
import TeamCard from '../components/TeamCard';
import MemberList from '../components/MemberList';
import TeamResumeLibrary from '../components/TeamResumeLibrary';
import ActivityFeed from '../components/ActivityFeed';
import InviteMemberDialog from '../components/InviteMemberDialog';
import CreateTeamDialog from '../components/CreateTeamDialog';
import {
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  getTeamActivity,
} from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

type View = 'list' | 'detail';

/**
 * Teams page component for managing team collaboration
 */
const Teams: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [sharedResumes, setSharedResumes] = useState<TeamResume[]>([]);

  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const [editingTeam, setEditingTeam] = useState<{ name: string; description: string } | null>(null);

  // Mock current user ID - in a real app, this would come from authentication
  const currentUserId = 1;

  // Load teams on mount
  useEffect(() => {
    loadTeams();
  }, []);

  // Load team details when selected
  useEffect(() => {
    if (selectedTeam && view === 'detail') {
      loadTeamDetails(selectedTeam.id);
    }
  }, [selectedTeam, view]);

  const loadTeams = useCallback(async () => {
    setIsLoadingTeams(true);
    try {
      const teamList = await getTeams();
      setTeams(teamList);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load teams';
      showErrorToast(errorMessage);
      console.error(error);
    } finally {
      setIsLoadingTeams(false);
    }
  }, []);

  const loadTeamDetails = useCallback(async (teamId: number) => {
    setIsLoadingTeam(true);
    setIsLoadingMembers(true);
    setIsLoadingActivities(true);

    try {
      const [teamData, membersData, activitiesData] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
        getTeamActivity(teamId, 20),
      ]);

      setSelectedTeam(teamData);
      setMembers(membersData);
      setActivities(activitiesData);

      // Mock shared resumes - in a real app, this would come from the API
      setSharedResumes([]);

      setEditingTeam({
        name: teamData.name,
        description: teamData.description || '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load team details';
      showErrorToast(errorMessage);
      console.error(error);
    } finally {
      setIsLoadingTeam(false);
      setIsLoadingMembers(false);
      setIsLoadingActivities(false);
    }
  }, []);

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setView('detail');
  };

  const handleCreateTeam = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateTeamSuccess = () => {
    loadTeams();
  };

  const handleDeleteTeam = async (team: Team) => {
    try {
      await deleteTeam(team.id);
      showSuccessToast('Team deleted successfully');
      loadTeams();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete team';
      showErrorToast(errorMessage);
      console.error(error);
    }
  };

  const handleInviteMember = () => {
    setIsInviteDialogOpen(true);
  };

  const handleInviteSuccess = () => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam.id);
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !editingTeam) return;

    try {
      await updateTeam(selectedTeam.id, {
        name: editingTeam.name,
        description: editingTeam.description || undefined,
      });
      showSuccessToast('Team updated successfully');
      const updatedTeam = await getTeam(selectedTeam.id);
      setSelectedTeam(updatedTeam);
      loadTeams();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update team';
      showErrorToast(errorMessage);
      console.error(error);
    }
  };

  const handleBackToList = () => {
    setSelectedTeam(null);
    setView('list');
    setEditingTeam(null);
  };

  const getCurrentUserRole = (): MemberRole | undefined => {
    const currentMember = members.find(m => m.user_id === currentUserId);
    return currentMember?.role;
  };

  const isTeamOwner = getCurrentUserRole() === 'owner';

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <div className="flex items-center gap-4">
          {view === 'detail' && selectedTeam && (
            <button
              onClick={handleBackToList}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to teams"
            >
              <span className="material-symbols-outlined text-slate-600">arrow_back</span>
            </button>
          )}
          <h2 className="text-slate-800 font-bold text-xl">
            {view === 'list' ? 'Teams' : selectedTeam?.name}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {view === 'list' && (
            <button
              onClick={handleCreateTeam}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Team
            </button>
          )}
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
          <div
            className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm"
            style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}
          ></div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 max-w-[1400px] mx-auto">
        {view === 'list' ? (
          /* Team List View */
          <div>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Total Teams</p>
                    <p className="text-3xl font-bold text-slate-900">{teams.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-600 text-[28px]">
                      groups
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Total Members</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {teams.reduce((sum, team) => sum + (team.member_count || 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-[28px]">
                      people
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Shared Resumes</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {teams.reduce((sum, team) => sum + (team.resume_count || 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 text-[28px]">
                      description
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingTeams && (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-primary-600 text-5xl">
                  progress_activity
                </span>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingTeams && teams.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-slate-300 text-8xl mb-6">
                  group_add
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No teams yet</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Create your first team to start collaborating with others on resumes
                </p>
                <button
                  onClick={handleCreateTeam}
                  className="px-6 py-3 rounded-lg bg-primary-600 text-white font-bold text-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center gap-2 mx-auto"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Create Your First Team
                </button>
              </div>
            )}

            {/* Teams Grid */}
            {!isLoadingTeams && teams.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onSelect={handleSelectTeam}
                    onDelete={handleDeleteTeam}
                    isOwner={team.owner_id === currentUserId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Team Detail View */
          <div>
            {isLoadingTeam ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-primary-600 text-5xl">
                  progress_activity
                </span>
              </div>
            ) : selectedTeam ? (
              <div className="space-y-8">
                {/* Team Info Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Team Information</h3>
                    {isTeamOwner && editingTeam && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTeam(null)}
                          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateTeam}
                          className="px-3 py-1.5 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    {editingTeam ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Team Name</label>
                          <input
                            type="text"
                            value={editingTeam.name}
                            onChange={(e) =>
                              setEditingTeam({ ...editingTeam, name: e.target.value })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Description</label>
                          <textarea
                            value={editingTeam.description}
                            onChange={(e) =>
                              setEditingTeam({ ...editingTeam, description: e.target.value })
                            }
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-none"
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                            {selectedTeam.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 mb-1">
                              {selectedTeam.name}
                            </h4>
                            {selectedTeam.description && (
                              <p className="text-slate-600">
                                {selectedTeam.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary-500">
                              calendar_today
                            </span>
                            <span className="text-sm text-slate-600">
                              Created {new Date(selectedTeam.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">
                              person
                            </span>
                            <span className="text-sm text-slate-600">
                              {selectedTeam.member_count || members.length} member{members.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {isTeamOwner && (
                            <button
                              onClick={() =>
                                setEditingTeam({
                                  name: selectedTeam.name,
                                  description: selectedTeam.description || '',
                                })
                              }
                              className="ml-auto px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Members */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">
                          Team Members ({members.length})
                        </h3>
                        <button
                          onClick={handleInviteMember}
                          className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">person_add</span>
                          Invite
                        </button>
                      </div>
                      <div className="p-6">
                        <MemberList
                          members={members}
                          teamId={selectedTeam.id}
                          currentUserId={currentUserId}
                          currentUserRole={getCurrentUserRole()}
                          onRefresh={handleInviteSuccess}
                        />
                      </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-900">Activity Feed</h3>
                      </div>
                      <div className="p-6">
                        <ActivityFeed
                          activities={activities}
                          loading={isLoadingActivities}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Shared Resumes */}
                  <div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-900">Resume Library</h3>
                      </div>
                      <div className="p-6">
                        <TeamResumeLibrary
                          sharedResumes={sharedResumes}
                          teamId={selectedTeam.id}
                          onRefresh={handleInviteSuccess}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Create Team Dialog */}
      {isCreateDialogOpen && (
        <CreateTeamDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreateSuccess={handleCreateTeamSuccess}
        />
      )}

      {/* Invite Member Dialog */}
      {isInviteDialogOpen && selectedTeam && (
        <InviteMemberDialog
          isOpen={isInviteDialogOpen}
          teamId={selectedTeam.id}
          onClose={() => setIsInviteDialogOpen(false)}
          onInviteSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
};

export default Teams;
