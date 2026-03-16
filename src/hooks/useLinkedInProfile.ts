/**
 * useLinkedInProfile Hook
 * 
 * Manages LinkedIn profile data fetching and refreshing.
 * 
 * @example
 * const {
 *   profile,
 *   isLoading,
 *   fetchProfile,
 *   refreshProfile,
 * } = useLinkedInProfile();
 */

import { useCallback, useState } from 'react';
import {
  getLinkedInProfile,
  refreshLinkedInProfile,
} from '../../utils/linkedin-api';
import type { LinkedInProfile, UseLinkedInProfileReturn } from '../../types/linkedin';

export function useLinkedInProfile(): UseLinkedInProfileReturn {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch LinkedIn profile.
   */
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getLinkedInProfile();
      setProfile(data);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh LinkedIn profile.
   */
  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await refreshLinkedInProfile();
      setProfile(result.profile);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to refresh profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    refreshProfile,
  };
}

export default useLinkedInProfile;
