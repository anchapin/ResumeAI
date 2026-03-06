import React, { useState, useCallback } from 'react';
import { TeamResume, ResumeMetadata } from '../types';
import { shareResumeWithTeam, unshareResumeFromTeam, listResumes } from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import AccessibleDialog from './AccessibleDialog';

interface TeamResumeLibraryProps {
  sharedResumes: TeamResume[];
  teamId: number | string;
  onRefresh?: () => void;
}

/**
 * TeamResumeLibrary component for managing shared resumes within a team
 */
const TeamResumeLibrary: React.FC<TeamResumeLibraryProps> = ({
  sharedResumes,
  teamId,
  onRefresh,
}) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [userResumes, setUserResumes] = useState<ResumeMetadata[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [sharingResumeId, setSharingResumeId] = useState<number | null>(null);
  const [unsharingResumeId, setUnsharingResumeId] = useState<string | null>(null);

  const loadUserResumes = useCallback(async () => {
    setIsLoadingResumes(true);
    try {
      const resumes = await listResumes();
      setUserResumes(resumes);
    } catch (error) {
      showErrorToast('Failed to load your resumes');
      console.error(error);
    } finally {
      setIsLoadingResumes(false);
    }
  }, []);

  const handleOpenShareDialog = () => {
    loadUserResumes();
    setIsShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setIsShareDialogOpen(false);
    setUserResumes([]);
  };

  const handleShareResume = async (resumeId: number) => {
    setSharingResumeId(resumeId);
    try {
      await shareResumeWithTeam(resumeId, teamId);
      showSuccessToast('Resume shared with team');
      setIsShareDialogOpen(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showErrorToast('Failed to share resume');
      console.error(error);
    } finally {
      setSharingResumeId(null);
    }
  };

  const handleUnshareResume = async (sharedResumeId: string, resumeId: string) => {
    if (!confirm('Are you sure you want to unshare this resume from the team?')) {
      return;
    }

    setUnsharingResumeId(sharedResumeId);
    try {
      await unshareResumeFromTeam(parseInt(resumeId, 10), teamId);
      showSuccessToast('Resume unshared from team');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showErrorToast('Failed to unshare resume');
      console.error(error);
    } finally {
      setUnsharingResumeId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Shared today';
    if (diffDays === 1) return 'Shared yesterday';
    if (diffDays < 7) return `Shared ${diffDays} days ago`;
    if (diffDays < 30) return `Shared ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Shared ${Math.floor(diffDays / 30)} months ago`;
    return `Shared ${Math.floor(diffDays / 365)} years ago`;
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

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Shared Resumes ({sharedResumes.length})</h3>
          <button
            onClick={handleOpenShareDialog}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share Resume
          </button>
        </div>

        {sharedResumes.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">
              folder_open
            </span>
            <p className="text-slate-500 font-medium mb-2">No shared resumes yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Share your resumes with the team to start collaborating
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sharedResumes.map((sharedResume) => (
              <div
                key={sharedResume.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 text-[24px]">
                      description
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{sharedResume.resumeTitle}</h4>
                    <p className="text-sm text-slate-500">
                      Shared by {sharedResume.sharedByUserName || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(sharedResume.sharedAt)}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnshareResume(sharedResume.id, sharedResume.resumeId)}
                  disabled={unsharingResumeId === sharedResume.id}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Unshare from team"
                  aria-label="Unshare from team"
                >
                  {unsharingResumeId === sharedResume.id ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">link_off</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <AccessibleDialog
        isOpen={isShareDialogOpen}
        onClose={handleCloseShareDialog}
        title="Share Resume with Team"
        className="max-w-2xl"
        footer={
          <button
            onClick={handleCloseShareDialog}
            className="w-full py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        }
      >
        <div className="flex-1 overflow-auto pr-2">
          {isLoadingResumes ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl">
                progress_activity
              </span>
            </div>
          ) : userResumes.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">
                description
              </span>
              <p className="text-slate-500 font-medium mb-2">No resumes found</p>
              <p className="text-slate-400 text-sm">
                Create some resumes first to share them with your team
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {userResumes.map((resume) => {
                const isShared = sharedResumes.some((sr) => sr.resumeId === String(resume.id));

                return (
                  <div
                    key={resume.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      isShared
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-primary-300 cursor-pointer'
                    }`}
                    onClick={() => !isShared && handleShareResume(resume.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500 text-[24px]">
                          description
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{resume.title}</h4>
                        {resume.tags && resume.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {resume.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {resume.tags.length > 3 && (
                              <span className="text-xs text-slate-400">
                                +{resume.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isShared ? (
                        <span className="px-3 py-1.5 bg-slate-200 text-slate-600 text-sm font-medium rounded-lg">
                          Shared
                        </span>
                      ) : sharingResumeId === resume.id ? (
                        <span className="material-symbols-outlined animate-spin text-primary-600">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">
                          arrow_forward
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AccessibleDialog>
    </>
  );
};

export default TeamResumeLibrary;
