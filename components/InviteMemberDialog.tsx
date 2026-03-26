import React, { useState } from 'react';
import { MemberRole, InviteMemberRequest } from '../types';
import { inviteMember } from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import AccessibleDialog from './AccessibleDialog';

interface InviteMemberDialogProps {
  isOpen: boolean;
  teamId: number;
  onClose: () => void;
  onInviteSuccess?: () => void;
}

/**
 * InviteMemberDialog component for inviting new team members
 * Accessible dialog for sending team collaboration invitations
 */
const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  isOpen,
  teamId,
  onClose,
  onInviteSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    setEmailError(null);

    try {
      const request: InviteMemberRequest = {
        email: email.trim(),
        role,
      };

      await inviteMember(teamId, request);
      showSuccessToast(`Invitation sent to ${email}`);
      setEmail('');
      setRole('member');
      if (onInviteSuccess) {
        onInviteSuccess();
      }
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      showErrorToast(errorMessage);
      console.error(error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setEmailError(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isInviting && !emailError && email.trim()) {
      handleInvite();
    }
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        onClick={handleClose}
        disabled={isInviting}
        className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleInvite}
        disabled={isInviting || !!emailError || !email.trim()}
        className="flex-1 px-4 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isInviting ? (
          <span role="status" aria-live="polite" className="flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
              progress_activity
            </span>
            <span>Sending...</span>
          </span>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Send Invite</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      headerId="invite-dialog-title"
      descriptionId="invite-dialog-description"
      footer={footerContent}
      className="max-w-md"
    >
      <div>
        <p id="invite-dialog-description" className="text-sm text-slate-500 mb-4">
          Send an invitation to collaborate on your team
        </p>

        <div className="p-0 space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-bold text-slate-700">
              Email Address *
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter email address"
              className={`w-full px-4 py-3 rounded-lg border focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 ${
                emailError ? 'border-red-300' : 'border-slate-300'
              }`}
              disabled={isInviting}
            />
            {emailError && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {emailError}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label htmlFor="invite-role" className="text-sm font-bold text-slate-700">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 bg-white"
              disabled={isInviting}
            >
              <option value="member">Member - Can view and edit shared content</option>
              <option value="admin">Admin - Can manage members and settings</option>
              <option value="owner">Owner - Full control and team ownership</option>
            </select>
          </div>

          {/* Role Description */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px] mt-0.5">
                  info
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Role Permissions:</p>
                  <ul className="text-xs text-slate-600 mt-1 space-y-1">
                    <li>
                      <strong>Member:</strong> View and edit shared resumes, invite others
                    </li>
                    <li>
                      <strong>Admin:</strong> All member permissions + manage team settings
                    </li>
                    <li>
                      <strong>Owner:</strong> All permissions + delete team, transfer ownership
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
};

export default InviteMemberDialog;
