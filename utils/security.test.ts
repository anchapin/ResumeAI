import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SECURITY_CONFIG,
  TokenManager,
  getSecurityHeaders,
  secureApiCall,
  sanitizeInput,
  validateFileUpload,
} from './security';

describe('Security Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('SECURITY_CONFIG', () => {
    it('should have correct token storage key', () => {
      expect(SECURITY_CONFIG.TOKEN_STORAGE_KEY).toBe('resume_ai_auth_token');
    });

    it('should have max file size set to 10MB', () => {
      expect(SECURITY_CONFIG.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should have allowed file types', () => {
      expect(SECURITY_CONFIG.ALLOWED_FILE_TYPES).toContain('application/pdf');
      expect(SECURITY_CONFIG.ALLOWED_FILE_TYPES).toContain('text/plain');
      expect(SECURITY_CONFIG.ALLOWED_FILE_TYPES).toContain('application/json');
      expect(SECURITY_CONFIG.ALLOWED_FILE_TYPES).toContain('image/jpeg');
      expect(SECURITY_CONFIG.ALLOWED_FILE_TYPES).toContain('image/png');
    });

    it('should have input validation rules', () => {
      expect(SECURITY_CONFIG.INPUT_VALIDATION.NAME_MAX_LENGTH).toBe(100);
      expect(SECURITY_CONFIG.INPUT_VALIDATION.EMAIL_MAX_LENGTH).toBe(254);
      expect(SECURITY_CONFIG.INPUT_VALIDATION.PHONE_MAX_LENGTH).toBe(20);
      expect(SECURITY_CONFIG.INPUT_VALIDATION.SUMMARY_MAX_LENGTH).toBe(5000);
    });

    it('should have max item counts', () => {
      expect(SECURITY_CONFIG.MAX_ITEM_COUNTS.EXPERIENCE_ENTRIES).toBe(20);
      expect(SECURITY_CONFIG.MAX_ITEM_COUNTS.EDUCATION_ENTRIES).toBe(10);
      expect(SECURITY_CONFIG.MAX_ITEM_COUNTS.SKILLS).toBe(50);
      expect(SECURITY_CONFIG.MAX_ITEM_COUNTS.PROJECTS).toBe(20);
    });
  });

  describe('TokenManager', () => {
    describe('setToken', () => {
      it('should be a no-op (tokens handled by httpOnly cookies)', () => {
        const token = 'test-token-12345';
        TokenManager.setToken(token);
        expect(localStorage.getItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY)).toBeNull();
      });
    });

    describe('getToken', () => {
      it('should always return null (tokens handled by httpOnly cookies)', () => {
        localStorage.setItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY, 'some-token');
        expect(TokenManager.getToken()).toBeNull();
      });
    });

    describe('removeToken', () => {
      it('should clear residual state from localStorage', () => {
        localStorage.setItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY, 'test-token');
        TokenManager.removeToken();
        expect(localStorage.getItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY)).toBeNull();
      });
    });

    describe('isTokenExpired', () => {
      it('should always return false (expiration handled by server via 401)', () => {
        expect(TokenManager.isTokenExpired('any-token')).toBe(false);
      });
    });

    describe('getTokenExpiration', () => {
      it('should always return null', () => {
        expect(TokenManager.getTokenExpiration('any-token')).toBeNull();
      });
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return basic security headers', () => {
      const headers = getSecurityHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
      expect(headers['Sec-Fetch-Dest']).toBe('empty');
      expect(headers['Sec-Fetch-Mode']).toBe('cors');
      expect(headers['Sec-Fetch-Site']).toBe('same-origin');
    });

    it('should not include Authorization header (handled by httpOnly cookies)', () => {
      const headers = getSecurityHeaders();
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('secureApiCall', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should make fetch request with security headers', async () => {
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('{"success": true}', { status: 200 }));

      await secureApiCall('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          }),
        }),
      );
    });

    it('should include credentials: include for cookies', async () => {
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 200 }));

      await secureApiCall('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should call TokenManager.removeToken on 401 response', async () => {
      const removeTokenSpy = vi.spyOn(TokenManager, 'removeToken');

      vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await secureApiCall('https://api.example.com/test');

      expect(removeTokenSpy).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      vi.spyOn(global, 'fetch').mockRejectedValue(error);

      await expect(secureApiCall('https://api.example.com/test')).rejects.toThrow('Network error');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove XSS script tags', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello';
      const result = sanitizeInput(maliciousInput);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('Hello');
    });

    it('should remove HTML tags', () => {
      const input = '<b>Bold</b> <i>Italic</i> text';
      const result = sanitizeInput(input);

      // DOMPurify removes tags but keeps content with KEEP_CONTENT: true
      expect(result).toContain('Bold');
      expect(result).toContain('Italic');
      expect(result).toContain('text');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(\'XSS\')">';
      const result = sanitizeInput(input);

      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should handle non-string input', () => {
      const result = sanitizeInput(123 as unknown as string);
      expect(result).toBe(123);
    });

    it('should preserve plain text', () => {
      const input = 'This is plain text without HTML';
      const result = sanitizeInput(input);

      expect(result).toBe(input);
    });

    it('should handle empty string', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle special characters', () => {
      const input = 'Text with special chars: @#$%^&*()';
      const result = sanitizeInput(input);

      expect(result).toBe(input);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct file', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileUpload(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file exceeding size limit', () => {
      const largeContent = new Array(11 * 1024 * 1024).join('x');
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = validateFileUpload(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum allowed size');
    });

    it('should reject disallowed file type', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFileUpload(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type');
      expect(result.error).toContain('is not allowed');
    });

    it('should accept all allowed file types', () => {
      const allowedTypes = [
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'text.txt', type: 'text/plain' },
        { name: 'config.json', type: 'application/json' },
        { name: 'photo.jpg', type: 'image/jpeg' },
        { name: 'image.png', type: 'image/png' },
      ];

      allowedTypes.forEach(({ name, type }) => {
        const file = new File(['content'], name, { type });
        const result = validateFileUpload(file);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should include file size info in error message', () => {
      const largeContent = new Array(11 * 1024 * 1024).join('x');
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = validateFileUpload(file);

      expect(result.error).toContain('10.0MB');
    });

    it('should include allowed types in error message', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFileUpload(file);

      expect(result.error).toContain('application/pdf');
    });
  });
});
