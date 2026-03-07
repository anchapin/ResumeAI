/**
 * Feature flag types and schema definitions
 * Used for gradual rollouts and A/B testing
 */

/**
 * Feature flag targeting rules
 */
export interface FeatureFlagTargetingRule {
  /** Percentage of users to enable the feature for (0-100) */
  percentage: number;
  /** Optional: specific user groups that should receive the feature */
  groups?: string[];
  /** Optional: specific users that should receive the feature */
  users?: string[];
  /** Optional: IP ranges for geographic targeting */
  ipRanges?: string[];
}

/**
 * Feature flag variant for A/B testing
 */
export interface FeatureFlagVariant {
  /** Unique identifier for the variant */
  id: string;
  /** Human-readable name */
  name: string;
  /** Weight/percentage of traffic for this variant (0-100) */
  weight: number;
  /** Optional: custom configuration for this variant */
  config?: Record<string, unknown>;
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique identifier for the feature flag */
  key: string;
  /** Human-readable description */
  description: string;
  /** Whether the feature flag is currently enabled */
  enabled: boolean;
  /** Rollout percentage (0-100) - applies when enabled is true */
  rolloutPercentage: number;
  /** Targeting rules for the feature flag */
  targeting?: FeatureFlagTargetingRule;
  /** Variants for A/B testing */
  variants?: FeatureFlagVariant[];
  /** Default variant when using A/B testing */
  defaultVariant?: string;
  /** Tags for organizing feature flags */
  tags?: string[];
  /** Date when the feature flag was created */
  createdAt: string;
  /** Date when the feature flag was last modified */
  updatedAt: string;
  /** Optional: Date when the feature flag expires */
  expiresAt?: string;
}

/**
 * User feature flag evaluation context
 */
export interface FeatureFlagContext {
  /** User ID if authenticated */
  userId?: string;
  /** User email */
  email?: string;
  /** User groups/roles */
  groups?: string[];
  /** User IP address */
  ip?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional custom attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagEvaluation {
  /** The feature flag key */
  key: string;
  /** Whether the feature is enabled for this user */
  enabled: boolean;
  /** The variant ID if A/B testing is configured */
  variant?: string;
  /** Custom configuration for this user */
  config?: Record<string, unknown>;
}

/**
 * Feature flag configuration from the server
 */
export interface FeatureFlagConfig {
  /** All feature flags */
  flags: FeatureFlag[];
  /** Cache timestamp */
  timestamp: number;
  /** Configuration version */
  version: string;
}

/**
 * Predefined feature flag keys for the application
 */
export const FEATURE_FLAGS = {
  /** New resume editor UI */
  NEW_RESUME_EDITOR: 'new_resume_editor',
  /** AI-powered resume tailoring */
  AI_TAILORING: 'ai_tailoring',
  /** Advanced analytics dashboard */
  ADVANCED_ANALYTICS: 'advanced_analytics',
  /** LinkedIn import feature */
  LINKEDIN_IMPORT: 'linkedin_import',
  /** PDF export optimization */
  PDF_EXPORT_OPTIMIZATION: 'pdf_export_optimization',
  /** New pricing page */
  NEW_PRICING_PAGE: 'new_pricing_page',
  /** Dark mode theme */
  DARK_MODE: 'dark_mode',
  /** Real-time collaboration */
  REALTIME_COLLABORATION: 'realtime_collaboration',
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/**
 * Check if a key is a valid feature flag key
 */
export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return Object.values(FEATURE_FLAGS).includes(key as FeatureFlagKey);
}

/**
 * Get all valid feature flag keys
 */
export function getAllFeatureFlagKeys(): FeatureFlagKey[] {
  return Object.values(FEATURE_FLAGS);
}

/**
 * Default feature flags for the application
 */
export const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: 'new_resume_editor',
    description: 'New resume editor UI with improved UX',
    enabled: true,
    rolloutPercentage: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'ai_tailoring',
    description: 'AI-powered resume tailoring feature',
    enabled: true,
    rolloutPercentage: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'advanced_analytics',
    description: 'Advanced analytics dashboard',
    enabled: false,
    rolloutPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'linkedin_import',
    description: 'LinkedIn profile import feature',
    enabled: true,
    rolloutPercentage: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'pdf_export_optimization',
    description: 'Optimized PDF export with better formatting',
    enabled: true,
    rolloutPercentage: 75,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'new_pricing_page',
    description: 'Redesigned pricing page',
    enabled: false,
    rolloutPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'dark_mode',
    description: 'Dark mode theme support',
    enabled: false,
    rolloutPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'realtime_collaboration',
    description: 'Real-time collaboration on resumes',
    enabled: false,
    rolloutPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get default feature flag configuration
 */
export function getDefaultFlags(): FeatureFlagConfig {
  return {
    flags: DEFAULT_FLAGS,
    timestamp: Date.now(),
    version: '1.0.0',
  };
}
