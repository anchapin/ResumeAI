import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SimpleResumeData } from '../types';
import { mockResumeData } from '../__mocks__/resume';
import {
  loadResumeData,
  StorageError,
  getStorageErrorMessage,
} from '../utils/storage';
import { sanitizeInput } from '../utils/security';
import type { FeatureFlagConfig } from '../src/lib/feature-flags';

/**
 * Tailoring change type for resume tailoring feature
 */
export interface TailoringChange {
  id: string;
  type: 'add' | 'remove' | 'modify';
  section: string;
  field: string;
  originalValue: string;
  newValue: string;
  // Legacy aliases for backward compatibility
  original?: string;
  proposed?: string;
  reason: string;
  author?: string;
  accepted: boolean;
  rejected: boolean;
  timestamp: string | Date;
}

/**
 * Version snapshot type for version history feature
 */
export interface VersionSnapshot {
  id: string;
  type: 'manual' | 'auto' | 'ai_tailoring' | 'auto-before-restore';
  timestamp: string | Date;
  resumeData: SimpleResumeData;
  description: string;
  label?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
}

export type Theme = 'light' | 'dark';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AppState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  resumeData: SimpleResumeData;
  isResumeLoaded: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  resumeError: string | null;
  theme: Theme;
  showShortcuts: boolean;
  globalLoading: boolean;
  featureFlags: FeatureFlagConfig | null;
  // Cover letter state
  currentJobDescription: string;
  coverLetter: string;
  coverLetterTone: string;
  isGeneratingCoverLetter: boolean;
  coverLetterError: string | null;
  // Job description state
  jobDescriptionUrl: string;
  parsedJobDescription: Record<string, unknown> | null;
  // Tailoring state
  tailoredResume: SimpleResumeData | null;
  tailoringChanges: TailoringChange[];
  isTailoring: boolean;
  tailoringError: string | null;
  tailoringKeywords: string[];
  tailoringSuggestions: string[];
  showTailoringSuggestions: boolean;
  // Version history state
  versionHistory: VersionSnapshot[];
}

