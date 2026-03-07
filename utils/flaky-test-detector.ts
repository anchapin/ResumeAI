/**
 * Flaky Test Detection Utility
 * 
 * This module provides functionality to detect flaky tests by running tests
 * multiple times and tracking their pass/fail patterns.
 * 
 * @module flaky-test-detector
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Configuration for flaky test detection
export interface FlakyTestConfig {
  rerunCount: number;
  threshold: number; // Minimum failure rate to consider a test flaky (0-1)
  outputPath: string;
  testPaths: string[];
}

// Test result tracking
export interface TestResult {
  testId: string;
  testName: string;
  filePath: string;
  runs: boolean[]; // true = passed, false = failed
  failureRate: number;
  isFlaky: boolean;
}

// Summary of flaky test detection
export interface FlakyTestSummary {
  totalTests: number;
  flakyTests: TestResult[];
  nonFlakyTests: TestResult[];
  timestamp: string;
  config: FlakyTestConfig;
}

/**
 * Generate a unique test ID from file path and test name
 */
export function generateTestId(filePath: string, testName: string): string {
  const input = `${filePath}::${testName}`;
  return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

/**
 * Calculate the failure rate for a series of test runs
 */
export function calculateFailureRate(runs: boolean[]): number {
  if (runs.length === 0) return 0;
  const failures = runs.filter(run => !run).length;
  return failures / runs.length;
}

/**
 * Determine if a test is flaky based on failure rate threshold
 */
export function isFlaky(runs: boolean[], threshold: number): boolean {
  const failureRate = calculateFailureRate(runs);
  return failureRate > 0 && failureRate >= threshold;
}

/**
 * Parse vitest JSON report to extract test results
 */
export function parseVitestJsonReport(reportPath: string): TestResult[] {
  if (!existsSync(reportPath)) {
    throw new Error(`Report file not found: ${reportPath}`);
  }

  const reportContent = readFileSync(reportPath, 'utf-8');
  const report = JSON.parse(reportContent);

  const testResults: Map<string, TestResult> = new Map();

  // Process each test file result
  for (const fileResult of report.testResults || []) {
    const filePath = fileResult.name;

    for (const testCase of fileResult.assertionResults || []) {
      const testName = testCase.fullName || testCase.name;
      const testId = generateTestId(filePath, testName);

      if (!testResults.has(testId)) {
        testResults.set(testId, {
          testId,
          testName,
          filePath,
          runs: [],
          failureRate: 0,
          isFlaky: false,
        });
      }

      const testResult = testResults.get(testId)!;
      const passed = testCase.status === 'passed';
      testResult.runs.push(passed);
    }
  }

  // Calculate failure rates and flaky status
  const results: TestResult[] = [];
  for (const testResult of testResults.values()) {
    testResult.failureRate = calculateFailureRate(testResult.runs);
    results.push(testResult);
  }

  return results;
}

/**
 * Analyze test results for flakiness
 */
export function analyzeFlakyTests(
  testResults: TestResult[],
  threshold: number
): FlakyTestSummary {
  const flakyTests: TestResult[] = [];
  const nonFlakyTests: TestResult[] = [];

  for (const testResult of testResults) {
    testResult.isFlaky = isFlaky(testResult.runs, threshold);
    testResult.failureRate = calculateFailureRate(testResult.runs);

    if (testResult.isFlaky) {
      flakyTests.push(testResult);
    } else {
      nonFlakyTests.push(testResult);
    }
  }

  return {
    totalTests: testResults.length,
    flakyTests,
    nonFlakyTests,
    timestamp: new Date().toISOString(),
    config: { rerunCount: 0, threshold, outputPath: '', testPaths: [] },
  };
}

/**
 * Generate a summary report of flaky tests
 */
export function generateFlakyTestReport(summary: FlakyTestSummary): string {
  const lines: string[] = [
    '# Flaky Test Detection Report',
    '',
    `Generated: ${summary.timestamp}`,
    `Total Tests Analyzed: ${summary.totalTests}`,
    `Flaky Tests Found: ${summary.flakyTests.length}`,
    '',
    '---',
    '',
  ];

  if (summary.flakyTests.length === 0) {
    lines.push('✅ No flaky tests detected!');
    return lines.join('\n');
  }

  lines.push('## Flaky Tests');
  lines.push('');

  for (const test of summary.flakyTests) {
    const passCount = test.runs.filter(r => r).length;
    const failCount = test.runs.length - passCount;
    lines.push(`### ${test.testName}`);
    lines.push(`- **File**: ${test.filePath}`);
    lines.push(`- **Pass Rate**: ${((1 - test.failureRate) * 100).toFixed(1)}%`);
    lines.push(`- **Runs**: ${passCount} passed, ${failCount} failed`);
    lines.push(`- **Failure Rate**: ${(test.failureRate * 100).toFixed(1)}%`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Save flaky test report to file
 */
export function saveFlakyTestReport(summary: FlakyTestSummary, outputPath: string): void {
  const report = generateFlakyTestReport(summary);
  writeFileSync(outputPath, report, 'utf-8');
  console.log(`Flaky test report saved to: ${outputPath}`);
}

/**
 * Print flaky test summary to console
 */
export function printFlakyTestSummary(summary: FlakyTestSummary): void {
  console.log('\n=== Flaky Test Detection Results ===');
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Flaky Tests: ${summary.flakyTests.length}`);
  console.log(`Non-Flaky Tests: ${summary.nonFlakyTests.length}`);

  if (summary.flakyTests.length > 0) {
    console.log('\n⚠️  Flaky Tests Detected:');
    for (const test of summary.flakyTests) {
      const passCount = test.runs.filter(r => r).length;
      const failCount = test.runs.length - passCount;
      console.log(`  - ${test.testName}`);
      console.log(`    File: ${test.filePath}`);
      console.log(`    Result: ${passCount} passed, ${failCount} failed (${(test.failureRate * 100).toFixed(1)}% failure rate)`);
    }
  } else {
    console.log('\n✅ No flaky tests detected!');
  }
}

/**
 * Find all test files in a directory
 */
export function findTestFiles(directory: string, extensions: string[] = ['.test.ts', '.test.tsx']): string[] {
  const testFiles: string[] = [];

  function walkDir(dir: string): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip certain directories
        if (!['node_modules', 'dist', '.git', 'e2e'].includes(entry)) {
          walkDir(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          testFiles.push(fullPath);
        }
      }
    }
  }

  walkDir(directory);
  return testFiles;
}

/**
 * Run flaky test detection with vitest
 */
export async function runFlakyTestDetection(
  testPaths: string[],
  rerunCount: number = 3,
  threshold: number = 0.3
): Promise<FlakyTestSummary> {
  const tempDir = join(process.cwd(), '.flaky-test-results');
  
  // Track results per test across multiple runs
  const testRunResults: Map<string, TestResult> = new Map();

  for (let run = 0; run < rerunCount; run++) {
    console.log(`\nRun ${run + 1}/${rerunCount}...`);
    
    // Run vitest and capture JSON output
    const { exec } = await import('child_process');
    const reportFile = join(tempDir, `run-${run + 1}.json`);
    
    // Ensure temp directory exists
    const { mkdirSync, existsSync } = await import('fs');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Run tests with JSON reporter
    const testPathArg = testPaths.length > 0 ? testPaths.join(' ') : '';
    const command = `npx vitest run --reporter=json --outputFile=${reportFile} ${testPathArg}`;
    
    await new Promise<void>((resolve) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        // Log output but don't fail on test failures
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      });
    });

    // Parse results if file exists
    if (existsSync(reportFile)) {
      const results = parseVitestJsonReport(reportFile);
      
      for (const result of results) {
        if (!testRunResults.has(result.testId)) {
          testRunResults.set(result.testId, {
            ...result,
            runs: [],
          });
        }
        
        const existing = testRunResults.get(result.testId)!;
        existing.runs.push(...result.runs);
      }
    }
  }

  // Analyze results for flakiness
  const testResults = Array.from(testRunResults.values());
  const summary = analyzeFlakyTests(testResults, threshold);
  
  // Cleanup temp directory
  try {
    const { rmSync } = await import('fs');
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }

  return summary;
}

/**
 * Create a vitest plugin for flaky test detection
 */
export function createFlakyTestPlugin(config: Partial<FlakyTestConfig>) {
  const defaultConfig: FlakyTestConfig = {
    rerunCount: 3,
    threshold: 0.3,
    outputPath: './flaky-test-report.md',
    testPaths: ['./tests'],
    ...config,
  };

  return {
    name: 'flaky-test-detector',
    config: () => ({
      test: {
        // Add any necessary test configuration
      },
    }),
    configResolved(_config: unknown) {
      // Store config for later use
      (global as unknown).__flakyTestConfig = defaultConfig;
    },
  };
}
