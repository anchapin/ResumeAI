import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { TestContext } from './test-utils';
import { setupTestAPI, cleanupTestAPI } from './test-utils';

describe('OAuth Flow Integration Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestAPI();
  });

  afterAll(async () => {
    await cleanupTestAPI(context);
  });

  describe('GitHub OAuth', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const response = await context.apiClient.initiateOAuth('github');
      
      expect(response.status).toBe(200);
      expect(response.data.authUrl).toBeDefined();
      expect(response.data.authUrl).toContain('github.com');
      expect(response.data.state).toBeDefined();
    });

    it('should handle GitHub OAuth callback', async () => {
      const state = 'test-state-' + Date.now();
      const code = 'mock-github-code';
      
      const response = await context.apiClient.handleOAuthCallback('github', { code, state });
      
      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.user).toBeDefined();
    });

    it('should validate state parameter', async () => {
      const response = await context.apiClient.handleOAuthCallback('github', {
        code: 'mock-code',
        state: 'invalid-state'
      });
      
      expect(response.status).toBe(400);
      expect(response.error).toContain('state');
    });

    it('should handle GitHub API errors', async () => {
      const response = await context.apiClient.handleOAuthCallback('github', {
        code: 'invalid-code',
        state: 'valid-state'
      });
      
      expect(response.status).toBe(401);
      expect(response.error).toBeDefined();
    });
  });

  describe('OAuth Token Management', () => {
    it('should store OAuth token securely', async () => {
      const token = await context.apiClient.storeOAuthToken('github', {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        expiresAt: Date.now() + 3600000
      });
      
      expect(token.status).toBe(200);
      expect(token.data.stored).toBe(true);
    });

    it('should refresh expired OAuth token', async () => {
      const oldToken = 'expired-token';
      const response = await context.apiClient.refreshOAuthToken('github', oldToken);
      
      expect(response.status).toBe(200);
      expect(response.data.accessToken).not.toBe(oldToken);
      expect(response.data.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should revoke OAuth token', async () => {
      const response = await context.apiClient.revokeOAuthToken('github');
      
      expect(response.status).toBe(200);
      expect(response.data.revoked).toBe(true);
    });
  });

  describe('OAuth User Profile', () => {
    it('should fetch user profile from OAuth provider', async () => {
      const response = await context.apiClient.getOAuthUserProfile('github');
      
      expect(response.status).toBe(200);
      expect(response.data.id).toBeDefined();
      expect(response.data.email).toBeDefined();
      expect(response.data.name).toBeDefined();
    });

    it('should sync OAuth user data', async () => {
      const response = await context.apiClient.syncOAuthProfile('github');
      
      expect(response.status).toBe(200);
      expect(response.data.synced).toBe(true);
      expect(response.data.lastSync).toBeDefined();
    });
  });

  describe('OAuth Scopes', () => {
    it('should request correct GitHub scopes', async () => {
      const response = await context.apiClient.initiateOAuth('github', {
        scopes: ['user:email', 'read:user']
      });
      
      expect(response.status).toBe(200);
      expect(response.data.requestedScopes).toEqual(['user:email', 'read:user']);
    });

    it('should handle scope rejection', async () => {
      const response = await context.apiClient.handleOAuthCallback('github', {
        code: 'mock-code',
        state: 'valid-state',
        error: 'access_denied'
      });
      
      expect(response.status).toBe(403);
      expect(response.error).toContain('permission');
    });
  });

  describe('OAuth Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      const response = await context.apiClient.initiateOAuth('github');
      
      expect(response.status).toBe(503);
      expect(response.error).toBeDefined();
    });

    it('should retry failed OAuth calls', async () => {
      const response = await context.apiClient.initiateOAuth('github', {
        retries: 3
      });
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.data).toBeDefined();
    });
  });

  describe('Multi-Provider OAuth', () => {
    it('should support multiple OAuth providers', async () => {
      const providers = ['github', 'google'];
      
      for (const provider of providers) {
        const response = await context.apiClient.initiateOAuth(provider);
        expect(response.status).toBe(200);
        expect(response.data.authUrl).toBeDefined();
      }
    });

    it('should link multiple OAuth accounts to user', async () => {
      const response = await context.apiClient.linkOAuthAccounts(['github', 'google']);
      
      expect(response.status).toBe(200);
      expect(response.data.accounts).toHaveLength(2);
    });
  });
});
