/**
 * OAuth 2.0 PKCE Implementation Tests
 * 
 * Tests cover:
 * - Verifier generation (length, character set, randomness)
 * - Challenge generation (SHA256 encoding, base64url format)
 * - Storage and retrieval of verifiers
 * - Complete PKCE flow
 * - Verification of challenge matches verifier
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  storeVerifier,
  retrieveVerifier,
  clearVerifier,
  setupPKCE,
  buildPKCEAuthUrl,
  validatePKCEState,
} from '../src/lib/oauth';

describe('OAuth PKCE', () => {
  const PROVIDER = 'test-provider';

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a 128-character verifier', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toHaveLength(128);
    });

    it('should only use unreserved characters', () => {
      const verifier = generateCodeVerifier();
      const unreservedRegex = /^[A-Za-z0-9\-._~]+$/;
      expect(unreservedRegex.test(verifier)).toBe(true);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should use cryptographically random values', () => {
      const verifiers = new Set();
      const count = 100;

      for (let i = 0; i < count; i++) {
        verifiers.add(generateCodeVerifier());
      }

      // All should be unique
      expect(verifiers.size).toBe(count);
    });

    it('should meet RFC 7636 length requirements', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a valid base64url-encoded SHA256 hash', async () => {
      const verifier = 'test-verifier-for-challenge-generation';
      const challenge = await generateCodeChallenge(verifier);

      // Base64url should not contain +, /, or =
      expect(challenge).not.toMatch(/[+/=]/);
      // Should be a reasonable length (SHA256 hash = 32 bytes = 43 chars in base64url)
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should produce consistent results for the same verifier', async () => {
      const verifier = 'test-verifier-consistency';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });

    it('should produce different challenges for different verifiers', async () => {
      const verifier1 = 'verifier-1';
      const verifier2 = 'verifier-2';

      const challenge1 = await generateCodeChallenge(verifier1);
      const challenge2 = await generateCodeChallenge(verifier2);

      expect(challenge1).not.toBe(challenge2);
    });

    it('should handle long verifiers correctly', async () => {
      const longVerifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(longVerifier);

      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should produce RFC 7636 compliant challenge', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      // Challenge should only contain unreserved characters in base64url alphabet
      expect(/^[A-Za-z0-9\-_]+$/.test(challenge)).toBe(true);
    });
  });

  describe('storeVerifier and retrieveVerifier', () => {
    it('should store and retrieve verifier', () => {
      const verifier = generateCodeVerifier();
      storeVerifier(verifier, PROVIDER);

      const retrieved = retrieveVerifier(PROVIDER);
      expect(retrieved).toBe(verifier);
    });

    it('should clear verifier after retrieval', () => {
      const verifier = generateCodeVerifier();
      storeVerifier(verifier, PROVIDER);
      
      retrieveVerifier(PROVIDER);
      const retrieved = retrieveVerifier(PROVIDER);
      
      expect(retrieved).toBeNull();
    });

    it('should handle multiple providers independently', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();

      storeVerifier(verifier1, 'github');
      storeVerifier(verifier2, 'linkedin');

      expect(retrieveVerifier('github')).toBe(verifier1);
      expect(retrieveVerifier('linkedin')).toBe(verifier2);
    });

    it('should return null for non-existent provider', () => {
      const retrieved = retrieveVerifier('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should handle default provider name', () => {
      const verifier = generateCodeVerifier();
      storeVerifier(verifier);

      const retrieved = retrieveVerifier();
      expect(retrieved).toBe(verifier);
    });
  });

  describe('clearVerifier', () => {
    it('should clear stored verifier', () => {
      const verifier = generateCodeVerifier();
      storeVerifier(verifier, PROVIDER);
      
      clearVerifier(PROVIDER);
      
      const retrieved = retrieveVerifier(PROVIDER);
      expect(retrieved).toBeNull();
    });

    it('should handle clearing non-existent verifier gracefully', () => {
      expect(() => clearVerifier('non-existent')).not.toThrow();
    });
  });

  describe('setupPKCE', () => {
    it('should generate verifier and return challenge', async () => {
      const challenge = await setupPKCE(PROVIDER);

      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should store verifier internally', async () => {
      await setupPKCE(PROVIDER);
      const verifier = retrieveVerifier(PROVIDER);

      expect(verifier).not.toBeNull();
      expect(verifier).toHaveLength(128);
    });

    it('should produce consistent challenge for same setup', async () => {
      const challenge1 = await setupPKCE('provider1');
      
      // Get the verifier before it's cleared
      const verifier1 = sessionStorage.getItem('pkce_verifier_provider1');
      
      // Manually set it back for second challenge generation
      if (verifier1) {
        sessionStorage.setItem('pkce_verifier_provider1', verifier1);
        const challenge2 = await generateCodeChallenge(verifier1);
        
        expect(challenge1).toBe(challenge2);
      }
    });
  });

  describe('buildPKCEAuthUrl', () => {
    it('should build URL with PKCE parameters', async () => {
      const baseUrl = 'https://github.com/login/oauth/authorize';
      const params = {
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'user:email',
        state: 'test-state',
      };
      const challenge = await generateCodeChallenge('test-verifier');

      const url = buildPKCEAuthUrl(baseUrl, params, challenge);

      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state');
    });

    it('should properly URL-encode parameters', async () => {
      const baseUrl = 'https://example.com/auth';
      const params = {
        client_id: 'id-with-dash',
        redirect_uri: 'http://localhost:3000/callback',
      };
      const challenge = 'test-challenge';

      const url = buildPKCEAuthUrl(baseUrl, params, challenge);

      expect(url).toContain(baseUrl);
      expect(url).not.toContain(' ');
    });

    it('should include code_challenge_method as S256', async () => {
      const baseUrl = 'https://example.com/auth';
      const params = { client_id: 'test' };
      const challenge = 'test-challenge';

      const url = buildPKCEAuthUrl(baseUrl, params, challenge);

      expect(url).toContain('code_challenge_method=S256');
    });
  });

  describe('validatePKCEState', () => {
    it('should return true when verifier is valid', async () => {
      await setupPKCE(PROVIDER);
      
      const isValid = validatePKCEState(PROVIDER);
      expect(isValid).toBe(true);
    });

    it('should return false when verifier does not exist', () => {
      const isValid = validatePKCEState('non-existent');
      expect(isValid).toBe(false);
    });

    it('should validate verifier format', () => {
      // Store an invalid verifier
      sessionStorage.setItem(`pkce_verifier_${PROVIDER}`, 'invalid@verifier!');
      
      const isValid = validatePKCEState(PROVIDER);
      expect(isValid).toBe(false);
    });

    it('should validate verifier length', () => {
      // Store a verifier that is too short
      sessionStorage.setItem(`pkce_verifier_${PROVIDER}`, 'short');
      
      const isValid = validatePKCEState(PROVIDER);
      expect(isValid).toBe(false);
    });
  });

  describe('PKCE Flow Integration', () => {
    it('should complete full PKCE flow', async () => {
      // Step 1: Setup PKCE
      const challenge = await setupPKCE(PROVIDER);
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);

      // Step 2: Build auth URL
      const authUrl = buildPKCEAuthUrl('https://example.com/authorize', {
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        state: 'test-state',
      }, challenge);
      expect(authUrl).toContain('code_challenge=');

      // Step 3: Retrieve verifier for token exchange
      const verifier = retrieveVerifier(PROVIDER);
      expect(verifier).not.toBeNull();
      expect(verifier).toHaveLength(128);
    });

    it('should verify challenge matches verifier', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      // Simulate backend verification: hash the verifier and compare
      const encodedVerifier = new TextEncoder().encode(verifier);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedVerifier);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const binaryString = String.fromCharCode(...hashArray);
      const base64String = btoa(binaryString);
      const regeneratedChallenge = base64String
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(challenge).toBe(regeneratedChallenge);
    });

    it('should reject invalid verifier', async () => {
      const challenge = await generateCodeChallenge('correct-verifier');
      
      // Simulate attempting to verify with wrong verifier
      const wrongVerifier = 'wrong-verifier';
      const wrongHashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(wrongVerifier)
      );
      const wrongHashArray = Array.from(new Uint8Array(wrongHashBuffer));
      const wrongBinaryString = String.fromCharCode(...wrongHashArray);
      const wrongBase64String = btoa(wrongBinaryString);
      const wrongChallenge = wrongBase64String
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(challenge).not.toBe(wrongChallenge);
    });
  });

  describe('sessionStorage error handling', () => {
    it('should handle sessionStorage unavailability gracefully', () => {
      const mockStorage: Record<string, string> = {};
      let storageAvailable = true;

      const originalSessionStorage = globalThis.sessionStorage;

      vi.stubGlobal('sessionStorage', {
        getItem: (key: string) => {
          if (!storageAvailable) throw new Error('Storage unavailable');
          return mockStorage[key] || null;
        },
        setItem: (key: string, value: string) => {
          if (!storageAvailable) throw new Error('Storage unavailable');
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          if (!storageAvailable) throw new Error('Storage unavailable');
          delete mockStorage[key];
        },
        clear: () => {
          if (!storageAvailable) throw new Error('Storage unavailable');
          Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        },
        key: (index: number) => null,
        length: 0,
      } as Storage);

      try {
        const verifier = generateCodeVerifier();
        
        // Store should work initially
        expect(() => storeVerifier(verifier, PROVIDER)).not.toThrow();
        
        // Simulate storage unavailable
        storageAvailable = false;
        
        expect(() => storeVerifier(verifier, PROVIDER)).toThrow();
        expect(() => retrieveVerifier(PROVIDER)).not.toThrow();
      } finally {
        vi.stubGlobal('sessionStorage', originalSessionStorage);
      }
    });
  });
});
