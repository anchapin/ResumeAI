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
