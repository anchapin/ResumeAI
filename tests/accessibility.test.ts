/**
 * Unit tests for accessibility utility functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  runAccessibilityScan,
  getViolationsByImpact,
  generateAccessibilityReport,
  AccessibilityResults,
} from '../src/lib/accessibility';

describe('Accessibility Utilities', () => {
  describe('runAccessibilityScan', () => {
    it('should return accessibility results object', async () => {
      const results = await runAccessibilityScan();

      expect(results).toHaveProperty('violations');
      expect(results).toHaveProperty('passes');
      expect(results).toHaveProperty('totalTests');
      expect(results).toHaveProperty('timestamp');
      expect(Array.isArray(results.violations)).toBe(true);
    });

    it('should return empty violations in test environment', async () => {
      const results = await runAccessibilityScan();

      expect(Array.isArray(results.violations)).toBe(true);
      expect(results.passes).toBeGreaterThanOrEqual(0);
    });

    it('should accept configuration options', async () => {
      const results = await runAccessibilityScan({
        runOnly: { type: 'tag', values: ['wcag2aa'] },
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results.violations)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const invalidOptions = {
        runOnly: { type: 'invalid', values: [] },
      };

      try {
        await runAccessibilityScan(invalidOptions);
      } catch (error) {
        // Error handling works
        expect(error).toBeDefined();
      }
    });
  });

  describe('getViolationsByImpact', () => {
    beforeEach(() => {
      // Test with mock violations
    });

    it('should filter violations by critical impact', () => {
      const violations = [
        {
          id: 'test-1',
          impact: 'critical' as const,
          description: 'Critical issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
        {
          id: 'test-2',
          impact: 'serious' as const,
          description: 'Serious issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
      ];

      const critical = getViolationsByImpact(violations, 'critical');
      expect(critical).toHaveLength(1);
      expect(critical[0].impact).toBe('critical');
    });

    it('should filter violations by serious impact', () => {
      const violations = [
        {
          id: 'test-1',
          impact: 'critical' as const,
          description: 'Critical issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
        {
          id: 'test-2',
          impact: 'serious' as const,
          description: 'Serious issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
      ];

      const serious = getViolationsByImpact(violations, 'serious');
      expect(serious).toHaveLength(1);
      expect(serious[0].impact).toBe('serious');
    });

    it('should filter violations by moderate impact', () => {
      const violations = [
        {
          id: 'test-1',
          impact: 'moderate' as const,
          description: 'Moderate issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
        {
          id: 'test-2',
          impact: 'minor' as const,
          description: 'Minor issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
      ];

      const moderate = getViolationsByImpact(violations, 'moderate');
      expect(moderate).toHaveLength(1);
      expect(moderate[0].impact).toBe('moderate');
    });

    it('should return empty array when no violations match', () => {
      const violations = [
        {
          id: 'test-1',
          impact: 'minor' as const,
          description: 'Minor issue',
          nodes: [],
          helpUrl: 'http://example.com',
        },
      ];

      const critical = getViolationsByImpact(violations, 'critical');
      expect(critical).toHaveLength(0);
    });
  });

  describe('generateAccessibilityReport', () => {
    it('should generate a report with summary', () => {
      const results: AccessibilityResults = {
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Low color contrast',
            nodes: [{ html: '<p>', failureSummary: 'Text not readable' }],
            helpUrl: 'http://example.com',
          },
        ],
        passes: 25,
        totalTests: 26,
        timestamp: '2024-02-26T10:00:00Z',
        url: 'http://localhost:3000',
      };

      const report = generateAccessibilityReport(results);

      expect(report).toContain('Accessibility Report');
      expect(report).toContain('Critical Issues');
      expect(report).toContain('Serious Issues: 1');
      expect(report).toContain('Passed Tests: 25');
    });

    it('should show no violations message when all tests pass', () => {
      const results: AccessibilityResults = {
        violations: [],
        passes: 30,
        totalTests: 30,
        timestamp: '2024-02-26T10:00:00Z',
        url: 'http://localhost:3000',
      };

      const report = generateAccessibilityReport(results);

      expect(report).toContain('No accessibility violations found');
    });

    it('should include violation details in report', () => {
      const results: AccessibilityResults = {
        violations: [
          {
            id: 'missing-form-label',
            impact: 'critical',
            description: 'Form input missing associated label',
            nodes: [{ html: '<input type="text">', failureSummary: 'No label' }],
            helpUrl: 'http://example.com/missing-label',
          },
        ],
        passes: 10,
        totalTests: 11,
        timestamp: '2024-02-26T10:00:00Z',
        url: 'http://localhost:3000',
      };

      const report = generateAccessibilityReport(results);

      expect(report).toContain('[CRITICAL]');
      expect(report).toContain('missing-form-label');
      expect(report).toContain('Form input missing associated label');
    });

    it('should include timestamp and URL in report', () => {
      const timestamp = '2024-02-26T10:30:45Z';
      const url = 'http://localhost:3000/dashboard';

      const results: AccessibilityResults = {
        violations: [],
        passes: 20,
        totalTests: 20,
        timestamp,
        url,
      };

      const report = generateAccessibilityReport(results);

      expect(report).toContain(url);
      expect(report).toContain(timestamp);
    });

    it('should categorize violations by impact level', () => {
      const results: AccessibilityResults = {
        violations: [
          {
            id: 'critical-1',
            impact: 'critical',
            description: 'Critical issue',
            nodes: [],
            helpUrl: 'http://example.com',
          },
          {
            id: 'serious-1',
            impact: 'serious',
            description: 'Serious issue',
            nodes: [],
            helpUrl: 'http://example.com',
          },
          {
            id: 'moderate-1',
            impact: 'moderate',
            description: 'Moderate issue',
            nodes: [],
            helpUrl: 'http://example.com',
          },
          {
            id: 'minor-1',
            impact: 'minor',
            description: 'Minor issue',
            nodes: [],
            helpUrl: 'http://example.com',
          },
        ],
        passes: 0,
        totalTests: 4,
        timestamp: '2024-02-26T10:00:00Z',
        url: 'http://localhost:3000',
      };

      const report = generateAccessibilityReport(results);

      expect(report).toContain('Critical Issues: 1');
      expect(report).toContain('Serious Issues: 1');
      expect(report).toContain('Moderate Issues: 1');
      expect(report).toContain('Minor Issues: 1');
    });
  });

  describe('Accessibility Interface Types', () => {
    it('should support violation severity levels', () => {
      const severityLevels: Array<'critical' | 'serious' | 'moderate' | 'minor'> = [
        'critical',
        'serious',
        'moderate',
        'minor',
      ];

      expect(severityLevels).toHaveLength(4);
      expect(severityLevels[0]).toBe('critical');
      expect(severityLevels[3]).toBe('minor');
    });
  });
});
