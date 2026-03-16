/**
 * useLinkedInOAuth Hook
 * 
 * Manages LinkedIn OAuth 2.0 connection flow.
 * 
 * @example
 * const {
 *   isConnecting,
 *   isConnected,
 *   initiateOAuth,
 *   disconnect,
 * } = useLinkedInOAuth();
 */

import { useCallback, useEffect, useState } from 'react';
import {
  initiateLinkedInAuth,
  handleLinkedInCallback,
  getLinkedInStatus,
  disconnectLinkedIn,
} from '../../utils/linkedin-api';
import type { UseLinkedInOAuthReturn } from '../../types/linkedin';

export function useLinkedInOAuth(): UseLinkedInOAuthReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check connection status on mount.
   */
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await getLinkedInStatus();
      setIsConnected(status.isConnected);
    } catch (err) {
      // Not connected or error - that's ok
      setIsConnected(false);
    }
  };

  /**
   * Initiate OAuth flow.
   */
  const initiateOAuth = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const result = await initiateLinkedInAuth();
      
      // Open OAuth popup
      const popup = window.open(
        result.authorization_url,
        'LinkedIn OAuth',
        'width=600,height=700'
      );

      // Listen for callback
      const handleMessage = async (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== window.location.origin) return;
        
        // Check for OAuth callback data
        if (event.data.type === 'linkedin-oauth-callback') {
          window.removeEventListener('message', handleMessage);
          
          try {
            await handleLinkedInCallback(event.data.code, event.data.state);
            setIsConnected(true);
          } catch (err) {
            const error = err as { message?: string };
            setError(error.message || 'OAuth failed');
          } finally {
            setIsConnecting(false);
          }
          
          popup?.close();
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup if popup closed
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to initiate OAuth');
      setIsConnecting(false);
    }
  }, []);

  /**
   * Handle callback (for redirect flow).
   */
  const handleCallback = useCallback(async (code: string, state: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      await handleLinkedInCallback(code, state);
      setIsConnected(true);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'OAuth callback failed');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect LinkedIn.
   */
  const disconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await disconnectLinkedIn();
      setIsConnected(false);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to disconnect');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return {
    isConnecting,
    isConnected,
    error,
    initiateOAuth,
    handleCallback,
    disconnect,
  };
}

export default useLinkedInOAuth;
