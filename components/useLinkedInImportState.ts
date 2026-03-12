import { useState, useRef, useCallback } from 'react';
import { LinkedInProfile, GitHubRepository } from '../types';

/**
 * Step type for the import dialog wizard
 */
export interface Step {
  id: 'upload' | 'oauth' | 'import' | 'projects' | 'complete';
  title: string;
  description?: string;
}

/**
 * Steps configuration for the import dialog wizard
 */
export const STEPS: Step[] = [
  {
    id: 'upload',
    title: 'Choose Import Method',
    description: 'Select how you want to import your data',
  },
  {
    id: 'oauth',
    title: 'Connect LinkedIn',
    description: 'Authorize access to your LinkedIn profile',
  },
  { id: 'import', title: 'Review Data', description: 'Preview and edit imported information' },
  {
    id: 'projects',
    title: 'Select Projects',
    description: 'Choose GitHub projects to add to your resume',
  },
  { id: 'complete', title: 'Import Complete', description: 'Your resume has been updated' },
];

/**
 * Custom hook to manage LinkedIn import dialog state and logic
 * Extracted to reduce component complexity
 */
export const useLinkedInImportState = (
  isOpen: boolean,
  linkedInConnected: boolean,
  linkedInProfile: LinkedInProfile | null,
  githubRepos: GitHubRepository[],
) => {
  const [currentStep, setCurrentStep] = useState<Step['id']>('upload');
  const [importMethod, setImportMethod] = useState<'oauth' | 'file' | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const oauthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);

  // Form states
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSkills, setEditedSkills] = useState<string[]>([]);

  // Get step index
  const getStepIndex = useCallback(() => {
    const steps: Step[] = [
      { id: 'upload', title: 'Upload' },
      { id: 'import', title: 'Import' },
      { id: 'projects', title: 'Projects' },
      { id: 'complete', title: 'Complete' },
    ];
    return steps.findIndex((s) => s.id === currentStep);
  }, [currentStep]);

  // Toggle repo selection
  const toggleRepoSelection = useCallback((repoId: number) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId],
    );
  }, []);

  // Reset form fields
  const resetFormFields = useCallback(() => {
    setEditedName('');
    setEditedEmail('');
    setEditedPhone('');
    setEditedLocation('');
    setEditedRole('');
    setEditedSummary('');
    setEditedSkills([]);
  }, []);

  // Reset all state
  const resetState = useCallback(() => {
    setCurrentStep('upload');
    setImportMethod(null);
    setSelectedRepoIds([]);
    setIsImporting(false);
    resetFormFields();
  }, [resetFormFields]);

  return {
    // State
    currentStep,
    setCurrentStep,
    importMethod,
    setImportMethod,
    isImporting,
    setIsImporting,
    dragOver,
    setDragOver,
    selectedRepoIds,
    setSelectedRepoIds,
    // Refs
    fileInputRef,
    folderInputRef,
    oauthCheckIntervalRef,
    messageHandlerRef,
    oauthWindow,
    setOauthWindow,
    // Form states
    editedName,
    setEditedName,
    editedEmail,
    setEditedEmail,
    editedPhone,
    setEditedPhone,
    editedLocation,
    setEditedLocation,
    editedRole,
    setEditedRole,
    editedSummary,
    setEditedSummary,
    editedSkills,
    setEditedSkills,
    // Methods
    getStepIndex,
    toggleRepoSelection,
    resetFormFields,
    resetState,
  };
};
