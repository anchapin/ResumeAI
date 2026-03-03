import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SimpleResumeData } from '../types';
import {
  loadResumeData,
  saveResumeData,
  StorageError,
  getStorageErrorMessage,
} from '../utils/storage';
import { TokenManager, sanitizeInput } from '../utils/security';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
}

export type Theme = 'light' | 'dark';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AppState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  resumeData: SimpleResumeData;
  isResumeLoaded: boolean;
  saveStatus: SaveStatus;
  resumeError: string | null;
  theme: Theme;
  showShortcuts: boolean;
  globalLoading: boolean;
}

interface AppActions {
  setUser: (user: AuthUser | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  setAuthError: (error: string | null) => void;
  clearAuthError: () => void;
  setResumeData: (data: SimpleResumeData | ((prev: SimpleResumeData) => SimpleResumeData)) => void;
  loadResume: () => Promise<void>;
  setSaveStatus: (status: SaveStatus) => void;
  setResumeError: (error: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setShowShortcuts: (show: boolean) => void;
  toggleShortcuts: () => void;
  setGlobalLoading: (isLoading: boolean) => void;
}

type AppStore = AppState & AppActions;

const initialResumeData: SimpleResumeData = {
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  phone: '+1 (555) 012-3456',
  location: 'San Francisco, CA',
  role: 'Senior Product Designer',
  summary:
    'Passionate and detail-oriented Senior Product Designer with 8+ years of experience creating user-centered digital experiences. Expertise in UX research, interaction design, and design systems. Proven track record of delivering products that drive business growth and user satisfaction.',
  skills: [
    'Figma',
    'Sketch',
    'Adobe XD',
    'User Research',
    'Prototyping',
    'Design Systems',
    'React',
    'TypeScript',
    'HTML/CSS',
  ],
  experience: [
    {
      id: '1',
      company: 'TechCorp Solutions',
      role: 'Senior Software Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description:
        'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.',
      tags: ['AWS', 'Microservices'],
    },
    {
      id: '2',
      company: 'StartupHub Inc',
      role: 'Software Developer',
      startDate: 'Jun 2017',
      endDate: 'Dec 2019',
      current: false,
      description:
        'Mentored a team of 5 junior developers and implemented CI/CD pipelines reducing deployment time by 50%.',
      tags: ['Mentorship', 'CI/CD'],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Stanford University',
      area: 'Computer Science',
      studyType: 'Bachelor of Science',
      startDate: '2013',
      endDate: '2017',
      courses: ['Data Structures', 'Algorithms', 'Machine Learning', 'Human-Computer Interaction'],
    },
  ],
  projects: [
    {
      id: '1',
      name: 'E-commerce Platform Redesign',
      description:
        'Led a complete UX overhaul of a major e-commerce platform, resulting in a 35% increase in conversion rates.',
      url: 'https://github.com/alexrivera/ecommerce-redesign',
      roles: ['Lead Designer', 'UX Researcher'],
      startDate: '2022',
      endDate: '2023',
      highlights: [
        'User interviews with 50+ customers',
        'A/B testing of new designs',
        'Design system creation',
      ],
    },
  ],
};

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
      isAuthLoading: true,
      authError: null,
      resumeData: initialResumeData,
      isResumeLoaded: false,
      saveStatus: 'idle' as SaveStatus,
      resumeError: null,
      theme: 'light' as Theme,
      showShortcuts: false,
      globalLoading: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
      setAuthError: (authError) => set({ authError }),
      clearAuthError: () => set({ authError: null }),
      setGlobalLoading: (globalLoading) => set({ globalLoading }),
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
export const selectResumeError = (state: AppStore) => state.resumeError;

export const selectTheme = (state: AppStore) => state.theme;
export const selectIsDark = (state: AppStore) => state.theme === 'dark';

export const selectShowShortcuts = (state: AppStore) => state.showShortcuts;
