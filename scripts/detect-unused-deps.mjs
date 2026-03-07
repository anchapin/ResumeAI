#!/usr/bin/env node
/**
 * Unused Dependencies Detector
 * 
 * Detects unused dependencies in the project to keep it lean.
 * Can be run with: node scripts/detect-unused-deps.mjs
 * 
 * Usage:
 *   node scripts/detect-unused-deps.mjs              # Check all dependencies
 *   node scripts/detect-unused-deps.mjs --dev       # Check devDependencies only
 *   node scripts/detect-unused-deps.mjs --prod      # Check dependencies only
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(PROJECT_ROOT, 'package.json');

// Parse command line arguments
const args = process.argv.slice(2);
const checkDev = args.includes('--dev');
const checkProd = args.includes('--prod');
const checkAll = !checkDev && !checkProd;

/**
 * Get all dependencies from package.json
 */
function getDependencies() {
  if (!existsSync(PACKAGE_JSON_PATH)) {
    console.error('Error: package.json not found!');
    process.exit(1);
  }

  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  
  const deps = {
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    peerDependencies: packageJson.peerDependencies || {}
  };

  if (checkAll) {
    return deps;
  } else if (checkDev) {
    return { dependencies: {}, devDependencies: deps.devDependencies, peerDependencies: {} };
  } else if (checkProd) {
    return { dependencies: deps.dependencies, devDependencies: {}, peerDependencies: {} };
  }
  
  return deps;
}

/**
 * Get list of source files to scan
 */
function getSourceFiles() {
  return new Promise((resolve) => {
    const find = spawn('sh', [
      '-c',
      'find src resume-api scripts tests -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" \\) 2>/dev/null'
    ], {
      cwd: PROJECT_ROOT
    });

    let output = '';
    find.stdout.on('data', (data) => {
      output += data.toString();
    });

    find.on('close', () => {
      const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'coverage', '.cache'];
      const files = output.split('\n')
        .filter(f => f.trim())
        .filter(f => !excludeDirs.some(dir => f.includes(`/${dir}/`) || f.includes(`\\${dir}\\`)));
      console.log(`Found ${files.length} source files to scan`);
      resolve(files);
    });
  });
}

/**
 * Scan source files for dependency usage
 */
async function scanForUsage(dependencies) {
  const allDeps = {
    ...dependencies.dependencies,
    ...dependencies.devDependencies,
    ...dependencies.peerDependencies
  };
  
  const depNames = Object.keys(allDeps);
  const usage = {};
  
  // Initialize usage counts
  for (const dep of depNames) {
    usage[dep] = { used: false, files: [] };
  }

  // Get source files
  const files = await getSourceFiles();
  
  console.log(`Scanning ${files.length} source files...\n`);
  
  // Check each file for imports
  for (const file of files) {
    try {
      const content = readFileSync(join(PROJECT_ROOT, file), 'utf-8');
      
      for (const dep of depNames) {
        // Check for various import patterns
        const patterns = [
          new RegExp(`from\\s+['"]${dep}['"]`, 'g'),
          new RegExp(`require\\s*\\(['"]${dep}['"]\\)` , 'g'),
          new RegExp(`import\\s+['"]${dep}['"]`, 'g'),
          new RegExp(`<${dep}[\\s>]`, 'g'), // JSX components
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            usage[dep].used = true;
            usage[dep].files.push(file);
            break;
          }
        }
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }

  return usage;
}

/**
 * Check if dependency is a built-in Node module
 */
function isBuiltinModule(dep) {
  const builtins = [
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
    'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
    'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
    'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url',
    'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
  ];
  return builtins.includes(dep);
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Unused Dependencies Detector\n');
  
  const deps = getDependencies();
  const allDepNames = Object.keys({ ...deps.dependencies, ...deps.devDependencies });
  
  console.log('Checking dependencies...');
  
  const usage = await scanForUsage(deps);
  
  // Categorize dependencies
  const unused = [];
  const used = [];
  
  for (const [dep, info] of Object.entries(usage)) {
    if (info.used) {
      used.push(dep);
    } else if (!isBuiltinModule(dep)) {
      unused.push({ name: dep, info });
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('DEPENDENCY ANALYSIS REPORT');
  console.log('='.repeat(60));
  console.log(`Total Dependencies: ${allDepNames.length}`);
  console.log(`In Use:            ${used.length}`);
  console.log(`Unused:            ${unused.length}`);
  console.log('='.repeat(60));

  if (unused.length > 0) {
    console.log('\n⚠️  UNUSED DEPENDENCIES (consider removing):');
    console.log('-'.repeat(60));
    
    for (const { name } of unused) {
      const depType = deps.dependencies[name] ? 'dependencies' : 
                      deps.devDependencies[name] ? 'devDependencies' : 'peerDependencies';
      console.log(`• ${name} (${depType})`);
    }
    
    console.log('\nTo remove unused dependencies:');
    console.log('  npm uninstall ' + unused.map(u => u.name).join(' '));
  } else {
    console.log('\n✅ All dependencies are in use!');
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    total: allDepNames.length,
    used: used.length,
    unused: unused.map(u => u.name),
    details: usage
  };
  
  const reportPath = join(PROJECT_ROOT, '.unused-deps-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to ${reportPath}`);
}

main().catch(console.error);
