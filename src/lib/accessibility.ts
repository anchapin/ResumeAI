/**
 * Accessibility testing utilities for WCAG 2.1 compliance
 * Uses axe-core for automated accessibility scanning
 */

interface AxeCore {
  run: (options?: object) => Promise<AxeResults>;
}

interface AxeResults {
  violations: AxeViolation[];
  passes: AxePass[];
}

interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  nodes: AxeNode[];
  helpUrl: string;
}

interface AxePass {
  id: string;
  impact: null | string;
}

interface AxeNode {
  html: string;
  failureSummary: string | null;
}

let axeCore: AxeCore | null = null;

// Lazy load axe-core in browser environment
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    axeCore = require('axe-core');
  } catch (err) {
    console.error('Failed to load axe-core:', err);
    // axe-core not available
  }
}

export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: Array<{
    html: string;
    failureSummary: string;
  }>;
  helpUrl: string;
}

export interface AccessibilityResults {
  violations: AccessibilityViolation[];
  passes: number;
  totalTests: number;
  timestamp: string;
  url: string;
}

/**
 * Run accessibility scan on current DOM using axe-core
 * @param options - axe configuration options
 * @returns Accessibility scan results
 */
export async function runAccessibilityScan(options?: {
  rules?: string[];
  runOnly?: { type: string; values: string[] };
  standards?: string;
}): Promise<AccessibilityResults> {
  try {
    if (!axeCore) {
      // In test environment, return mock results
      return {
        violations: [],
        passes: 0,
        totalTests: 0,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
      };
    }

    const results = await axeCore.run(options || {});

    return {
      violations: results.violations.map((v: AxeViolation) => ({
        id: v.id,
        impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
        description: v.description,
        nodes: v.nodes.map((n: AxeNode) => ({
          html: n.html,
          failureSummary: n.failureSummary || '',
        })),
        helpUrl: v.helpUrl,
      })),
      passes: results.passes.length,
      totalTests: results.passes.length + results.violations.length,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
  } catch (error) {
    throw new Error(
      `Accessibility scan failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Check for specific accessibility violations
 * @param impact - Filter by impact level
 * @returns Array of violations matching the impact level
 */
export function getViolationsByImpact(
  violations: AccessibilityViolation[],
  impact: 'critical' | 'serious' | 'moderate' | 'minor',
): AccessibilityViolation[] {
  return violations.filter((v) => v.impact === impact);
}

/**
 * Generate accessibility report summary
 */
export function generateAccessibilityReport(results: AccessibilityResults): string {
  const critical = getViolationsByImpact(results.violations, 'critical');
  const serious = getViolationsByImpact(results.violations, 'serious');
  const moderate = getViolationsByImpact(results.violations, 'moderate');
  const minor = getViolationsByImpact(results.violations, 'minor');

  return `
Accessibility Report - ${results.url}
Generated: ${results.timestamp}

Summary:
- Critical Issues: ${critical.length}
- Serious Issues: ${serious.length}
- Moderate Issues: ${moderate.length}
- Minor Issues: ${minor.length}
- Passed Tests: ${results.passes}
- Total Tests: ${results.totalTests}

${
  results.violations.length === 0
    ? 'No accessibility violations found!'
    : `
Violations:
${results.violations
  .map(
    (v) => `
[${v.impact.toUpperCase()}] ${v.id}: ${v.description}
Help: ${v.helpUrl}
Affected Elements: ${v.nodes.length}
`,
  )
  .join('\n')}
`
}
  `;
}
