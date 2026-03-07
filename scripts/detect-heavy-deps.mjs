#!/usr/bin/env node
/**
 * Heavy Dependencies Detector
 * 
 * Detects heavy dependencies that impact bundle size.
 * Can be run with: node scripts/detect-heavy-deps.mjs
 * 
 * Usage:
 *   node scripts/detect-heavy-deps.mjs              # Analyze bundle size
 *   node scripts/detect-heavy-deps.mjs --threshold 50  # Custom threshold in KB
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(PROJECT_ROOT, 'package.json');

// Known sizes for common dependencies (in KB, approximate minified + gzipped)
const KNOWN_SIZES = {
  // Heavy dependencies (should be flagged)
  'recharts': 120,
  'moment': 300,
  'lodash': 70,
  'lodash-es': 70,
  'antd': 1500,
  'material-ui': 800,
  '@mui/material': 800,
  'chart.js': 200,
  'd3': 500,
  'three': 600,
  'phaser': 1500,
  'babylonjs': 2000,
  
  // Medium-heavy
  'react-dom': 40,
  'react': 5,
  'react-router-dom': 25,
  'react-router': 25,
  'i18next': 15,
  'zustand': 5,
  '@sentry/react': 50,
  'react-markdown': 40,
  'dompurify': 15,
  
  // Light dependencies
  'react-is': 3,
  'react-i18next': 10,
  'lz-string': 5,
  'zod': 30,
  'yup': 80,
  'clsx': 1,
  'classnames': 2,
};

// Default threshold in KB
const DEFAULT_THRESHOLD = 50;

// Parse command line arguments
const args = process.argv.slice(2);
const thresholdIndex = args.indexOf('--threshold');
const threshold = thresholdIndex !== -1 && args[thresholdIndex + 1] 
  ? parseInt(args[thresholdIndex + 1], 10) 
  : DEFAULT_THRESHOLD;

/**
 * Get all dependencies from package.json
 */
function getDependencies() {
  if (!existsSync(PACKAGE_JSON_PATH)) {
    console.error('Error: package.json not found!');
    process.exit(1);
  }

  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  
  return {
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {}
  };
}

/**
 * Analyze bundle size using webpack stats or vite bundle analysis
 */
async function analyzeBundle() {
  // First try to use existing build output
  const distPath = join(PROJECT_ROOT, 'dist');
  const buildPath = join(PROJECT_ROOT, 'build');
  
  const statsPath = existsSync(join(distPath, '.vite'))
    ? join(distPath, '.vite', 'stats.html')
    : existsSync(join(buildPath, 'asset-manifest.json'))
      ? buildPath
      : null;

  // Run a build with bundle analysis if no existing stats
  return new Promise((resolve) => {
    // Check if there's a build script
    console.log('Analyzing bundle sizes...\n');
    
    // Try to use vite build with --report
    const buildArgs = ['vite', 'build', '--report'];
    
    const build = spawn('npx', buildArgs, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      shell: true
    });

    let stderr = '';
    build.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    build.on('close', (code) => {
      // Try to read the generated report
      const reportPaths = [
        join(PROJECT_ROOT, 'dist', 'report.html'),
        join(PROJECT_ROOT, 'dist', 'report.json'),
      ];
      
      for (const reportPath of reportPaths) {
        if (existsSync(reportPath)) {
          console.log(`Found report at ${reportPath}`);
        }
      }
      
      resolve({ code, stderr });
    });
  });
}

/**
 * Estimate dependency sizes based on node_modules
 */
async function estimateSizes(dependencies) {
  const results = [];
  
  for (const [dep, version] of Object.entries(dependencies)) {
    const knownSize = KNOWN_SIZES[dep];
    
    if (knownSize !== undefined) {
      results.push({
        name: dep,
        version,
        size: knownSize,
        heavy: knownSize >= threshold
      });
    } else {
      // Try to estimate from node_modules
      const depPath = join(PROJECT_ROOT, 'node_modules', dep);
      
      if (existsSync(depPath)) {
        // Look for package.json to get actual size
        try {
          const pkgPath = join(depPath, 'package.json');
          if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            
            // Estimate based on main entry point size
            const mainFile = pkg.main || pkg.module || 'index.js';
            const mainPath = join(depPath, mainFile);
            
            // Check if it's a directory (might have multiple files)
            if (existsSync(mainPath)) {
              const stats = require('fs').statSync(mainPath);
              const sizeKB = Math.round(stats.size / 1024);
              
              results.push({
                name: dep,
                version,
                size: sizeKB,
                heavy: sizeKB >= threshold
              });
            } else {
              results.push({
                name: dep,
                version,
                size: null,
                heavy: false,
                note: 'Could not determine size'
              });
            }
          }
        } catch (e) {
          results.push({
            name: dep,
            version,
            size: null,
            heavy: false,
            note: 'Could not analyze'
          });
        }
      } else {
        results.push({
          name: dep,
          version,
          size: null,
          heavy: false,
          note: 'Not installed'
        });
      }
    }
  }
  
  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('📦 Heavy Dependencies Detector\n');
  console.log(`Threshold: ${threshold}KB\n`);
  
  const deps = getDependencies();
  const allDeps = { ...deps.dependencies };
  
  console.log(`Analyzing ${Object.keys(allDeps).length} dependencies...`);
  
  const results = await estimateSizes(allDeps);
  
  // Categorize
  const heavy = results.filter(r => r.heavy);
  const light = results.filter(r => !r.heavy && r.size !== null);
  const unknown = results.filter(r => r.size === null);

  // Sort heavy by size descending
  heavy.sort((a, b) => b.size - a.size);

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('HEAVY DEPENDENCIES ANALYSIS');
  console.log('='.repeat(60));
  console.log(`Total Dependencies: ${results.length}`);
  console.log(`Heavy (>${threshold}KB): ${heavy.length}`);
  console.log(`Light: ${light.length}`);
  console.log(`Unknown: ${unknown.length}`);
  console.log('='.repeat(60));

  if (heavy.length > 0) {
    console.log('\n⚠️  HEAVY DEPENDENCIES (consider optimization):');
    console.log('-'.repeat(60));
    
    for (const dep of heavy) {
      const sizeIndicator = dep.size >= threshold * 3 ? '🔴' : 
                           dep.size >= threshold * 2 ? '🟠' : '🟡';
      console.log(`${sizeIndicator} ${dep.name}`);
      console.log(`   Version: ${dep.version}`);
      console.log(`   Size: ~${dep.size}KB`);
      
      // Provide optimization suggestions
      if (dep.name === 'recharts') {
        console.log(`   💡 Suggestion: Consider using lighter chart library (e.g., visx, chart.js)`);
      } else if (dep.name === 'moment') {
        console.log(`   💡 Suggestion: Use dayjs or date-fns for smaller bundle`);
      } else if (dep.name === 'lodash') {
        console.log(`   💡 Suggestion: Use lodash-es and import only needed functions`);
      }
      console.log('');
    }
  } else {
    console.log('\n✅ No heavy dependencies detected!');
  }

  if (light.length > 0 && light.length <= 10) {
    console.log('\n📊 Light dependencies:');
    for (const dep of light.sort((a, b) => a.size - b.size)) {
      console.log(`   ${dep.name}: ~${dep.size}KB`);
    }
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    threshold,
    total: results.length,
    heavy: heavy.length,
    light: light.length,
    heavyDeps: heavy,
    allDeps: results
  };
  
  const reportPath = join(PROJECT_ROOT, '.heavy-deps-report.json');
  const { writeFileSync } = await import('fs');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to ${reportPath}`);
}

main().catch(console.error);
