#!/usr/bin/env node
/**
 * Flaky Test Detection Script
 * 
 * Run this script to detect flaky tests in the project.
 * Usage: node scripts/detect-flaky-tests.js [--runs <number>] [--threshold <number>] [--paths <paths>]
 * 
 * This script runs tests multiple times and analyzes results to detect flaky tests.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const { writeFileSync, mkdirSync, existsSync, rmSync } = require('fs');
const { join } = require('path');

const execAsync = promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
let rerunCount = 3;
let threshold = 0.3;
let testPaths = ['./tests'];

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--runs':
      rerunCount = parseInt(args[i + 1], 10);
      i++;
      break;
    case '--threshold':
      threshold = parseFloat(args[i + 1]);
      i++;
      break;
    case '--paths':
      testPaths = args[i + 1].split(',');
      i++;
      break;
    case '--help':
      console.log(`
Flaky Test Detection Script

Usage: node scripts/detect-flaky-tests.js [options]

Options:
  --runs <number>       Number of times to run each test (default: 3)
  --threshold <number> Failure rate threshold to consider a test flaky (0-1, default: 0.3)
  --paths <paths>       Comma-separated list of test paths (default: ./tests)
  --help                Show this help message
      `);
      process.exit(0);
  }
}

console.log('=== Flaky Test Detection ===');
console.log(`Runs: ${rerunCount}`);
console.log(`Threshold: ${threshold}`);
console.log(`Paths: ${testPaths.join(', ')}`);
console.log('');

/**
 * Calculate failure rate
 */
function calculateFailureRate(runs) {
  if (runs.length === 0) return 0;
  const failures = runs.filter(run => !run).length;
  return failures / runs.length;
}

/**
 * Determine if a test is flaky
 */
function isFlaky(runs, thresholdVal) {
  const failureRate = calculateFailureRate(runs);
  return failureRate > 0 && failureRate >= thresholdVal;
}

/**
 * Generate a summary report of flaky tests
 */
function generateFlakyTestReport(summary) {
  const lines = [
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
 * Print flaky test summary to console
 */
function printFlakyTestSummary(summary) {
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
 * Run flaky test detection
 */
async function runFlakyTestDetection(testPaths, rerunCount, threshold) {
  const tempDir = join(process.cwd(), '.flaky-test-results');
  const testRunResults = new Map();

  // Ensure temp directory exists
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  for (let run = 0; run < rerunCount; run++) {
    console.log(`\nRun ${run + 1}/${rerunCount}...`);
    
    try {
      const testPathArg = testPaths.length > 0 ? testPaths.join(' ') : '';
      const reportFile = join(tempDir, `run-${run + 1}.json`);
      const command = `npx vitest run --reporter=json --outputFile="${reportFile}" ${testPathArg}`;
      
      await execAsync(command, { cwd: process.cwd() });
    } catch (error) {
      // Continue even if tests fail
      console.log('Test run completed with some failures');
    }
  }

  // Parse results from JSON files
  for (let run = 0; run < rerunCount; run++) {
    const reportFile = join(tempDir, `run-${run + 1}.json`);
    if (existsSync(reportFile)) {
      try {
        const content = require('fs').readFileSync(reportFile, 'utf-8');
        const report = JSON.parse(content);
        
        for (const fileResult of report.testResults || []) {
          const filePath = fileResult.name;
          
          for (const testCase of fileResult.assertionResults || []) {
            const testName = testCase.fullName || testCase.name;
            const testId = `${filePath}::${testName}`;
            
            if (!testRunResults.has(testId)) {
              testRunResults.set(testId, {
                testId,
                testName,
                filePath,
                runs: [],
              });
            }
            
            const testResult = testRunResults.get(testId);
            const passed = testCase.status === 'passed';
            testResult.runs.push(passed);
          }
        }
      } catch (error) {
        console.log(`Error parsing ${reportFile}: ${error.message}`);
      }
    }
  }

  // Analyze results for flakiness
  const flakyTests = [];
  const nonFlakyTests = [];

  for (const testResult of testRunResults.values()) {
    testResult.isFlaky = isFlaky(testResult.runs, threshold);
    testResult.failureRate = calculateFailureRate(testResult.runs);

    if (testResult.isFlaky) {
      flakyTests.push(testResult);
    } else {
      nonFlakyTests.push(testResult);
    }
  }

  // Cleanup temp directory
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }

  return {
    totalTests: testRunResults.size,
    flakyTests,
    nonFlakyTests,
    timestamp: new Date().toISOString(),
    config: { rerunCount, threshold, outputPath: '', testPaths },
  };
}

// Run flaky test detection
runFlakyTestDetection(testPaths, rerunCount, threshold)
  .then((summary) => {
    printFlakyTestSummary(summary);
    
    // Save report
    const report = generateFlakyTestReport(summary);
    writeFileSync('./flaky-test-report.md', report, 'utf-8');
    console.log(`\nFlaky test report saved to: ./flaky-test-report.md`);
    
    // Exit with error code if flaky tests found
    if (summary.flakyTests.length > 0) {
      console.log('\n⚠️  Warning: Flaky tests detected!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Error running flaky test detection:', error);
    process.exit(1);
  });
