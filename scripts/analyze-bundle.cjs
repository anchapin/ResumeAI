#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the production bundle to identify size issues and dependencies
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const distDir = path.join(__dirname, '../dist');

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function getGzipSize(filePath) {
  const content = fs.readFileSync(filePath);
  return zlib.gzipSync(content).length;
}

function analyzeBundles() {
  console.log('📦 Bundle Analysis Report\n');
  
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const files = [];
  let totalSize = 0;
  let totalGzipSize = 0;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.css'))) {
        const size = getFileSize(fullPath);
        const gzipSize = getGzipSize(fullPath);
        const relPath = path.relative(distDir, fullPath);
        
        files.push({
          path: relPath,
          size,
          gzipSize,
          percentage: 0
        });

        totalSize += size;
        totalGzipSize += gzipSize;
      }
    }
  }

  walkDir(distDir);

  // Calculate percentages
  files.forEach(file => {
    file.percentage = ((file.size / totalSize) * 100).toFixed(2);
  });

  // Sort by size
  files.sort((a, b) => b.size - a.size);

  // Print results
  console.log('Files (sorted by size):\n');
  console.log('File Name                          Size       Gzip       %');
  console.log('─'.repeat(70));

  files.forEach(file => {
    const name = file.path.padEnd(35);
    const size = formatBytes(file.size).padEnd(10);
    const gzip = formatBytes(file.gzipSize).padEnd(10);
    console.log(`${name} ${size} ${gzip} ${file.percentage}%`);
  });

  console.log('─'.repeat(70));
  console.log(`Total:                           ${formatBytes(totalSize).padEnd(10)} ${formatBytes(totalGzipSize)}`);
  console.log('\n');

  // Warnings
  if (totalGzipSize > 268000) { // 268KB threshold
    console.log('⚠️  WARNING: Bundle size is larger than 268KB gzipped');
    console.log('   Recommendation: Target <200KB by implementing code splitting\n');
  }

  // Identify large dependencies
  console.log('Large Files (>50KB):\n');
  const largeFiles = files.filter(f => f.size > 50000);
  
  if (largeFiles.length === 0) {
    console.log('None\n');
  } else {
    largeFiles.forEach(file => {
      console.log(`- ${file.path} (${formatBytes(file.size)} / ${formatBytes(file.gzipSize)} gzip)`);
    });
    console.log();
  }

  // Summary
  console.log('Summary:');
  console.log(`- Total Size: ${formatBytes(totalSize)}`);
  console.log(`- Gzipped Size: ${formatBytes(totalGzipSize)}`);
  console.log(`- Number of Files: ${files.length}`);
  console.log(`- Largest File: ${files[0].path} (${formatBytes(files[0].size)})`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

analyzeBundles();
