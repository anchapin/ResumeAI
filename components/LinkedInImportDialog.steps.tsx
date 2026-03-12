import React from 'react';
import { LinkedInProfile, GitHubRepository } from '../types';

interface UploadStepProps {
  importMethod: 'oauth' | 'file' | null;
  setImportMethod: (method: 'oauth' | 'file') => void;
  isImporting: boolean;
  onOAuthConnect: () => void;
  onFileSelect: () => void;
}

/**
 * Upload step content - OAuth and file import options
 */
export const UploadStep: React.FC<UploadStepProps> = ({
  importMethod,
  setImportMethod,
  isImporting,
  onOAuthConnect,
  onFileSelect,
}) => (
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
            Securely connect your LinkedIn account to import your profile, experience, and
            skills in real-time.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Recommended
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Real-time
            </span>
          </div>
        </div>
        {importMethod === 'oauth' && (
          <span className="material-symbols-outlined text-primary-600">
            radio_button_checked
          </span>
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
            Upload your LinkedIn data export (ZIP, JSON, or CSV files) to import your
            profile offline.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Get your export from LinkedIn Settings &gt; Data Privacy &gt; Get a copy of
            your data
          </p>
        </div>
        {importMethod === 'file' && (
          <span className="material-symbols-outlined text-primary-600">
            radio_button_checked
          </span>
        )}
      </div>
    </div>

    {/* Continue Button */}
    <button
      onClick={() => {
        if (importMethod === 'oauth') {
          onOAuthConnect();
        } else if (importMethod === 'file') {
          onFileSelect();
        }
      }}
      disabled={!importMethod || isImporting}
      className="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isImporting ? 'Processing...' : 'Continue'}
    </button>
  </div>
);

interface ImportStepProps {
  linkedInProfile: LinkedInProfile;
  editedName: string;
  editedEmail: string;
  editedPhone: string;
  editedLocation: string;
  editedRole: string;
  editedSummary: string;
  editedSkills: string[];
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onSkillsChange: (skills: string[]) => void;
}

/**
 * Import step content - form for editing imported data
 */
export const ImportStep: React.FC<ImportStepProps> = ({
  linkedInProfile,
  editedName,
  editedEmail,
  editedPhone,
  editedLocation,
  editedRole,
  editedSummary,
  editedSkills,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onLocationChange,
  onRoleChange,
  onSummaryChange,
  onSkillsChange,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Full Name</label>
        <input
          type="text"
          value={editedName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Email</label>
        <input
          type="email"
          value={editedEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Phone</label>
        <input
          type="text"
          value={editedPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Location</label>
        <input
          type="text"
          value={editedLocation}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        />
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">Professional Headline</label>
      <input
        type="text"
        value={editedRole}
        onChange={(e) => onRoleChange(e.target.value)}
        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
      />
    </div>

    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">Summary</label>
      <textarea
        value={editedSummary}
        onChange={(e) => onSummaryChange(e.target.value)}
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
              onClick={() => onSkillsChange(editedSkills.filter((_, i) => i !== idx))}
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
        <h4 className="text-sm font-bold text-slate-700 mb-2">
          Experience ({linkedInProfile.experience.length})
        </h4>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {linkedInProfile.experience.slice(0, 3).map((exp, idx) => (
            <div key={idx} className="text-sm bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-900">
                {exp.title} at {exp.company}
              </p>
              <p className="text-slate-600 text-xs">
                {exp.startDate} - {exp.endDate || 'Present'}
              </p>
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
        <h4 className="text-sm font-bold text-slate-700 mb-2">
          Education ({linkedInProfile.education.length})
        </h4>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {linkedInProfile.education.slice(0, 3).map((edu, idx) => (
            <div key={idx} className="text-sm bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-900">{edu.institution}</p>
              <p className="text-slate-600 text-xs">
                {edu.degree} in {edu.field}
              </p>
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
);

interface ProjectsStepProps {
  githubRepos: GitHubRepository[];
  selectedRepoIds: number[];
  onToggleRepo: (repoId: number) => void;
  onRefresh: () => void;
}

/**
 * Projects step content - GitHub repository selection
 */
export const ProjectsStep: React.FC<ProjectsStepProps> = ({
  githubRepos,
  selectedRepoIds,
  onToggleRepo,
  onRefresh,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-slate-900">GitHub Projects ({githubRepos.length})</h3>
      <button
        onClick={onRefresh}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        Refresh
      </button>
    </div>

    {githubRepos.length === 0 ? (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-slate-300 text-5xl">
          folder_open
        </span>
        <p className="text-slate-500 mt-2">No GitHub repositories found</p>
        <p className="text-sm text-slate-400">
          You can still proceed without adding projects
        </p>
      </div>
    ) : (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {githubRepos.map((repo) => (
          <div
            key={repo.id}
            onClick={() => onToggleRepo(repo.id)}
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
                    {repo.languages?.[0] || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    {repo.stars}
                  </span>
                </div>
              </div>
              {selectedRepoIds.includes(repo.id) && (
                <span className="material-symbols-outlined text-primary-600">
                  check_circle
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

interface CompleteStepProps {
  onClose: () => void;
}

/**
 * Complete step content - success message
 */
export const CompleteStep: React.FC<CompleteStepProps> = ({ onClose }) => (
  <div className="text-center py-8">
    <div className="bg-green-100 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
      <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">Import Complete!</h3>
    <p className="text-slate-600 mb-6">
      Your LinkedIn profile has been imported successfully.
    </p>
    <button
      onClick={onClose}
      className="px-6 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors"
    >
      Done
    </button>
  </div>
);
