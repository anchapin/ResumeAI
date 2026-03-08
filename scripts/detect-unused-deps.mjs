#!/usr/bin/env node
/**
 * Unused Dependencies Detector
 * 
 * Detects unused dependencies in the project to keep it lean.
 * Uses improved detection logic for better accuracy.
 * 
 * Usage:
 *   node scripts/detect-unused-deps.mjs              # Check all dependencies
 *   node scripts/detect-unused-deps.mjs --dev       # Check devDependencies only
 *   node scripts/detect-unused-deps.mjs --prod      # Check dependencies only
 *   node scripts/detect-unused-deps.mjs --json      # Output JSON format
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
const jsonOutput = args.includes('--json');

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
 * Get all config files that might reference dependencies
 */
function getConfigFiles() {
  const configPatterns = [
    '.eslintrc*',
    'eslint.config.*',
    '.prettierrc*',
    'jest.config*',
    'vitest.config*',
    'vite.config*',
    'tsconfig*',
    '.husky/*',
    'lint-staged.config*',
    'playwright.config*',
    '.jscpd.json',
    '.mswrc',
    'msw/**/*.js',
    'msw/**/*.ts'
  ];
  
  return configPatterns;
}

/**
 * Get list of source files to scan
 */
function getSourceFiles() {
  return new Promise((resolve) => {
    const find = spawn('sh', [
      '-c',
      'find src resume-api scripts tests components pages store contexts utils hooks i18n -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" -o -name "*.cjs" \\) 2>/dev/null'
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
      resolve(files);
    });
  });
}

/**
 * Get list of config files to scan
 */
