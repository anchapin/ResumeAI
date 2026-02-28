/**
 * Tests for XSS Sanitization - Issue #580
 * Verifies DOMPurify-based sanitization protects against XSS attacks
 */

import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../utils/security';

describe('XSS Sanitization - Issue #580', () => {
  describe('Basic Script Tags', () => {
    it('should remove simple script tags', () => {
      const malicious = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove script tags with content', () => {
      const malicious = '<script>document.cookie="stolen"</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove script tags with attributes', () => {
      const malicious = '<script src="evil.js" type="text/javascript">alert(1)</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('evil.js');
    });

    it('should remove nested script tags', () => {
      const malicious = '<script><script>alert("XSS")</script></script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Event Handler Injection', () => {
    it('should remove onclick handlers', () => {
      const malicious = '<div onclick="alert(\'XSS\')">Click me</div>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onclick');
    });

    it('should remove onerror handlers', () => {
      const malicious = '<img src=x onerror="alert(\'XSS\')">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onerror');
    });

    it('should remove onload handlers', () => {
      const malicious = '<body onload="alert(\'XSS\')">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onload');
    });

    it('should remove onmouseover handlers', () => {
      const malicious = '<div onmouseover="alert(\'XSS\')">Hover me</div>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onmouseover');
    });

    it('should remove onfocus handlers', () => {
      const malicious = '<input onfocus="alert(\'XSS\')">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onfocus');
    });
  });

  describe('JavaScript Protocol Injection', () => {
    it('should remove javascript: protocol in href', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove javascript: protocol in src', () => {
      const malicious = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Data URI Injection', () => {
    it('should remove data: protocol with HTML', () => {
      const malicious = '<iframe src="data:text/html,<script>alert(\'XSS\')</script>"></iframe>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('data:text/html');
    });

    it('should remove data: protocol with SVG', () => {
      const malicious = '<img src="data:image/svg+xml,<script>alert(\'XSS\')</script>">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('data:image/svg+xml');
    });
  });

  describe('Advanced Attack Vectors', () => {
    it('should handle SVG-based XSS', () => {
      const malicious = "<svg><script>alert('XSS')</script></svg>";
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
    });

    it('should handle iframe injection with dangerous attributes', () => {
      const malicious = '<iframe src="evil.com" onload="alert(1)"></iframe>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onload');
    });

    it('should handle object injection with dangerous attributes', () => {
      const malicious = '<object data="evil.swf" onload="alert(1)"></object>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onload');
    });

    it.skip('should handle embed injection with dangerous attributes', () => {
      const malicious = '<embed src="evil.swf" allowscriptaccess="always">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('allowscriptaccess');
    });

    it('should handle meta refresh injection', () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should handle form action injection', () => {
      const malicious = '<form action="javascript:alert(\'XSS\')"><input type="submit"></form>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Style and Attribute Injection', () => {
    it('should remove javascript: URLs in styles', () => {
      const malicious = '<div style="background: url(\'javascript:alert(1)\')">Test</div>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-string input', () => {
      const sanitized = sanitizeInput(null as any);
      expect(sanitized).toBeNull();
    });

    it('should handle empty strings', () => {
      const sanitized = sanitizeInput('');
      expect(sanitized).toBe('');
    });

    it('should preserve safe text content', () => {
      const safeText = 'Hello, World! This is safe content.';
      const sanitized = sanitizeInput(safeText);
      expect(sanitized).toBe(safeText);
    });

    it('should handle unicode and special characters', () => {
      const unicode = 'Hello 世界 🌍 <script>alert("XSS")</script> Test';
      const sanitized = sanitizeInput(unicode);
      expect(sanitized).toContain('世界');
      expect(sanitized).toContain('🌍');
      expect(sanitized).not.toContain('<script>');
    });

    it('should handle very long payloads', () => {
      const longPayload = 'a'.repeat(10000) + '<script>alert("XSS")</script>' + 'b'.repeat(10000);
      const sanitized = sanitizeInput(longPayload);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('OWASP Top 10 XSS Payloads', () => {
    it('should handle OWASP example 1: script injection', () => {
      const malicious = '<script>alert(document.cookie)</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
    });

    it('should handle OWASP example 2: img onerror', () => {
      const malicious = '<img src=x onerror=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onerror');
    });

    it('should handle OWASP example 3: body onload', () => {
      const malicious = '<body onload=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onload');
    });

    it('should handle OWASP example 4: input autofocus', () => {
      const malicious = '<input autofocus onfocus=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onfocus');
    });

    it('should handle OWASP example 5: select onfocus', () => {
      const malicious = '<select autofocus onfocus=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onfocus');
    });

    it('should handle OWASP example 6: textarea onfocus', () => {
      const malicious = '<textarea autofocus onfocus=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onfocus');
    });

    it('should handle OWASP example 7: keydown event', () => {
      const malicious = '<details open ontoggle=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('ontoggle');
    });

    it('should handle OWASP example 8: frameset with dangerous attributes', () => {
      const malicious = '<frameset onload=alert(document.cookie)>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onload');
    });

    it('should handle OWASP example 9: SVG animate', () => {
      const malicious = '<svg><animate onbegin=alert(document.cookie) attributeName=x dur=1s>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('onbegin');
    });

    it('should handle OWASP example 10: iframe srcdoc with script', () => {
      const malicious = '<iframe srcdoc="<script>alert(document.cookie)</script>">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
    });
  });
});
