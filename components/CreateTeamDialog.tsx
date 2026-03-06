import React, { useState } from 'react';
import { CreateTeamRequest, Team } from '../types';
import { createTeam } from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import AccessibleDialog from './AccessibleDialog';

interface CreateTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess?: (team: Team) => void;
}

/**
 * CreateTeamDialog component for creating new teams
 * Accessible dialog for team creation with validation
 */
const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  isOpen,
  onClose,
  onCreateSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.length > 0 && value.length < 3) {
      setNameError('Team name must be at least 3 characters');
    } else if (value.length > 100) {
      setNameError('Team name must be less than 100 characters');
    } else {
      setNameError(null);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError('Team name is required');
      return;
    }

    if (name.length < 3) {
      setNameError('Team name must be at least 3 characters');
      return;
    }

    setIsCreating(true);
    setNameError(null);

    try {
      const request: CreateTeamRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      const team = await createTeam(request);
      showSuccessToast('Team created successfully');
      setName('');
      setDescription('');
      if (onCreateSuccess) {
        onCreateSuccess(team);
      }
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
      showErrorToast(errorMessage);
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setNameError(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating && !nameError && name.trim()) {
      handleCreate();
    }
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        onClick={handleClose}
        disabled={isCreating}
        className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleCreate}
        disabled={isCreating || !!nameError || !name.trim()}
        className="flex-1 px-4 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isCreating ? (
          <>
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
            <span>Creating...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Team</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Team"
      headerId="create-team-dialog-title"
      descriptionId="create-team-dialog-description"
      footer={footerContent}
      className="max-w-md"
    >
      <div>
        <p id="create-team-dialog-description" className="text-sm text-slate-500 mb-4">
          Set up a new team for collaboration
        </p>

        <div className="p-0 space-y-4">
          {/* Team Name */}
          <div className="space-y-2">
            <label htmlFor="team-name" className="text-sm font-bold text-slate-700">
              Team Name *
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Design Team, Engineering Team"
              className={`w-full px-4 py-3 rounded-lg border focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 ${
                nameError ? 'border-red-300' : 'border-slate-300'
              }`}
              disabled={isCreating}
              maxLength={100}
            />
            <div className="flex items-center justify-between">
              {nameError && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {nameError}
                </div>
              )}
              <div
                className={`text-xs ${nameError ? 'text-red-600 ml-auto' : 'text-slate-400 ml-auto'}`}
              >
                {name.length}/100
              </div>
            </div>
          </div>

          {/* Team Description */}
          <div className="space-y-2">
            <label htmlFor="team-description" className="text-sm font-bold text-slate-700">
              Description (optional)
            </label>
            <textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this team..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 resize-none"
              disabled={isCreating}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-slate-400 ml-auto text-right">
              {description.length}/500
            </div>
          </div>

          {/* Team Info Box */}
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary-600 text-[24px]">info</span>
              <div>
                <p className="text-sm font-bold text-primary-900 mb-1">What happens next?</p>
                <ul className="text-xs text-primary-700 space-y-1">
                  <li>You will be the owner of this team</li>
                  <li>You can invite members by email</li>
                  <li>Share resumes with the team for collaboration</li>
                  <li>Track team activity in the activity feed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
};

export default CreateTeamDialog;
