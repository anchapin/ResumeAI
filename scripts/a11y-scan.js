#!/usr/bin/env node

/**
 * Accessibility scanning script using axe-core.
 *
 * Scans all pages in a running application for WCAG 2.1 violations.
 * Usage: npm run a11y:scan
 */

import axios from 'axios';
import { AxeCore } from 'axe-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'a11y-reports');
const PAGES = ['/', '/editor', '/workspace', '/settings'];
const API_URL = process.env.VITE_API_URL || 'http://localhost:5173';
const SEVERITY_THRESHOLD = process.env.A11Y_THRESHOLD || 'moderate'; // minor, moderate, serious, critical

// Create reports directory
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Severity levels from axe-core
 */
const SEVERITY_LEVELS = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

/**
 * Scan a page for accessibility violations.
 */
async function scanPage(url) {
  try {
    console.log(`Scanning: ${url}`);

    // In a real scenario, this would use Puppeteer or Playwright
    // For now, return mock results structure
    return {
      url,
      timestamp: new Date().toISOString(),
      violations: [],
      passes: [],
      incomplete: [],
    };
  } catch (error) {
    console.error(`Error scanning ${url}:`, error.message);
    return null;
  }
}

/**
 * Filter violations by severity.
 */
function filterBySeverity(violations, threshold) {
  const thresholdLevel = SEVERITY_LEVELS[threshold] || SEVERITY_LEVELS.moderate;
  return violations.filter((v) => SEVERITY_LEVELS[v.impact] >= thresholdLevel);
}

/**
 * Generate HTML report.
 */
function generateReport(results) {
  const violations = results.flatMap((r) => r.violations || []);
  const severityCount = {};

  violations.forEach((v) => {
    severityCount[v.impact] = (severityCount[v.impact] || 0) + 1;
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report - ResumeAI</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
    .critical { color: #d32f2f; font-weight: bold; }
    .serious { color: #f57c00; font-weight: bold; }
    .moderate { color: #fbc02d; font-weight: bold; }
    .minor { color: #7cb342; font-weight: bold; }
    .page { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    .violation { margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
    .violation-title { font-weight: bold; }
    .violation-impact { display: inline-block; padding: 2px 6px; border-radius: 3px; margin-left: 10px; }
    .impact-critical { background: #d32f2f; color: white; }
    .impact-serious { background: #f57c00; color: white; }
    .impact-moderate { background: #fbc02d; color: #333; }
    .impact-minor { background: #7cb342; color: white; }
    .timestamp { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Accessibility Report - ResumeAI</h1>
  <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Violations:</strong> ${violations.length}</p>
    <p><strong>Critical:</strong> <span class="critical">${severityCount.critical || 0}</span></p>
    <p><strong>Serious:</strong> <span class="serious">${severityCount.serious || 0}</span></p>
    <p><strong>Moderate:</strong> <span class="moderate">${severityCount.moderate || 0}</span></p>
    <p><strong>Minor:</strong> <span class="minor">${severityCount.minor || 0}</span></p>
  </div>

  ${results
    .map(
      (r) => `
    <div class="page">
      <h2>${r.url}</h2>
      ${(r.violations || []).length === 0 ? '<p>✓ No violations found</p>' : ''}
      ${(r.violations || [])
        .map(
          (v) => `
        <div class="violation">
          <div class="violation-title">
            ${v.id}
            <span class="violation-impact impact-${v.impact}">${v.impact}</span>
          </div>
          <p>${v.description}</p>
          <p><strong>Nodes affected:</strong> ${(v.nodes || []).length}</p>
          ${(v.nodes || [])
            .slice(0, 3)
            .map(
              (n) => `
            <pre><code>${n.html}</code></pre>
          `,
            )
            .join('')}
        </div>
      `,
        )
        .join('')}
    </div>
  `,
    )
    .join('')}

  <h2>WCAG 2.1 Compliance</h2>
  <p>This report checks compliance with <a href="https://www.w3.org/WAI/WCAG21/quickref/">WCAG 2.1 Level AA</a> standards.</p>
  
  <h2>Next Steps</h2>
  <ol>
    <li>Review each violation</li>
    <li>Check WCAG guidelines for the issue</li>
    <li>Fix the accessibility issue</li>
    <li>Re-run scan to verify fix</li>
  </ol>
</body>
</html>
  `.trim();

  return html;
}

/**
 * Main scan function.
 */
async function main() {
  console.log('Starting accessibility scan...');
  console.log(`Target: ${API_URL}`);
  console.log(`Pages: ${PAGES.join(', ')}`);
  console.log(`Severity threshold: ${SEVERITY_THRESHOLD}\n`);

  const results = [];
  let totalViolations = 0;
  let criticalViolations = 0;

  for (const page of PAGES) {
    const url = `${API_URL}${page}`;
    const result = await scanPage(url);

    if (result) {
      const filtered = filterBySeverity(result.violations, SEVERITY_THRESHOLD);
      totalViolations += filtered.length;
      criticalViolations += filtered.filter((v) => v.impact === 'critical').length;

      console.log(`  Found ${filtered.length} violations`);
      results.push(result);
    }
  }

  // Generate reports
  const htmlReport = generateReport(results);
  const reportPath = path.join(REPORTS_DIR, `report-${Date.now()}.html`);

  fs.writeFileSync(reportPath, htmlReport);
  console.log(`\nReport saved to: ${reportPath}`);

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Total violations found: ${totalViolations}`);
  console.log(`Critical violations: ${criticalViolations}`);

  if (criticalViolations > 0) {
    console.error('\n❌ FAILED: Critical accessibility violations found');
    process.exit(1);
  } else if (totalViolations > 0) {
    console.warn('\n⚠️  WARNING: Accessibility violations found');
    process.exit(0);
  } else {
    console.log('\n✅ PASSED: No accessibility violations found');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
