#!/usr/bin/env node
/**
 * Build Performance Tracker
 * 
 * Tracks build performance metrics to identify and optimize slow builds.
 * Can be run with: node scripts/build-performance.mjs
 * 
 * Usage:
 *   node scripts/build-performance.mjs              # Run build with tracking
 *   node scripts/build-performance.mjs --watch     # Watch mode
 *   node scripts/build-performance.mjs --history  # Show build history
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const HISTORY_FILE = join(PROJECT_ROOT, '.build-performance-history.json');
const DEFAULT_THRESHOLD = 60000; // 60 seconds

// Parse command line arguments
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const historyMode = args.includes('--history');
const thresholdIndex = args.indexOf('--threshold');
const threshold = thresholdIndex !== -1 && args[thresholdIndex + 1] 
  ? parseInt(args[thresholdIndex + 1], 10) 
  : DEFAULT_THRESHOLD;

/**
 * Run build and measure performance
 */
function runBuild() {
  return new Promise((resolve) => {
    console.log('Starting build with performance tracking...\n');
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    const buildArgs = watchMode 
      ? ['vite', 'build', '--watch']
      : ['vite', 'build'];
    
    const build = spawn('npx', buildArgs, {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stderr = '';
    let stdout = '';

    build.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    build.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    build.on('close', (code) => {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      const duration = endTime - startTime;
      const memoryDelta = {
        rss: Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024),
        heapUsed: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024)
      };

      resolve({
        code,
        duration,
        memoryDelta,
        startTime,
        endTime,
        stdout,
        stderr
      });
    });
  });
}

/**
 * Save build to history
 */
function saveToHistory(buildData) {
  let history = [];
  
  if (existsSync(HISTORY_FILE)) {
    try {
      history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    } catch (e) {
      history = [];
    }
  }
  
  // Add new build
  history.push({
    timestamp: new Date().toISOString(),
    duration: buildData.duration,
    threshold,
    slow: buildData.duration > threshold,
    success: buildData.code === 0
  });
  
  // Keep last 50 builds
  history = history.slice(-50);
  
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Calculate statistics from history
 */
function calculateStats(history) {
  if (history.length === 0) {
    return null;
  }
  
  const durations = history.map(h => h.duration);
  const total = durations.reduce((a, b) => a + b, 0);
  const avgDuration = total / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  // Calculate trend (simple linear regression)
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < durations.length; i++) {
    sumXY += i * durations[i];
    sumX2 += i * i;
  }
  const trend = (sumXY / sumX2) - (avgDuration * (durations.length - 1) / 2);
  
  const slowBuilds = history.filter(h => h.slow).length;
  
  return {
    count: history.length,
    avgDuration: Math.round(avgDuration),
    minDuration,
    maxDuration,
    slowBuilds,
    slowPercentage: Math.round((slowBuilds / history.length) * 100),
    trend: trend > 0 ? 'slower' : trend < 0 ? 'faster' : 'stable',
    trendValue: Math.round(trend)
  };
}

/**
 * Print performance report
 */
function printReport(buildData, stats) {
  const durationSec = (buildData.duration / 1000).toFixed(2);
  const slow = buildData.duration > threshold;
  
  console.log('\n' + '='.repeat(60));
  console.log('BUILD PERFORMANCE REPORT');
  console.log('='.repeat(60));
  console.log(`Build Time:      ${durationSec}s`);
  console.log(`Threshold:       ${(threshold / 1000).toFixed(0)}s`);
  console.log(`Status:          ${buildData.code === 0 ? '✅ Success' : '❌ Failed'}`);
  console.log(`Memory Delta:    ${buildData.memoryDelta.rss}MB RSS, ${buildData.memoryDelta.heapUsed}MB heap`);
  console.log('='.repeat(60));

  if (slow) {
    console.log(`\n⚠️  Build is SLOWER than threshold by ${((buildData.duration - threshold) / 1000).toFixed(2)}s`);
    console.log('Suggestions:');
    console.log('  - Check for circular dependencies');
    console.log('  - Consider code splitting');
    console.log('  - Review large dependencies');
  } else {
    console.log('\n✅ Build completed within threshold!');
  }

  if (stats) {
    console.log('\n' + '-'.repeat(60));
    console.log('HISTORY STATISTICS');
    console.log('-'.repeat(60));
    console.log(`Total Builds:    ${stats.count}`);
    console.log(`Avg Duration:    ${(stats.avgDuration / 1000).toFixed(2)}s`);
    console.log(`Min Duration:    ${(stats.minDuration / 1000).toFixed(2)}s`);
    console.log(`Max Duration:    ${(stats.maxDuration / 1000).toFixed(2)}s`);
    console.log(`Slow Builds:     ${stats.slowBuilds} (${stats.slowPercentage}%)`);
    console.log(`Trend:           ${stats.trend} (${stats.trendValue > 0 ? '+' : ''}${(stats.trendValue / 1000).toFixed(2)}s/build)`);
  }
  
  console.log('');
}

/**
 * Show build history
 */
function showHistory() {
  if (!existsSync(HISTORY_FILE)) {
    console.log('No build history found. Run build-performance.mjs first.');
    return;
  }
  
  const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
  const stats = calculateStats(history);
  
  console.log('\n' + '='.repeat(60));
  console.log('BUILD HISTORY');
  console.log('='.repeat(60));
  console.log(`Showing last ${Math.min(10, history.length)} builds:\n`);
  
  const recentBuilds = history.slice(-10).reverse();
  for (const build of recentBuilds) {
    const date = new Date(build.timestamp).toLocaleString();
    const duration = (build.duration / 1000).toFixed(2);
    const status = build.success ? '✅' : '❌';
    const slow = build.slow ? '⚠️' : ' ';
    console.log(`${status} ${slow} ${date} - ${duration}s`);
  }
  
  if (stats) {
    printReport({ 
      duration: stats.avgDuration, 
      code: 0, 
      memoryDelta: { rss: 0, heapUsed: 0 }
    }, stats);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏗️  Build Performance Tracker\n');
  console.log(`Threshold: ${(threshold / 1000).toFixed(0)}s\n`);

  if (historyMode) {
    showHistory();
    return;
  }

  try {
    const buildData = await runBuild();
    
    // Save to history
    saveToHistory(buildData);
    
    // Calculate stats
    let stats = null;
    if (existsSync(HISTORY_FILE)) {
      const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
      stats = calculateStats(history);
    }
    
    printReport(buildData, stats);

    if (buildData.code !== 0) {
      console.log('\n⚠️  Build failed with exit code:', buildData.code);
      process.exit(buildData.code);
    }
  } catch (error) {
    console.error('Error running build:', error);
    process.exit(1);
  }
}

main();
