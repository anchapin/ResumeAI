/* eslint-disable complexity */
import React, { useState, useRef, useEffect } from 'react';
import { SimpleResumeData, LinkedInProfile, GitHubRepository } from '../types';
import { importFromLinkedInFile } from '../utils/import';
import {
  connectLinkedIn,
  handleLinkedInCallback,
  fetchGitHubRepositories,
} from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import {
  populateFormFieldsFromProfile,
  cleanupOAuthResources,
  createOAuthMessageHandler,
  setupPopupMonitor,
  validateFilesForImport,
  normalizeFileList,
  transformFileImportData,
  buildImportedDataFromOAuth,
} from './linkedin-import-helpers';
import {
  UploadStep,
  ImportStep,
  ProjectsStep,
  CompleteStep,
} from './LinkedInImportDialog.steps';
import { Step, STEPS } from './useLinkedInImportState';

interface LinkedInImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Partial<SimpleResumeData>) => void;
}

/**
 * LinkedIn Import Dialog Component
 *
 * Allows users to import their LinkedIn profile data via OAuth or file upload.
 * Supports both OAuth-based real-time import and file-based import (ZIP, JSON, CSV).
 */
export const LinkedInImportDialog: React.FC<LinkedInImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [currentStep, setCurrentStep] = useState<Step['id']>('upload');
  const [importMethod, setImportMethod] = useState<'oauth' | 'file' | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // OAuth states
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>([]);
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);

  // Ref to track OAuth popup check interval for cleanup
  const oauthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Form states for editing imported data
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSkills, setEditedSkills] = useState<string[]>([]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up OAuth resources using helper
      cleanupOAuthResources(oauthCheckIntervalRef, messageHandlerRef, oauthWindow);
      setOauthWindow(null);

      setCurrentStep('upload');
      setImportMethod(null);
      setLinkedInConnected(false);
      setLinkedInProfile(null);
      setGithubRepos([]);
      setSelectedRepoIds([]);
      setIsImporting(false);
    }
  }, [isOpen, oauthWindow]);

  if (!isOpen) return null;

  const getStepIndex = () => STEPS.findIndex((s) => s.id === currentStep);

  // Handle OAuth flow
  const handleOAuthConnect = async () => {
    try {
      setIsImporting(true);
      const authUrl = await connectLinkedIn();

      // Open popup window
      const popup = window.open(
        authUrl,
        'linkedin-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes',
      );

      if (!popup) {
        showErrorToast('Please allow popups to connect to LinkedIn');
        setIsImporting(false);
        return;
      }

      setOauthWindow(popup);

      // Cleanup any existing interval/handler from previous attempts
      cleanupOAuthResources(oauthCheckIntervalRef, messageHandlerRef, null);

      // Use extracted message handler factory
      messageHandlerRef.current = createOAuthMessageHandler({
        onSuccess: (code, state) => handleOAuthSuccess(code, state),
        onError: (error) => handleOAuthError(error),
      });
      window.addEventListener('message', messageHandlerRef.current);

      // Use extracted popup monitor setup
      setupPopupMonitor(popup, oauthCheckIntervalRef, messageHandlerRef, () => {
        if (!linkedInConnected) {
          setIsImporting(false);
          showErrorToast('OAuth window was closed');
        }
      });
    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      showErrorToast(error instanceof Error ? error.message : 'Failed to connect to LinkedIn');
      setIsImporting(false);
    }
  };

  const handleOAuthSuccess = async (code: string, state: string) => {
    try {
      // Clear OAuth interval and event listener using helper
      cleanupOAuthResources(oauthCheckIntervalRef, messageHandlerRef, oauthWindow);
      setOauthWindow(null);

      // Exchange code for profile data
      const profile = await handleLinkedInCallback(code, state);
      setLinkedInConnected(true);
      setLinkedInProfile(profile);

      // Populate form fields from profile data using helper
      populateFormFieldsFromProfile(
        profile,
        setEditedName,
        setEditedEmail,
        setEditedPhone,
        setEditedLocation,
        setEditedRole,
        setEditedSummary,
        setEditedSkills,
      );

      setCurrentStep('import');
      showSuccessToast('LinkedIn profile imported successfully!');
    } catch (error) {
      console.error('LinkedIn import error:', error);
      showErrorToast(error instanceof Error ? error.message : 'Failed to import LinkedIn profile');
      setIsImporting(false);
    }
  };

  const handleOAuthError = (error: string) => {
    // Clear OAuth interval and event listener using helper
    cleanupOAuthResources(oauthCheckIntervalRef, messageHandlerRef, oauthWindow);
    setOauthWindow(null);

    console.error('OAuth error:', error);
    showErrorToast(error);
    setIsImporting(false);
  };

  // Fetch GitHub repositories
  const fetchRepos = async () => {
    try {
      const repos = await fetchGitHubRepositories();
      setGithubRepos(repos);
      setCurrentStep('projects');
    } catch (error) {
      console.error('GitHub fetch error:', error);
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to fetch GitHub repositories',
      );
      // Still proceed to projects step even if no repos
      setCurrentStep('projects');
    }
  };

  // Handle project selection
  const toggleRepoSelection = (repoId: number) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId],
    );
  };

  // Finalize import - uses extracted helper to reduce complexity
  const finalizeImport = () => {
    const importedData = buildImportedDataFromOAuth(
      editedName,
      editedEmail,
      editedPhone,
      editedLocation,
      editedRole,
      editedSummary,
      editedSkills,
      linkedInProfile,
      selectedRepoIds,
      githubRepos,
    );

    onImport(importedData);
    showSuccessToast('LinkedIn profile imported successfully!');
    setCurrentStep('complete');
    setIsImporting(false);
  };

  // File import handlers (existing functionality)
  const handleFileSelect = async (files: File | FileList) => {
    const fileList = normalizeFileList(files);
    if (fileList.length === 0) return;

    // Validate files using helper
    if (!validateFilesForImport(files)) {
      return;
    }

    setIsImporting(true);

    try {
      const resumeData = await importFromLinkedInFile(fileList);
      const importedData = transformFileImportData(resumeData);

      onImport(importedData);
      showSuccessToast('LinkedIn profile imported successfully!');
      onClose();
    } catch (error) {
      console.error('LinkedIn import error:', error);
      showErrorToast(error instanceof Error ? error.message : 'Failed to import LinkedIn profile.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFolderButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    folderInputRef.current?.click();
  };

  // Conditional render - must be after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-[#0077b5] size-10 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">account_circle</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Import from LinkedIn</h2>
              <p className="text-sm text-slate-500">Import your profile and experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isImporting}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      idx < getStepIndex()
                        ? 'bg-green-500 text-white'
                        : idx === getStepIndex()
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {idx < getStepIndex() ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p
                      className={`text-xs font-bold ${idx <= getStepIndex() ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      {step.title}
                    </p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${idx < getStepIndex() ? 'bg-green-500' : 'bg-slate-200'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 'upload' && (
            <UploadStep
              importMethod={importMethod}
              setImportMethod={setImportMethod}
              isImporting={isImporting}
              onOAuthConnect={handleOAuthConnect}
              onFileSelect={() => fileInputRef.current?.click()}
            />
          )}

          {currentStep === 'import' && linkedInProfile && (
            <ImportStep
              linkedInProfile={linkedInProfile}
              editedName={editedName}
              editedEmail={editedEmail}
              editedPhone={editedPhone}
              editedLocation={editedLocation}
              editedRole={editedRole}
              editedSummary={editedSummary}
              editedSkills={editedSkills}
              onNameChange={setEditedName}
              onEmailChange={setEditedEmail}
              onPhoneChange={setEditedPhone}
              onLocationChange={setEditedLocation}
              onRoleChange={setEditedRole}
              onSummaryChange={setEditedSummary}
              onSkillsChange={setEditedSkills}
            />
          )}

          {currentStep === 'projects' && (
            <ProjectsStep
              githubRepos={githubRepos}
              selectedRepoIds={selectedRepoIds}
              onToggleRepo={toggleRepoSelection}
              onRefresh={fetchRepos}
            />
          )}

          {currentStep === 'complete' && (
            <CompleteStep onClose={onClose} />
          )}

          {currentStep === 'upload' && importMethod === 'file' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleButtonClick}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${
                  dragOver
                    ? 'border-primary-500 bg-primary-50 scale-[1.02]'
                    : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                }
                ${isImporting ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.zip,application/json,application/zip"
                onChange={handleInputChange}
                className="hidden"
                disabled={isImporting}
              />

              {isImporting ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                  <p className="text-slate-600 font-medium">Importing your LinkedIn data...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-slate-400">
                    cloud_upload
                  </span>
                  <div>
                    <p className="text-slate-700 font-semibold">
                      Drop your LinkedIn export file here
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      click to browse (ZIP/JSON) <span className="mx-1">or</span>
                      <button
                        type="button"
                        onClick={handleFolderButtonClick}
                        className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                      >
                        upload folder
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={() => {
              if (currentStep === 'upload') {
                onClose();
              } else if (currentStep === 'import') {
                setCurrentStep('oauth');
              } else if (currentStep === 'projects') {
                setCurrentStep('import');
              }
            }}
            disabled={isImporting}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            {currentStep === 'upload' ? 'Cancel' : 'Back'}
          </button>

          {currentStep !== 'upload' && currentStep !== 'complete' && (
            <button
              onClick={() => {
                if (currentStep === 'import') {
                  fetchRepos();
                } else if (currentStep === 'projects') {
                  finalizeImport();
                }
              }}
              disabled={isImporting}
              className="px-5 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50"
            >
              {isImporting
                ? 'Processing...'
                : currentStep === 'import'
                  ? 'Next: Projects'
                  : 'Complete Import'}
            </button>
          )}

          {currentStep === 'complete' && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Hidden Folder Input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory is non-standard but supported
        webkitdirectory=""
        // eslint-disable-next-line react/no-unknown-property
        directory=""
        onChange={handleInputChange}
        className="hidden"
        disabled={isImporting}
      />
    </div>
  );
};

export default LinkedInImportDialog;
