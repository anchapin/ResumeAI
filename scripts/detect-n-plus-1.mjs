#!/usr/bin/env node
/**
 * N+1 Query Detector
 * 
 * Detects potential N+1 query patterns in the codebase.
 * Can be run with: node scripts/detect-n-plus-1.mjs
 * 
 * Usage:
 *   node scripts/detect-n-plus-1.mjs              # Scan all files
 *   node scripts/detect-n-plus-1.mjs --strict    # Strict mode
 *   node scripts/detect-n-plus-1.mjs --verbose  # Verbose output
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const PROJECT_ROOT = process.cwd();

// Parse command line arguments
const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const verboseMode = args.includes('--verbose');

// Patterns that indicate potential N+1 queries
const N1_PATTERNS = [
  // Loop with query inside (most common)
  {
    name: 'For loop with query',
    pattern: /for\s+\w+\s+in\s+[\w.\[\]]+:\s*\n\s*(?:await\s+)?(?:\w+\.)?(?:find|get|filter|query|select|all|cursor)\(/,
    severity: 'high'
  },
  // List comprehension with query
  {
    name: 'List comprehension with query',
    pattern: /\[(?:await\s+)?(?:\w+\.)?(?:find|get|filter|query|all|cursor)\(.*for\s+\w+\s+in/,
    severity: 'high'
  },
  // While loop with query
  {
    name: 'While loop with query',
    pattern: /while\s+.*:\s*\n\s*(?:await\s+)?(?:\w+\.)?(?:find|get|filter|query|all|cursor)\(/,
    severity: 'medium'
  },
  // Iterate over query results and make another query
  {
    name: 'Iterate and query',
    pattern: /(?:for|while)\s+.*:\s*\n(?:.*\n){1,5}\s*(?:await\s+)?(?:\w+\.)?(?:find|get|filter|query|all)\(/,
    severity: 'high'
  },
  // SQLAlchemy: query inside loop
  {
    name: 'SQLAlchemy loop query',
    pattern: /for\s+\w+\s+in\s+.*\.query\(.*\):\s*\n\s*(?:db\.session\.)?(?:query|execute)/,
    severity: 'high'
  },
  // FastAPI: Depends() inside loop
  {
    name: 'Dependency inside loop',
    pattern: /for\s+.*:\s*\n\s*(?:await\s+)?Depends\(/,
    severity: 'medium'
  },
];

// Anti-patterns (safe patterns)
const SAFE_PATTERNS = [
  /#.*no.?n\+1/i,
  /#.*safe/i,
  /#.*nocommit/i,
  /\.all\(\)/,
  /\.batch\(/,
  /in_batches/,
  /preload\(/,
  /joinedload\(/,
  /selectinload\(/,
  /subqueryload\(/,
  /options\(/,
];

/**
 * Get Python files to scan
 */
function getPythonFiles() {
  return new Promise((resolve) => {
    const find = spawn('sh', [
      '-c',
      'find resume-api -type f -name "*.py" 2>/dev/null'
    ], {
      cwd: PROJECT_ROOT
    });

    let output = '';
    find.stdout.on('data', (data) => {
      output += data.toString();
    });

    find.on('close', () => {
      const files = output.split('\n')
        .filter(f => f.trim())
        .filter(f => !f.includes('/test') && !f.includes('/__pycache__'));
      console.log(`Found ${files.length} Python files to scan`);
      resolve(files);
    });
  });
}

/**
 * Check if a code block is safe from N+1
 */
function isSafe(code) {
  return SAFE_PATTERNS.some(pattern => pattern.test(code));
}

/**
 * Detect N+1 patterns in a file
 */
function detectN1Patterns(filePath, content) {
  const issues = [];
  const lines = content.split('\n');
  
  for (const pattern of N1_PATTERNS) {
    let match;
    // Global search
    const regex = new RegExp(pattern.pattern.source, 'gm');
    
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const lineNum = content.substring(0, match.index).split('\n').length;
      
      // Get surrounding context (5 lines before and after)
      const lineIndex = lineNum - 1;
      const contextStart = Math.max(0, lineIndex - 3);
      const contextEnd = Math.min(lines.length, lineIndex + 4);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      // Skip if marked as safe
      if (isSafe(context)) {
        continue;
      }
      
      issues.push({
        file: filePath,
        line: lineNum,
        pattern: pattern.name,
        severity: pattern.severity,
        context: context.substring(0, 200) // Limit context length
      });
    }
  }
  
  return issues;
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  try {
    const content = readFileSync(join(PROJECT_ROOT, filePath), 'utf-8');
    return detectN1Patterns(filePath, content);
  } catch (e) {
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 N+1 Query Detector\n');
  
  if (strictMode) {
    console.log('Mode: STRICT (all patterns)\n');
  } else {
    console.log('Mode: NORMAL (high severity only)\n');
  }
  
  const files = await getPythonFiles();
  
  console.log('Scanning for N+1 query patterns...\n');
  
  const allIssues = [];
  
  for (const file of files) {
    const issues = scanFile(file);
    allIssues.push(...issues);
  }
  
  // Filter by severity if not strict
  const filteredIssues = strictMode 
    ? allIssues 
    : allIssues.filter(i => i.severity === 'high');
  
  // Group by severity
  const bySeverity = {
    high: filteredIssues.filter(i => i.severity === 'high'),
    medium: filteredIssues.filter(i => i.severity === 'medium')
  };
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('N+1 QUERY ANALYSIS');
  console.log('='.repeat(60));
  console.log(`Files Scanned:   ${files.length}`);
  console.log(`Total Issues:   ${filteredIssues.length}`);
  console.log(`  High:         ${bySeverity.high.length}`);
  console.log(`  Medium:       ${bySeverity.medium.length}`);
  console.log('='.repeat(60));

  if (filteredIssues.length > 0) {
    console.log('\n⚠️  POTENTIAL N+1 QUERIES DETECTED:');
    console.log('-'.repeat(60));
    
    for (const issue of filteredIssues) {
      const indicator = issue.severity === 'high' ? '🔴' : '🟡';
      console.log(`${indicator} ${issue.pattern}`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      if (verboseMode) {
        console.log(`   Context:`);
        console.log(`   ${issue.context.split('\n').join('\n   ')}`);
      }
      console.log('');
    }
    
    console.log('\n💡 Suggestions to fix N+1 queries:');
    console.log('   1. Use eager loading (joinedload, selectinload) in SQLAlchemy');
    console.log('   2. Batch queries outside loops');
    console.log('   3. Use database-level IN queries');
    console.log('   4. Consider using pagination');
  } else {
    console.log('\n✅ No N+1 query patterns detected!');
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    filesScanned: files.length,
    totalIssues: filteredIssues.length,
    issues: filteredIssues
  };
  
  const reportPath = join(PROJECT_ROOT, '.n1-query-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to ${reportPath}`);
}

main().catch(console.error);
