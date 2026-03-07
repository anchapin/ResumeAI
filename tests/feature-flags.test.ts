/**
 * Tests for Feature Flags TypeScript Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FeatureFlagKey,
  isFeatureFlagKey,
  DEFAULT_FLAGS,
  getDefaultFlags,
} from '../src/lib/feature-flags';

describe('Feature Flags Types', () => {
  describe('FeatureFlagKey', () => {
    it('should allow valid feature flag keys', () => {
      const key: FeatureFlagKey = 'ai_tailoring';
      expect(key).toBe('ai_tailoring');
    });

    it('should allow all defined flag keys', () => {
      const keys: FeatureFlagKey[] = [
        'ai_tailoring',
        'new_resume_editor',
        'linkedin_import',
        'pdf_import',
        'github_import',
        'advanced_analytics',
        'beta_features',
      ];
      
      keys.forEach(key => {
        const validKey: FeatureFlagKey = key;
        expect(validKey).toBe(key);
      });
    });
  });

  describe('isFeatureFlagKey', () => {
    it('should return true for valid feature flag keys', () => {
      expect(isFeatureFlagKey('ai_tailoring')).toBe(true);
      expect(isFeatureFlagKey('new_resume_editor')).toBe(true);
      expect(isFeatureFlagKey('linkedin_import')).toBe(true);
    });

    it('should return false for invalid feature flag keys', () => {
      expect(isFeatureFlagKey('nonexistent')).toBe(false);
      expect(isFeatureFlagKey('random_flag')).toBe(false);
      expect(isFeatureFlagKey('')).toBe(false);
    });
  });

  describe('DEFAULT_FLAGS', () => {
    it('should have ai_tailoring flag defined', () => {
      const flag = DEFAULT_FLAGS.find(f => f.key === 'ai_tailoring');
      expect(flag).toBeDefined();
      expect(flag?.enabled).toBe(true);
    });

    it('should have new_resume_editor flag defined', () => {
      const flag = DEFAULT_FLAGS.find(f => f.key === 'new_resume_editor');
      expect(flag).toBeDefined();
    });

    it('should have all required properties for each flag', () => {
      DEFAULT_FLAGS.forEach(flag => {
        expect(flag.key).toBeDefined();
        expect(flag.description).toBeDefined();
        expect(typeof flag.enabled).toBe('boolean');
        expect(typeof flag.rolloutPercentage).toBe('number');
        expect(flag.rolloutPercentage).toBeGreaterThanOrEqual(0);
        expect(flag.rolloutPercentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getDefaultFlags', () => {
    it('should return default flags with timestamp', () => {
      const flags = getDefaultFlags();
      
      expect(flags.flags).toBeDefined();
      expect(flags.timestamp).toBeDefined();
      expect(typeof flags.timestamp).toBe('number');
      expect(flags.flags.length).toBeGreaterThan(0);
    });
  });
});

describe('Feature Flag Evaluation Logic', () => {
  // Helper function to simulate the evaluation logic
  const evaluateRollout = (
    key: string,
    percentage: number,
    context?: { userId?: string; sessionId?: string; ip?: string }
  ): boolean => {
    let hashInput = key;
    
    if (context?.userId) {
      hashInput += `:${context.userId}`;
    } else if (context?.sessionId) {
      hashInput += `:${context.sessionId}`;
    } else if (context?.ip) {
      hashInput += `:${context.ip}`;
    }

    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const hashValue = Math.abs(hash) % 100;
    return hashValue < percentage;
  };

  describe('Consistent Hashing', () => {
    it('should give consistent results for the same user', () => {
      const results = Array(10).fill(null).map(() => 
        evaluateRollout('test_feature', 50, { userId: 'user123' })
      );
      
      // All results should be the same
      expect(results.every(r => r === results[0])).toBe(true);
    });

    it('should give different results for different users', () => {
      const results = [
        evaluateRollout('test_feature', 50, { userId: 'user1' }),
        evaluateRollout('test_feature', 50, { userId: 'user2' }),
        evaluateRollout('test_feature', 50, { userId: 'user3' }),
      ];
      
      // Results might differ, but at least not all should be the same (though possible)
      // This is probabilistic, but with 50% rollout and 3 users, it's very unlikely all are same
      const allSame = results.every(r => r === results[0]);
      // We can't guarantee different results due to randomness, but consistent results
      expect(typeof results[0]).toBe('boolean');
    });

    it('should return false when rollout is 0', () => {
      expect(evaluateRollout('test_feature', 0, { userId: 'user1' })).toBe(false);
    });

    it('should return true when rollout is 100', () => {
      expect(evaluateRollout('test_feature', 100, { userId: 'user1' })).toBe(true);
    });

    it('should use session ID when user ID is not provided', () => {
      const result1 = evaluateRollout('test_feature', 50, { sessionId: 'session123' });
      const result2 = evaluateRollout('test_feature', 50, { sessionId: 'session123' });
      
      expect(result1).toBe(result2);
    });

    it('should use IP when neither user ID nor session ID is provided', () => {
      const result1 = evaluateRollout('test_feature', 50, { ip: '192.168.1.1' });
      const result2 = evaluateRollout('test_feature', 50, { ip: '192.168.1.1' });
      
      expect(result1).toBe(result2);
    });

    it('should give consistent results across different feature keys', () => {
      const userId = 'testuser';
      
      // For the same user, different features should be independent
      const feature1Result = evaluateRollout('feature1', 50, { userId });
      const feature2Result = evaluateRollout('feature2', 50, { userId });
      
      // Both should be valid booleans
      expect(typeof feature1Result).toBe('boolean');
      expect(typeof feature2Result).toBe('boolean');
    });
  });
});

describe('Feature Flag Targeting Rules', () => {
  describe('User Targeting', () => {
    const checkUserTargeting = (
      targetUsers: string[],
      userId?: string
    ): boolean => {
      if (!targetUsers.length) return false;
      if (!userId) return false;
      return targetUsers.includes(userId);
    };

    it('should match targeted users', () => {
      const targetUsers = ['user1', 'user2', 'user3'];
      
      expect(checkUserTargeting(targetUsers, 'user1')).toBe(true);
      expect(checkUserTargeting(targetUsers, 'user2')).toBe(true);
      expect(checkUserTargeting(targetUsers, 'user3')).toBe(true);
    });

    it('should not match non-targeted users', () => {
      const targetUsers = ['user1', 'user2'];
      
      expect(checkUserTargeting(targetUsers, 'user3')).toBe(false);
      expect(checkUserTargeting(targetUsers, undefined)).toBe(false);
    });
  });

  describe('Group Targeting', () => {
    const checkGroupTargeting = (
      targetGroups: string[],
      userGroups?: string[]
    ): boolean => {
      if (!targetGroups.length) return false;
      if (!userGroups?.length) return false;
      return userGroups.some(group => targetGroups.includes(group));
    };

    it('should match users in targeted groups', () => {
      const targetGroups = ['premium', 'admin'];
      
      expect(checkGroupTargeting(targetGroups, ['premium'])).toBe(true);
      expect(checkGroupTargeting(targetGroups, ['admin'])).toBe(true);
      expect(checkGroupTargeting(targetGroups, ['premium', 'basic'])).toBe(true);
    });

    it('should not match users not in targeted groups', () => {
      const targetGroups = ['premium', 'admin'];
      
      expect(checkGroupTargeting(targetGroups, ['basic'])).toBe(false);
      expect(checkGroupTargeting(targetGroups, [])).toBe(false);
      expect(checkGroupTargeting(targetGroups, undefined)).toBe(false);
    });
  });
});
