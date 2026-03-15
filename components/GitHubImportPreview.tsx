import React, { useState, useCallback } from 'react';
import { GitHubRepository } from '../utils/githubApi';
import Dialog from './ui/Dialog';
import Button from './ui/Button';

/**
 * Customization data for a project
 */
export interface ProjectCustomization {
  include: boolean;
  role: string;
  description: string;
  technologies: string[];
  startDate: string;
  endDate: string | null;
  current: boolean;
  highlights: string[];
}

/**
 * Props for GitHubImportPreview component
 */
export interface GitHubImportPreviewProps {
  isOpen: boolean;
  selectedRepos: GitHubRepository[];
  onComplete: (projects: Record<string, unknown>[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

/**
 * Format date for display (YYYY-MM to readable format)
 */
 
function _formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * Extract year-month from ISO date string
 */
function extractYearMonth(isoDate: string): string {
  return isoDate.substring(0, 7);
}

/**
 * Project Customization Form Component
 */
const ProjectCustomizationForm: React.FC<{
  repository: GitHubRepository;
  customization: ProjectCustomization;
  onUpdate: (updates: Partial<ProjectCustomization>) => void;
  onAutoGenerate: () => void;
  isGenerating: boolean;
}> = ({ repository, customization, onUpdate, onAutoGenerate, isGenerating }) => {
  // Handle highlight change
  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...customization.highlights];
    newHighlights[index] = value;
    onUpdate({ highlights: newHighlights });
  };

  // Add new highlight
  const addHighlight = () => {
    onUpdate({ highlights: [...customization.highlights, ''] });
  };

  // Remove highlight
  const removeHighlight = (index: number) => {
    onUpdate({ highlights: customization.highlights.filter((_, i) => i !== index) });
  };

  // Handle technology tag change
  const handleTechChange = (index: number, value: string) => {
    const newTechs = [...customization.technologies];
    newTechs[index] = value;
    onUpdate({ technologies: newTechs });
  };

  // Add technology
  const addTech = () => {
    onUpdate({ technologies: [...customization.technologies, ''] });
  };

  // Remove technology
  const removeTech = (index: number) => {
    onUpdate({ technologies: customization.technologies.filter((_, i) => i !== index) });
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
      {/* Header with checkbox and repo name */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={customization.include}
          onChange={(e) => onUpdate({ include: e.target.checked })}
          className="mt-1 w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
          aria-label={`Include ${repository.name} in import`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-bold text-slate-900 hover:text-primary-600"
            >
              {repository.name}
            </a>
            {repository.private && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                Private
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">{repository.description || 'No description'}</p>
        </div>
      </div>

      {/* Role Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Your Role <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={customization.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          placeholder="e.g., Lead Developer, Full Stack Engineer, Contributor"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Description Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={customization.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Brief description of the project..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Technologies */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Technologies
        </label>
        <div className="space-y-2">
          {customization.technologies.map((tech, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={tech}
                onChange={(e) => handleTechChange(index, e.target.value)}
                placeholder="Technology name"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => removeTech(index)}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                aria-label="Remove technology"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addTech}>
            <span className="material-symbols-outlined text-[18px] mr-1">add</span>
            Add Technology
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Start Date
          </label>
          <input
            type="month"
            value={customization.startDate}
            onChange={(e) => onUpdate({ startDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            End Date
          </label>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={customization.endDate || ''}
              onChange={(e) => onUpdate({ endDate: e.target.value || null })}
              disabled={customization.current}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100"
            />
            <label className="flex items-center gap-1 text-sm text-slate-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={customization.current}
                onChange={(e) => onUpdate({ current: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              Current
            </label>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Highlights <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <div className="space-y-2">
          {customization.highlights.map((highlight, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-slate-400 text-sm mt-2">•</span>
              <input
                type="text"
                value={highlight}
                onChange={(e) => handleHighlightChange(index, e.target.value)}
                placeholder="Key achievement or responsibility"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => removeHighlight(index)}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                aria-label="Remove highlight"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={addHighlight}>
              <span className="material-symbols-outlined text-[18px] mr-1">add</span>
              Add Highlight
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-[18px] mr-1 animate-spin">progress_activity</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px] mr-1">auto_awesome</span>
                  Auto-generate from README
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * GitHub Import Preview Component
 *
 * Allows users to customize and review repositories before importing to resume
 */
export const GitHubImportPreview: React.FC<GitHubImportPreviewProps> = ({
  isOpen,
  selectedRepos,
  onComplete,
  onBack,
  onCancel,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  // Initialize customizations
  const [customizations, setCustomizations] = useState<Record<number, ProjectCustomization>>(() => {
    const initial: Record<number, ProjectCustomization> = {};
    selectedRepos.forEach((repo) => {
      initial[repo.id] = {
        include: true,
        role: '',
        description: repo.description || '',
        technologies: repo.language ? [repo.language] : [],
        startDate: extractYearMonth(repo.created_at),
        endDate: null,
        current: true,
        highlights: [],
      };
    });
    return initial;
  });

  // Update customization
  const updateCustomization = useCallback((repoId: number, updates: Partial<ProjectCustomization>) => {
    setCustomizations((prev) => ({
      ...prev,
      [repoId]: {
        ...prev[repoId],
        ...updates,
      },
    }));
  }, []);

  // Handle auto-generate (placeholder - would call backend API)
  const handleAutoGenerate = useCallback(async (repoId: number) => {
    const repo = selectedRepos.find((r) => r.id === repoId);
    if (!repo) return;

    setGeneratingId(repoId);
    try {
      // TODO: Call backend API to generate project details
      // For now, just simulate with a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setGeneratingId(null);
    }
  }, [selectedRepos]);

  // Handle import
  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      // Filter to only included repos
      const includedRepos = selectedRepos.filter((repo) => customizations[repo.id]?.include);

      // Format projects for import
      const projects = includedRepos.map((repo) => ({
        id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        ...customizations[repo.id],
      }));

      // TODO: Call backend import API
      // For now, just return the formatted projects
      onComplete(projects);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import projects');
    } finally {
      setIsImporting(false);
    }
  }, [selectedRepos, customizations, onComplete]);

  // Calculate stats
  const includedCount = selectedRepos.filter((repo) => customizations[repo.id]?.include).length;
  const hasIncluded = includedCount > 0;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title="Review Your Selection"
      aria-describedby="import-preview-description"
    >
      <div className="space-y-4">
        {/* Description */}
        <p id="import-preview-description" className="text-sm text-slate-600">
          Customize how each repository will appear in your resume. You can skip repositories by
          unchecking them.
        </p>

        {/* Summary */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-primary-800">
            <span className="material-symbols-outlined text-[20px]">info</span>
            <span className="text-sm font-medium">
              {includedCount} of {selectedRepos.length} repositories will be imported
            </span>
          </div>
        </div>

        {/* Project Customization Forms */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {selectedRepos.map((repo) => (
            <ProjectCustomizationForm
              key={repo.id}
              repository={repo}
              customization={customizations[repo.id]}
              onUpdate={(updates) => updateCustomization(repo.id, updates)}
              onAutoGenerate={() => handleAutoGenerate(repo.id)}
              isGenerating={generatingId === repo.id}
            />
          ))}
        </div>

        {/* Error Message */}
        {importError && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {importError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onBack} disabled={isImporting}>
            <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!hasIncluded || isImporting}
          >
            {isImporting ? (
              <>
                <span className="material-symbols-outlined text-[18px] mr-1 animate-spin">progress_activity</span>
                Importing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px] mr-1">download</span>
                Import to Resume ({includedCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default GitHubImportPreview;
