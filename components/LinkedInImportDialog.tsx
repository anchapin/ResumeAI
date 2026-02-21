import React, { useState, useRef, useEffect } from 'react';
import { SimpleResumeData, LinkedInProfile, GitHubRepository } from '../types';
import { importFromLinkedInFile } from '../utils/import';
import {
  connectLinkedIn,
  handleLinkedInCallback,
  importLinkedInProfile,
  fetchGitHubRepositories,
  disconnectLinkedIn,
} from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface LinkedInImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Partial<SimpleResumeData>) => void;
}

interface Step {
  id: 'upload' | 'oauth' | 'import' | 'projects' | 'complete';
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'upload', title: 'Choose Import Method', description: 'Select how you want to import your data' },
  { id: 'oauth', title: 'Connect LinkedIn', description: 'Authorize access to your LinkedIn profile' },
  { id: 'import', title: 'Review Data', description: 'Preview and edit imported information' },
  { id: 'projects', title: 'Select Projects', description: 'Choose GitHub projects to add to your resume' },
  { id: 'complete', title: 'Import Complete', description: 'Your resume has been updated' },
];

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

  // Form states for editing imported data
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSkills, setEditedSkills] = useState<string[]>([]);

  if (!isOpen) return null;

  const getStepIndex = () => STEPS.findIndex(s => s.id === currentStep);

  // Handle OAuth flow
  const handleOAuthConnect = async () => {
    try {
      setIsImporting(true);
      const authUrl = await connectLinkedIn();

      // Open popup window
      const popup = window.open(
        authUrl,
        'linkedin-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        showErrorToast('Please allow popups to connect to LinkedIn');
        setIsImporting(false);
        return;
      }

      setOauthWindow(popup);

      // Listen for OAuth completion via message
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'LINKEDIN_OAUTH_SUCCESS') {
          handleOAuthSuccess(event.data.code, event.data.state);
        } else if (event.data.type === 'LINKEDIN_OAUTH_ERROR') {
          handleOAuthError(event.data.error);
        }
      };

      window.addEventListener('message', messageHandler);

      // Cleanup on popup close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          if (!linkedInConnected) {
            setIsImporting(false);
            showErrorToast('OAuth window was closed');
          }
        }
      }, 500);

    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      showErrorToast(error instanceof Error ? error.message : 'Failed to connect to LinkedIn');
      setIsImporting(false);
    }
  };

  const handleOAuthSuccess = async (code: string, state: string) => {
    try {
      await handleLinkedInCallback(code, state);
      setLinkedInConnected(true);

      // Import profile data
      const profile = await importLinkedInProfile();
      setLinkedInProfile(profile);

      // Populate form fields
      setEditedName(profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim());
      setEditedEmail(profile.email || '');
      setEditedPhone(profile.phone || '');
      setEditedLocation(profile.location || '');
      setEditedRole(profile.headline || '');
      setEditedSummary(profile.summary || '');
      setEditedSkills(profile.skills || []);

      setCurrentStep('import');

    } catch (error) {
      console.error('LinkedIn import error:', error);
      showErrorToast(error instanceof Error ? error.message : 'Failed to import LinkedIn profile');
      setIsImporting(false);
    }
  };

  const handleOAuthError = (error: string) => {
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
      showErrorToast(error instanceof Error ? error.message : 'Failed to fetch GitHub repositories');
      // Still proceed to projects step even if no repos
      setCurrentStep('projects');
    }
  };

  // Handle project selection
  const toggleRepoSelection = (repoId: number) => {
    setSelectedRepoIds(prev =>
      prev.includes(repoId)
        ? prev.filter(id => id !== repoId)
        : [...prev, repoId]
    );
  };

  // Finalize import
  const finalizeImport = () => {
    const importedData: Partial<SimpleResumeData> = {
      name: editedName,
      email: editedEmail,
      phone: editedPhone,
      location: editedLocation,
      role: editedRole,
      summary: editedSummary,
      skills: editedSkills,
      experience: linkedInProfile?.experience?.map((exp, idx) => ({
        id: `li-exp-${idx}`,
        company: exp.company || '',
        role: exp.title || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current || !exp.endDate,
        description: exp.description || '',
        tags: [],
      })) || [],
      education: linkedInProfile?.education?.map((edu, idx) => ({
        id: `li-edu-${idx}`,
        institution: edu.institution || '',
        area: edu.field || '',
        studyType: edu.degree || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        courses: [],
      })) || [],
      projects: selectedRepoIds.map(repoId => {
        const repo = githubRepos.find(r => r.id === repoId);
        return {
          id: `gh-${repoId}`,
          name: repo?.name || '',
          description: repo?.description || '',
          url: repo?.url || '',
          roles: repo?.languages || [],
          startDate: '',
          endDate: '',
          highlights: repo?.topics || [],
        };
      }),
    };

    onImport(importedData);
    showSuccessToast('LinkedIn profile imported successfully!');
    setCurrentStep('complete');
    setIsImporting(false);
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('upload');
      setImportMethod(null);
      setLinkedInConnected(false);
      setLinkedInProfile(null);
      setGithubRepos([]);
      setSelectedRepoIds([]);
      setIsImporting(false);
    }
  }, [isOpen]);

  // File import handlers (existing functionality)
  const handleFileSelect = async (files: File | FileList) => {
    const fileList = files instanceof FileList ? Array.from(files) : (Array.isArray(files) ? files : [files]);
    if (fileList.length === 0) return;

    if (fileList.length === 1) {
      const file = fileList[0];
      const isJson = file.type === 'application/json' || file.name.endsWith('.json');
      const isZip = file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.endsWith('.zip');
      const isCsv = file.name.endsWith('.csv');

      if (!isJson && !isZip && !isCsv) {
        showErrorToast('Please select a valid file (JSON, ZIP) or a folder of CSVs.');
        return;
      }

      const maxSize = isZip ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showErrorToast(`File size exceeds ${maxSize / (1024 * 1024)}MB limit.`);
        return;
      }
    } else {
      let totalSize = 0;
      for (const f of fileList) totalSize += f.size;
      if (totalSize > 20 * 1024 * 1024) {
        showErrorToast('Total upload size exceeds 20MB limit.');
        return;
      }

      const hasCsv = fileList.some(f => f.name.toLowerCase().endsWith('.csv'));
      if (!hasCsv) {
        showErrorToast('Selected files do not contain any CSV files.');
        return;
      }
    }

    setIsImporting(true);

    try {
      const resumeData = await importFromLinkedInFile(fileList);

      const importedData: Partial<SimpleResumeData> = {
        name: resumeData.basics?.name || '',
        email: resumeData.basics?.email || '',
        phone: resumeData.basics?.phone || '',
        location: resumeData.location?.city || resumeData.location?.region || '',
        role: resumeData.basics?.label || '',
        summary: resumeData.basics?.summary || '',
        skills: resumeData.skills?.map(s => s.name || '').filter(Boolean) || [],
        experience: resumeData.work?.map(work => ({
          id: Math.random().toString(36).substring(2, 9),
          company: work.company || '',
          role: work.position || '',
          startDate: work.startDate || '',
          endDate: work.endDate || '',
          current: !work.endDate,
          description: work.summary || '',
          tags: [],
        })) || [],
        education: resumeData.education?.map(edu => ({
          id: Math.random().toString(36).substring(2, 9),
          institution: edu.institution || '',
          area: edu.area || '',
          studyType: edu.studyType || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          courses: edu.courses || [],
        })) || [],
        projects: resumeData.projects?.map(proj => ({
          id: Math.random().toString(36).substring(2, 9),
          name: proj.name || '',
          description: proj.description || '',
          url: proj.url || '',
          roles: proj.roles || [],
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          highlights: proj.highlights || [],
        })) || [],
      };

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
                    <p className={`text-xs font-bold ${idx <= getStepIndex() ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < getStepIndex() ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* OAuth Option */}
              <div
                onClick={() => setImportMethod('oauth')}
                className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  importMethod === 'oauth'
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#0077b5] size-12 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">link</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">Connect with LinkedIn</h3>
                    <p className="text-sm text-slate-600">
                      Securely connect your LinkedIn account to import your profile, experience, and skills in real-time.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Recommended</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Real-time</span>
                    </div>
                  </div>
                  {importMethod === 'oauth' && (
                    <span className="material-symbols-outlined text-primary-600">radio_button_checked</span>
                  )}
                </div>
              </div>

              {/* File Upload Option */}
              <div
                onClick={() => setImportMethod('file')}
                className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  importMethod === 'file'
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-slate-600 size-12 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">upload_file</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">Upload LinkedIn Export</h3>
                    <p className="text-sm text-slate-600">
                      Upload your LinkedIn data export (ZIP, JSON, or CSV files) to import your profile offline.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Get your export from LinkedIn Settings > Data Privacy > Get a copy of your data
                    </p>
                  </div>
                  {importMethod === 'file' && (
                    <span className="material-symbols-outlined text-primary-600">radio_button_checked</span>
                  )}
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => {
                  if (importMethod === 'oauth') {
                    handleOAuthConnect();
                  } else if (importMethod === 'file') {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={!importMethod || isImporting}
                className="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Processing...' : 'Continue'}
              </button>
            </div>
          )}

          {currentStep === 'import' && linkedInProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Location</label>
                  <input
                    type="text"
                    value={editedLocation}
                    onChange={(e) => setEditedLocation(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Professional Headline</label>
                <input
                  type="text"
                  value={editedRole}
                  onChange={(e) => setEditedRole(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Summary</label>
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {editedSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {skill}
                      <button
                        onClick={() => setEditedSkills(prev => prev.filter((_, i) => i !== idx))}
                        className="hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview Experience */}
              {linkedInProfile.experience && linkedInProfile.experience.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Experience ({linkedInProfile.experience.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {linkedInProfile.experience.slice(0, 3).map((exp, idx) => (
                      <div key={idx} className="text-sm bg-slate-50 p-3 rounded-lg">
                        <p className="font-medium text-slate-900">{exp.title} at {exp.company}</p>
                        <p className="text-slate-600 text-xs">{exp.startDate} - {exp.endDate || 'Present'}</p>
                      </div>
                    ))}
                    {linkedInProfile.experience.length > 3 && (
                      <p className="text-xs text-slate-500 text-center">
                        +{linkedInProfile.experience.length - 3} more positions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Education */}
              {linkedInProfile.education && linkedInProfile.education.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Education ({linkedInProfile.education.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {linkedInProfile.education.slice(0, 3).map((edu, idx) => (
                      <div key={idx} className="text-sm bg-slate-50 p-3 rounded-lg">
                        <p className="font-medium text-slate-900">{edu.institution}</p>
                        <p className="text-slate-600 text-xs">{edu.degree} in {edu.field}</p>
                      </div>
                    ))}
                    {linkedInProfile.education.length > 3 && (
                      <p className="text-xs text-slate-500 text-center">
                        +{linkedInProfile.education.length - 3} more education entries
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">
                  GitHub Projects ({githubRepos.length})
                </h3>
                <button
                  onClick={() => fetchRepos()}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Refresh
                </button>
              </div>

              {githubRepos.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-slate-300 text-5xl">folder_open</span>
                  <p className="text-slate-500 mt-2">No GitHub repositories found</p>
                  <p className="text-sm text-slate-400">You can still proceed without adding projects</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {githubRepos.map(repo => (
                    <div
                      key={repo.id}
                      onClick={() => toggleRepoSelection(repo.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedRepoIds.includes(repo.id)
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                          : 'border-slate-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{repo.name}</h4>
                          {repo.description && (
                            <p className="text-sm text-slate-600 mt-1">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">code</span>
                              {repo.languages.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">star</span>
                              {repo.stars}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">fork_right</span>
                              {repo.forks}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {selectedRepoIds.includes(repo.id) ? (
                            <span className="material-symbols-outlined text-primary-600 text-2xl">check_box</span>
                          ) : (
                            <span className="material-symbols-outlined text-slate-300 text-2xl">check_box_outline_blank</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 text-center">
                Selected {selectedRepoIds.length} of {githubRepos.length} repositories
              </p>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="bg-green-100 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600 text-3xl">check</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Import Complete!</h3>
              <p className="text-slate-600">Your LinkedIn profile has been imported successfully.</p>
            </div>
          )}

          {currentStep === 'upload' && importMethod === 'file' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleButtonClick}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragOver
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
                  <span className="material-symbols-outlined text-5xl text-slate-400">cloud_upload</span>
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
              {isImporting ? 'Processing...' : currentStep === 'import' ? 'Next: Projects' : 'Complete Import'}
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
        directory=""
        onChange={handleInputChange}
        className="hidden"
        disabled={isImporting}
      />
    </div>
  );
};

export default LinkedInImportDialog;
