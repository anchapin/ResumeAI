/**
 * LinkedIn Integration Types
 */

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  email?: string;
  locations: LinkedInLocation[];
  profilePicture?: LinkedInPicture;
  positions: LinkedInPosition[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
}

export interface LinkedInLocation {
  country: string;
  countryCode: string;
}

export interface LinkedInPicture {
  displayImage?: string;
  playableStreams?: PlayableStream[];
}

export interface PlayableStream {
  url: string;
  width?: number;
  height?: number;
}

export interface LinkedInPosition {
  companyName: string;
  title: string;
  description?: string;
  location?: string;
  startDate: LinkedInDate;
  endDate?: LinkedInDate;
  current: boolean;
}

export interface LinkedInEducation {
  schoolName: string;
  degreeName?: string;
  fieldOfStudy?: string;
  startDate: LinkedInDate;
  endDate?: LinkedInDate;
}

export interface LinkedInDate {
  year: number;
  month?: number;
}

export interface LinkedInSkill {
  name: string;
}

export interface LinkedInConnection {
  isConnected: boolean;
  connectedAt?: string;
  lastSyncedAt?: string;
  scopes: string[];
}

export interface OAuthInitResponse {
  authorization_url: string;
  state: string;
}

export interface OAuthCallbackResponse {
  success: boolean;
  message: string;
  profile?: LinkedInProfile;
}

export interface UseLinkedInOAuthReturn {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  initiateOAuth: () => Promise<void>;
  handleCallback: (code: string, state: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface UseLinkedInProfileReturn {
  profile: LinkedInProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