interface AppActions {
  setUser: (user: AuthUser | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearAuthError: () => void;
  setResumeData: (data: SimpleResumeData | ((prev: SimpleResumeData) => SimpleResumeData)) => void;
  loadResume: () => Promise<void>;
  setSaveStatus: (status: SaveStatus) => void;
  setLastSaved: (date: Date | null) => void;
  setResumeError: (error: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setShowShortcuts: (show: boolean) => void;
  toggleShortcuts: () => void;
  setGlobalLoading: (isLoading: boolean) => void;
  setFeatureFlags: (flags: FeatureFlagConfig | null) => void;
  // Cover letter actions
  setCoverLetter: (coverLetter: string) => void;
  setCoverLetterTone: (tone: string) => void;
  setIsGeneratingCoverLetter: (isGenerating: boolean) => void;
  setCoverLetterError: (error: string | null) => void;
  clearCoverLetter: () => void;
  // Job description actions
  setCurrentJobDescription: (description: string) => void;
  setJobDescriptionUrl: (url: string) => void;
  setIsTailoring: (isTailoring: boolean) => void;
  setTailoringError: (error: string | null) => void;
  setTailoredResume: (resume: SimpleResumeData | null) => void;
  setTailoringChanges: (changes: TailoringChange[]) => void;
  setTailoringKeywords: (keywords: string[]) => void;
  setTailoringSuggestions: (suggestions: string[]) => void;
  acceptTailoringChange: (index: number) => void;
  rejectTailoringChange: (index: number) => void;
  setShowTailoringSuggestions: (show: boolean) => void;
  toggleTailoringSuggestions: () => void;
  applyTailoring: () => void;
  clearTailoring: () => void;
  // Version history actions
  takeSnapshot: (label: string, type?: string) => void;
  restoreSnapshot: (id: string) => void;
  clearVersionHistory: () => void;
}

type AppStore = AppState & AppActions;

// Use centralized mock data from __mocks__/resume.ts
const initialResumeData: SimpleResumeData = mockResumeData;

const sanitizeResumeData = (data: SimpleResumeData): SimpleResumeData => {
  const sanitizeString = (str: unknown): string => {
    if (typeof str === 'string') {
      return sanitizeInput(str);
    }
    return String(str);
  };

  const sanitizeExperience = (
    exp: SimpleResumeData['experience'][0],
  ): SimpleResumeData['experience'][0] => ({
    ...exp,
    company: sanitizeString(exp.company),
    role: sanitizeString(exp.role),
    startDate: sanitizeString(exp.startDate),
    endDate: sanitizeString(exp.endDate),
    description: sanitizeString(exp.description),
    tags: Array.isArray(exp.tags) ? exp.tags.map(sanitizeString) : [],
  });

  const sanitizeEducation = (
    edu: SimpleResumeData['education'][0],
  ): SimpleResumeData['education'][0] => ({
    ...edu,
    institution: sanitizeString(edu.institution),
    area: sanitizeString(edu.area),
    studyType: sanitizeString(edu.studyType),
    startDate: sanitizeString(edu.startDate),
    endDate: sanitizeString(edu.endDate),
    courses: Array.isArray(edu.courses) ? edu.courses.map(sanitizeString) : [],
  });

  const sanitizeProject = (
    proj: SimpleResumeData['projects'][0],
  ): SimpleResumeData['projects'][0] => ({
    ...proj,
    name: sanitizeString(proj.name),
    description: sanitizeString(proj.description),
    url: sanitizeString(proj.url),
    roles: Array.isArray(proj.roles) ? proj.roles.map(sanitizeString) : [],
    startDate: sanitizeString(proj.startDate),
    endDate: sanitizeString(proj.endDate),
    highlights: Array.isArray(proj.highlights) ? proj.highlights.map(sanitizeString) : [],
  });

  return {
    name: sanitizeString(data.name),
    email: sanitizeString(data.email),
    phone: sanitizeString(data.phone),
    location: sanitizeString(data.location),
    role: sanitizeString(data.role),
    summary: sanitizeString(data.summary),
    skills: Array.isArray(data.skills) ? data.skills.map(sanitizeString) : [],
    experience: Array.isArray(data.experience) ? data.experience.map(sanitizeExperience) : [],
    education: Array.isArray(data.education) ? data.education.map(sanitizeEducation) : [],
    projects: Array.isArray(data.projects) ? data.projects.map(sanitizeProject) : [],
  };
};

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAuthLoading: false,
      authError: null,
      resumeData: initialResumeData,
      isResumeLoaded: false,
      saveStatus: 'idle' as SaveStatus,
      lastSaved: null as Date | null,
      resumeError: null,
      theme: 'light' as Theme,
      showShortcuts: false,
      globalLoading: false,
      featureFlags: null,
      // Cover letter state
      currentJobDescription: '',
      coverLetter: '',
      coverLetterTone: 'professional',
      isGeneratingCoverLetter: false,
      coverLetterError: null,
      // Job description state
      jobDescriptionUrl: '',
      parsedJobDescription: null,
      // Tailoring state
      tailoredResume: null,
      tailoringChanges: [],
      isTailoring: false,
      tailoringError: null,
      tailoringKeywords: [],
      tailoringSuggestions: [],
      showTailoringSuggestions: true,
      // Version history state
      versionHistory: [],
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
      setAuthError: (authError) => set({ authError }),
      clearAuthError: () => set({ authError: null }),
      setGlobalLoading: (globalLoading) => set({ globalLoading }),
      setFeatureFlags: (featureFlags) => set({ featureFlags }),
      setResumeData: (data) =>
        set((state) => {
          const newData = typeof data === 'function' ? data(state.resumeData) : data;
          const sanitizedData = sanitizeResumeData(newData);
          return { resumeData: sanitizedData };
        }),
      loadResume: async () => {
        try {
          const savedData = loadResumeData();
          if (savedData) {
            const validatedData: SimpleResumeData = {
              ...savedData,
              skills: Array.isArray(savedData.skills) ? savedData.skills : [],
              experience: Array.isArray(savedData.experience) ? savedData.experience : [],
              education: Array.isArray(savedData.education) ? savedData.education : [],
              projects: Array.isArray(savedData.projects) ? savedData.projects : [],
            };
            const sanitizedData = sanitizeResumeData(validatedData);
            set({ resumeData: sanitizedData, isResumeLoaded: true });
          } else {
            set({ isResumeLoaded: true });
          }
        } catch (error) {
          if (error instanceof StorageError) {
            const errorMessage = getStorageErrorMessage(error);
            set({ resumeError: errorMessage, isResumeLoaded: true });
          }
        }
      },
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      setLastSaved: (lastSaved) => set({ lastSaved }),
      setResumeError: (resumeError) => set({ resumeError }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setShowShortcuts: (showShortcuts) => set({ showShortcuts }),
      toggleShortcuts: () => set((state) => ({ showShortcuts: !state.showShortcuts })),
      // Cover letter actions
      setCoverLetter: (coverLetter) => set({ coverLetter }),
      setCoverLetterTone: (coverLetterTone) => set({ coverLetterTone }),
      setIsGeneratingCoverLetter: (isGeneratingCoverLetter) => set({ isGeneratingCoverLetter }),
      setCoverLetterError: (coverLetterError) => set({ coverLetterError }),
      clearCoverLetter: () => set({ coverLetter: '', coverLetterError: null }),
      // Job description actions
      setCurrentJobDescription: (currentJobDescription) => set({ currentJobDescription }),
      setJobDescriptionUrl: (jobDescriptionUrl) => set({ jobDescriptionUrl }),
      setIsTailoring: (isTailoring) => set({ isTailoring }),
      setTailoringError: (tailoringError) => set({ tailoringError }),
      setTailoredResume: (tailoredResume) => set({ tailoredResume }),
      setTailoringChanges: (tailoringChanges) => set({ tailoringChanges }),
      setTailoringKeywords: (tailoringKeywords) => set({ tailoringKeywords }),
      setTailoringSuggestions: (tailoringSuggestions) => set({ tailoringSuggestions }),
      setShowTailoringSuggestions: (showTailoringSuggestions) => set({ showTailoringSuggestions }),
      toggleTailoringSuggestions: () =>
        set((state) => ({ showTailoringSuggestions: !state.showTailoringSuggestions })),
      acceptTailoringChange: (index) =>
        set((state) => {
          const changes = [...state.tailoringChanges];
          if (changes[index]) {
            changes[index] = { ...changes[index], accepted: true };
            // Apply the change to tailoredResume
            const change = changes[index];
            if (state.tailoredResume) {
              const updatedResume = { ...state.tailoredResume };
              if (change.section === 'summary') {
                updatedResume.summary = change.proposed;
              }
              // Other sections would need similar handling
              return { tailoringChanges: changes, tailoredResume: updatedResume };
            }
          }
          return { tailoringChanges: changes };
        }),
      rejectTailoringChange: (index) =>
        set((state) => {
          const changes = [...state.tailoringChanges];
          if (changes[index]) {
            changes[index] = { ...changes[index], accepted: false };
          }
          return { tailoringChanges: changes };
        }),
      applyTailoring: () =>
        set((state) => {
          if (state.tailoredResume) {
            return { resumeData: state.tailoredResume, tailoredResume: null };
          }
          return {};
        }),
      clearTailoring: () =>
        set({
          tailoredResume: null,
          tailoringChanges: [],
          tailoringError: null,
          tailoringKeywords: [],
          tailoringSuggestions: [],
          isTailoring: false,
        }),
      // Version history actions
      takeSnapshot: (label, type = 'manual') =>
        set((state) => {
          const snapshot: VersionSnapshot = {
            id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            resumeData: { ...state.resumeData },
            label,
            description: label,
            type: type as VersionSnapshot['type'],
          };
          const history = [snapshot, ...state.versionHistory].slice(0, 20);
          return { versionHistory: history };
        }),
      restoreSnapshot: (id) =>
        set((state) => {
          const snapshot = state.versionHistory.find((s) => s.id === id);
          if (!snapshot) {
            console.warn(`Snapshot ${id} not found`);
            return {};
          }
          // Create a snapshot before restoring
          const beforeRestore: VersionSnapshot = {
            id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            resumeData: { ...state.resumeData },
            label: `Before restore: ${snapshot.label}`,
            description: `Before restore: ${snapshot.label}`,
            type: 'auto-before-restore',
          };
          const history = [beforeRestore, ...state.versionHistory].slice(0, 20);
          return { resumeData: snapshot.resumeData, versionHistory: history };
        }),
      clearVersionHistory: () => set({ versionHistory: [] }),
    }),
    {
      name: 'resumeai-storage',
      partialize: (state) => ({
        theme: state.theme,
      }),
    },
  ),
);

export const selectAuthUser = (state: AppStore) => state.user;
export const selectIsAuthenticated = (state: AppStore) => state.isAuthenticated;
export const selectAuthLoading = (state: AppStore) => state.isAuthLoading;
export const selectAuthError = (state: AppStore) => state.authError;

export const selectResumeData = (state: AppStore) => state.resumeData;
export const selectResumeLoaded = (state: AppStore) => state.isResumeLoaded;
export const selectSaveStatus = (state: AppStore) => state.saveStatus;
export const selectLastSaved = (state: AppStore) => state.lastSaved;
export const selectResumeError = (state: AppStore) => state.resumeError;

export const selectTheme = (state: AppStore) => state.theme;
export const selectIsDark = (state: AppStore) => state.theme === 'dark';

export const selectShowShortcuts = (state: AppStore) => state.showShortcuts;
