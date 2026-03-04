/**
 * Feature flags for ResumeAI application
 * @packageDocumentation
 */

/**
 * Available feature flags in the application
 */
export enum Feature {
  AI_TAILORING = 'ai-tailoring',
  PDF_EXPORT = 'pdf-export',
  LINKEDIN_IMPORT = 'linkedin-import',
  VERSION_HISTORY = 'version-history',
  TEAM_COLLABORATION = 'team-collaboration',
  ADVANCED_ANALYTICS = 'advanced-analytics',
}

/**
 * Configuration object for feature flags
 */
export interface FeatureFlagConfig {
  [key: string]: boolean;
}

/**
 * Default feature flag configuration
 */
export const DEFAULT_FLAGS: FeatureFlagConfig = {
  [Feature.AI_TAILORING]: true,
  [Feature.PDF_EXPORT]: true,
  [Feature.LINKEDIN_IMPORT]: true,
  [Feature.VERSION_HISTORY]: true,
  [Feature.TEAM_COLLABORATION]: false, // Beta
  [Feature.ADVANCED_ANALYTICS]: false, // Upcoming
};
/**
 * Loads flags from environment variables or localStorage for development/overrides.
 *
 * @returns Feature flag configuration object
 *
 * @example
 * const flags = getFeatureFlags();
 * if (flags[Feature.AI_TAILORING]) {
 *   // AI tailoring is enabled
 * }
 */
export const getFeatureFlags = (): FeatureFlagConfig => {
  const flags = { ...DEFAULT_FLAGS };

  // Allow overrides from localStorage in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const overrides = localStorage.getItem('resumeai_feature_flags');
      if (overrides) {
        const parsed = JSON.parse(overrides);
        return { ...flags, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse feature flag overrides', e);
    }
  }

  // Map environment variables like VITE_FEATURE_AI_TAILORING=true
  Object.keys(Feature).forEach((key) => {
    const featureName = Feature[key as keyof typeof Feature];
    const envKey = `VITE_FEATURE_${featureName.replace(/-/g, '_').toUpperCase()}`;
    const envVal = import.meta.env[envKey];

    if (envVal !== undefined) {
      flags[featureName] = envVal === 'true' || envVal === '1';
    }
  });

  return flags;
};
