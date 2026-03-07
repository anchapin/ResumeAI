#!/usr/bin/env node
/**
 * Test Performance Tracker
 * 
 * Tracks test execution time to identify slow tests that need optimization.
 * Can be run with: node scripts/test-performance.mjs
 * 
 * Usage:
 *   node scripts/test-performance.mjs              # Run all tests
 *   node scripts/test-performance.mjs --watch     # Watch mode
 *   node scripts/test-performance.mjs --threshold 100  # Custom threshold in ms
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_THRESHOLD = 100; // ms - tests slower than this are flagged
const OUTPUT_FILE = '.test-performance.json';
const JSON_REPORT_FILE = '.vitest-results.json';

// Parse command line arguments
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const thresholdIndex = args.indexOf('--threshold');
const threshold = thresholdIndex !== -1 && args[thresholdIndex + 1] 
  ? parseInt(args[thresholdIndex + 1], 10) 
  : DEFAULT_THRESHOLD;

/**
 * Run vitest with JSON reporter and capture timing data
 */
function runTests() {
  return new Promise((resolve, reject) => {
    console.log('Running tests with performance tracking...\n');
    
    // Use vitest's built-in JSON reporter
    const vitestArgs = [
      'vitest', 
      '--run', 
      '--reporter=json',
      '--outputFile=' + JSON_REPORT_FILE
    ];
    
    const vitest = spawn('npx', vitestArgs, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stderr = '';

    vitest.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    vitest.on('close', async (code) => {
      // Read the JSON report
      let rawData = null;
      
      if (existsSync(JSON_REPORT_FILE)) {
        try {
          const { readFileSync } = await import('fs');
          const content = readFileSync(JSON_REPORT_FILE, 'utf-8');
          rawData = JSON.parse(content);
        } catch (e) {
          console.error('Error reading JSON report:', e.message);
        }
      }

      // Calculate statistics
      const stats = calculateStats(rawData);
      
      resolve({
        code,
        stats,
        stderr
      });
    });
  });
}

/**
 * Calculate performance statistics
 */
function calculateStats(data) {
  // Handle vitest JSON format
  const testResults = data?.testResults || [];
  
  if (!testResults || !Array.isArray(testResults) || testResults.length === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      slow: 0,
      avgDuration: 0,
      threshold
    };
  }

  const parsedTests = [];
  
  for (const suite of testResults) {
    const assertions = suite.assertionResults || suite.tests || [];
    for (const test of assertions) {
      parsedTests.push({
        name: test.fullName || test.title || 'Unknown',
        status: test.status === 'passed' ? 'pass' : test.status === 'failed' ? 'fail' : 'skip',
        duration: test.duration || 0,
        slow: (test.duration || 0) >= threshold
      });
    }
  }

  const passResults = parsedTests.filter(r => r.status === 'pass');
  const slowTests = parsedTests.filter(r => r.slow);
  const totalDuration = parsedTests.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = parsedTests.length > 0 ? totalDuration / parsedTests.length : 0;

  return {
    total: parsedTests.length,
    passed: passResults.length,
    failed: parsedTests.filter(r => r.status === 'fail').length,
    slow: slowTests.length,
    slowPercentage: parsedTests.length > 0 ? ((slowTests.length / parsedTests.length) * 100).toFixed(1) : 0,
    avgDuration: Math.round(avgDuration),
    threshold,
    slowTests: slowTests.sort((a, b) => b.duration - a.duration).slice(0, 10)
  };
}

/**
 * Print performance report
 */
function printReport(stats) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST PERFORMANCE REPORT');
  console.log('='.repeat(60));
  console.log(`Total Tests:    ${stats.total}`);
  console.log(`Passed:         ${stats.passed}`);
  console.log(`Failed:         ${stats.failed}`);
  console.log(`Slow Tests:     ${stats.slow} (${stats.slowPercentage}%)`);
  console.log(`Avg Duration:   ${stats.avgDuration}ms`);
  console.log(`Threshold:      ${stats.threshold}ms`);
  console.log('='.repeat(60));

  if (stats.slowTests.length > 0) {
    console.log('\nSLOWEST TESTS (may need optimization):');
    console.log('-'.repeat(60));
    stats.slowTests.forEach((test, i) => {
      const indicator = test.duration >= threshold * 2 ? '🔴' : test.duration >= threshold ? '🟡' : '🟢';
      console.log(`${i + 1}. ${indicator} ${test.name}`);
      console.log(`   Duration: ${test.duration}ms`);
    });
  } else {
    console.log('\n✅ All tests are performing well!');
  }
  
  console.log('');
}

/**
 * Save results to JSON file
 */
function saveResults(stats) {
  const output = {
    timestamp: new Date().toISOString(),
    ...stats
  };
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Results saved to ${OUTPUT_FILE}`);
}

/**
 * Main execution
 */
async function main() {
  console.log(`Test Performance Tracker`);
  console.log(`Threshold: ${threshold}ms\n`);

  try {
    const result = await runTests();
    printReport(result.stats);
    saveResults(result.stats);

    if (result.code !== 0) {
      console.log('\n⚠️ Some tests failed. Check output above for details.');
    }

    process.exit(result.code);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

main();
