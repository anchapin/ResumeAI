/**
 * OAuth 2.0 PKCE (Proof Key for Public Clients) Implementation
 *
 * Provides secure OAuth flow with PKCE for protection against authorization code interception attacks.
 * Implements RFC 7636 standard.
 *
 * Flow:
 * 1. generateCodeVerifier() - Create random 128-char string
 * 2. generateCodeChallenge() - SHA256 hash verifier, base64url encode
 * 3. storeVerifier() - Save verifier in sessionStorage (ephemeral)
 * 4. Include code_challenge & code_challenge_method in auth URL
 * 5. On callback: retrieveVerifier() to get stored verifier
 * 6. Include code_verifier in token exchange request
 * 7. Backend verifies: SHA256(verifier) == code_challenge
 */

/**
 * Generates a cryptographically secure code verifier for PKCE
 *
 * Code Verifier Requirements (RFC 7636):
 * - Minimum 43 characters
 * - Maximum 128 characters
 * - Only unreserved characters: [A-Z] [a-z] [0-9] - . _ ~
 *
 * We use 128 characters for maximum security.
 *
 * @returns A 128-character code verifier string
 */
export function generateCodeVerifier(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const charactersLength = characters.length;

  // Use crypto.getRandomValues for cryptographic randomness
  const randomValues = new Uint8Array(128);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < 128; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  // Map random bytes to character set
  for (let i = 0; i < 128; i++) {
    result += characters.charAt(randomValues[i] % charactersLength);
  }

  return result;
}

/**
 * Generates SHA256 code challenge from a code verifier
 *
 * Process:
 * 1. Hash verifier with SHA-256
 * 2. Base64url encode (no padding)
 *
 * @param verifier - The code verifier string
 * @returns Promise<string> - Base64url-encoded SHA256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  // Convert verifier to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url (without padding)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const binaryString = String.fromCharCode(...hashArray);
  const base64String = btoa(binaryString);

  // Convert to base64url: replace + with -, / with _, remove =
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Stores the code verifier in sessionStorage
 *
 * SessionStorage is ephemeral (cleared on tab close) and same-origin only,
 * making it suitable for short-lived OAuth state.
 *
 * @param verifier - The code verifier to store
 * @param provider - OAuth provider name (github, linkedin, etc.)
 */
export function storeVerifier(verifier: string, provider: string = 'oauth'): void {
  try {
    const key = `pkce_verifier_${provider}`;
    sessionStorage.setItem(key, verifier);
  } catch (error) {
    console.error('Failed to store PKCE verifier:', error);
    throw new Error('Failed to store PKCE verifier in sessionStorage');
  }
}

/**
 * Retrieves the stored code verifier from sessionStorage
 *
 * @param provider - OAuth provider name (must match what was used in storeVerifier)
 * @returns The stored verifier, or null if not found
 */
export function retrieveVerifier(provider: string = 'oauth'): string | null {
  try {
    const key = `pkce_verifier_${provider}`;
    const verifier = sessionStorage.getItem(key);

    // Clean up after retrieval (one-time use)
    if (verifier) {
      sessionStorage.removeItem(key);
    }

    return verifier;
  } catch (error) {
    console.error('Failed to retrieve PKCE verifier:', error);
    return null;
  }
}

/**
 * Clears the stored code verifier
 *
 * @param provider - OAuth provider name
 */
export function clearVerifier(provider: string = 'oauth'): void {
  try {
    const key = `pkce_verifier_${provider}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear PKCE verifier:', error);
  }
}

/**
 * Complete PKCE setup for OAuth flow
 *
 * Combines verifier generation, challenge generation, and storage.
 *
 * @param provider - OAuth provider name (github, linkedin, etc.)
 * @returns Promise<string> - The code challenge to include in auth URL
 */
export async function setupPKCE(provider: string = 'oauth'): Promise<string> {
  const verifier = generateCodeVerifier();
  storeVerifier(verifier, provider);
  const challenge = await generateCodeChallenge(verifier);
  return challenge;
}

/**
 * Builds OAuth authorization URL with PKCE parameters
 *
 * @param baseUrl - The OAuth provider's authorization endpoint
 * @param params - OAuth parameters (client_id, redirect_uri, scope, state, etc.)
 * @param codeChallenge - The code challenge from setupPKCE
 * @returns The complete authorization URL with PKCE parameters
 */
export function buildPKCEAuthUrl(
  baseUrl: string,
  params: Record<string, string>,
  codeChallenge: string,
): string {
  const urlParams = new URLSearchParams({
    ...params,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256', // SHA256 method
  });

  return `${baseUrl}?${urlParams.toString()}`;
}

/**
 * Validates PKCE flow completion
 *
 * Checks if verifier is available and matches expected format
 *
 * @param provider - OAuth provider name
 * @returns true if PKCE flow can be completed, false otherwise
 */
export function validatePKCEState(provider: string = 'oauth'): boolean {
  const verifier = retrieveVerifier(provider);
  if (!verifier) {
    return false;
  }

  // Restore verifier after validation check
  storeVerifier(verifier, provider);

  return verifier.length >= 43 && verifier.length <= 128 && /^[A-Za-z0-9\-._~]+$/.test(verifier);
}