function getConfigFilesList() {
  return new Promise((resolve) => {
    const find = spawn('sh', [
      '-c',
      'find . -maxdepth 3 -type f \\( -name ".eslintrc*" -o -name "eslint.config.*" -o -name ".prettierrc*" -o -name "jest.config*" -o -name "vitest.config*" -o -name "vite.config*" -o -name "tsconfig*" -o -name "lint-staged.config*" -o -name "playwright.config*" -o -name ".jscpd.json" -o -name ".mswrc" \\) -not -path "*/node_modules/*" 2>/dev/null'
    ], {
      cwd: PROJECT_ROOT
    });

    let output = '';
    find.stdout.on('data', (data) => {
      output += data.toString();
    });

    find.on('close', () => {
      const files = output.split('\n').filter(f => f.trim() && !f.includes('node_modules'));
      resolve(files);
    });
  });
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
 * Check if dependency is a known special-case that should be considered as used
 * These are packages that don't have direct imports but are required/used in specific ways
 */
function isKnownSpecialCase(dep) {
  const specialCases = {
    // ESLint configs and plugins used in eslint.config.js
    'eslint-config-prettier': 'Disables ESLint rules that conflict with Prettier',
    'eslint-plugin-import': 'Provides import rules for ESLint',
    'eslint-plugin-react-refresh': 'Enables React Fast Refresh for HMR',
    // Coverage packages used in vitest config
    '@vitest/coverage-istanbul': 'Used for coverage reporting via vitest config',
    '@vitest/coverage-v8': 'Used for coverage reporting via vitest config',
  };
  return specialCases[dep] !== undefined;
}

/**
 * Check if dependency is a type package (@types/*)
 */
function isTypePackage(dep) {
  return dep.startsWith('@types/');
}

/**
 * Check if dependency is a scoped package
 */
function getPackageName(dep) {
  if (dep.startsWith('@')) {
    // Handle scoped packages like @sentry/react -> @sentry/react
    return dep;
  }
  return dep;
}

/**
 * Generate regex patterns for dependency
 */
function generatePatterns(dep) {
  const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const packageName = getPackageName(dep);
  
  return [
    // ES6 imports: import x from 'package'
    new RegExp(`from\\s+['"]${escapedDep}['"]`, 'g'),
    // ES6 imports: import 'package'
    new RegExp(`import\\s+['"]${escapedDep}['"]`, 'g'),
    // CommonJS require: require('package')
    new RegExp(`require\\s*\\(\\s*['"]${escapedDep}['"]\\s*\\)`, 'g'),
    // Dynamic import: import('package')
    new RegExp(`import\\s*\\(\\s*['"]${escapedDep}['"]\\s*\\)`, 'g'),
    // JSX components: <PackageName ... or <PackageName/>
    new RegExp(`<${escapedDep.split('/').pop()}[\\s/>]`, 'g'),
    // Config references (for eslint, prettier, etc.)
    new RegExp(`${escapedDep}`, 'g'),
  ];
}

/**
 * Check if dependency is used in configuration
 */
function isUsedInConfig(dep, configFiles) {
  const depName = getPackageName(dep);
  const depShortName = dep.split('/').pop();
  
  for (const file of configFiles) {
    try {
      const content = readFileSync(join(PROJECT_ROOT, file), 'utf-8');
      const patterns = generatePatterns(dep);
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
      
      // Also check for the short name (e.g., 'react' for '@types/react')
      if (depShortName !== depName) {
        const shortPatterns = generatePatterns(depShortName);
        for (const pattern of shortPatterns) {
          if (pattern.test(content)) {
            return true;
          }
        }
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }
  return false;
}

/**
 * Check if dependency is configured in package.json scripts or config
 */
function isUsedInPackageJson(dep, packageJson) {
  const depName = getPackageName(dep);
  const depShortName = dep.split('/').pop();
  
  // Check scripts
  const scripts = packageJson.scripts || {};
  for (const script of Object.values(scripts)) {
    if (typeof script === 'string') {
      if (script.includes(depName) || script.includes(depShortName)) {
        return true;
      }
    }
  }
  
  // Check msw configuration
  if (packageJson.msw) {
    if (depName === 'msw' || depShortName === 'msw') {
      return true;
    }
  }
  
  // Check overrides
  if (packageJson.overrides) {
    for (const overrideDep of Object.keys(packageJson.overrides)) {
      if (overrideDep === depName || overrideDep === depShortName) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Scan source files for dependency usage
 */
async function scanForUsage(dependencies, configFiles, packageJson) {
  const allDeps = {
    ...dependencies.dependencies,
    ...dependencies.devDependencies,
    ...dependencies.peerDependencies
  };
  
  const depNames = Object.keys(allDeps);
  const usage = {};
  
  // Initialize usage counts
  for (const dep of depNames) {
    usage[dep] = { used: false, files: [], reason: null };
  }

  // Get source files
  const files = await getSourceFiles();
  
  console.log(`Scanning ${files.length} source files...\n`);
  
  // Check each file for imports
  for (const file of files) {
    try {
      const content = readFileSync(join(PROJECT_ROOT, file), 'utf-8');
      
      for (const dep of depNames) {
        if (usage[dep].used) continue;
        
        const patterns = generatePatterns(dep);
        
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            usage[dep].used = true;
            usage[dep].files.push(file);
            usage[dep].reason = 'source import';
            break;
          }
        }
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }

  // Check config files
  console.log(`Scanning ${configFiles.length} config files...\n`);
  for (const dep of depNames) {
    if (usage[dep].used) continue;
    
    if (isUsedInConfig(dep, configFiles)) {
      usage[dep].used = true;
      usage[dep].reason = 'config file';
    }
  }
  
  // Check package.json scripts and config
  for (const dep of depNames) {
    if (usage[dep].used) continue;
    
    if (isUsedInPackageJson(dep, packageJson)) {
      usage[dep].used = true;
      usage[dep].reason = 'package.json config';
    }
  }

  return usage;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Unused Dependencies Detector\n');
  
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  const deps = getDependencies();
  const allDepNames = Object.keys({ ...deps.dependencies, ...deps.devDependencies });
  
  console.log('Checking dependencies...');
  
  const configFiles = await getConfigFilesList();
  console.log(`Found ${configFiles.length} config files to scan`);
  
  const usage = await scanForUsage(deps, configFiles, packageJson);
  
  // Categorize dependencies
  const unused = [];
  const used = [];
  
  for (const [dep, info] of Object.entries(usage)) {
    // Type packages are considered used (they're used by TypeScript)
    if (isTypePackage(dep)) {
      used.push(dep);
      continue;
    }
    
    // Built-in modules are not dependencies, skip
    if (isBuiltinModule(dep)) {
      continue;
    }
    
    // Known special cases are considered used
    if (isKnownSpecialCase(dep)) {
      used.push(dep);
      continue;
    }
    
    if (info.used) {
      used.push(dep);
    } else {
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
    
    for (const { name, info } of unused) {
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
  
  // Output JSON if requested
  if (jsonOutput) {
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(report, null, 2));
  }
  
  // Exit with error if there are unused dependencies
  if (unused.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
