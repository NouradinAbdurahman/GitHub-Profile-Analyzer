#!/usr/bin/env node

/**
 * This script checks for potential secrets in files that are about to be committed.
 * Run this before committing to ensure no sensitive information is pushed to GitHub.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PATTERNS = [
  /firebase.*key/i,
  /api[_-]?key/i,
  /auth[_-]?token/i,
  /password/i,
  /secret/i,
  /credential/i,
  /private[_-]?key/i,
  /BEGIN PRIVATE KEY/,
  /firebase-adminsdk/i,
];

const IGNORED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
const IGNORED_DIRS = ['node_modules', '.next', '.git', 'public'];

function checkForSecrets(filePath) {
  // Skip binary files and ignored directories
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORED_EXTENSIONS.includes(ext)) return;
  
  if (IGNORED_DIRS.some(dir => filePath.includes(`/${dir}/`))) return;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip files that are explicitly examples
    if (filePath.includes('example') && (filePath.includes('.env') || filePath.includes('firebase'))) {
      return;
    }

    // Check each pattern
    for (const pattern of PATTERNS) {
      if (pattern.test(content)) {
        console.error(`\x1b[31mPotential secret found in ${filePath} (matched pattern: ${pattern})\x1b[0m`);
      }
    }

  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
  }
}

function scanDirectory(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip ignored directories
        if (IGNORED_DIRS.includes(entry.name)) continue;
        scanDirectory(fullPath);
      } else {
        checkForSecrets(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}: ${error.message}`);
  }
}

try {
  // Scan uncommitted changed files only
  const changedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  console.log('\x1b[34mChecking staged files for potential secrets...\x1b[0m');
  
  if (changedFiles.length === 0) {
    console.log('No staged files found. Checking all files...');
    scanDirectory('.');
  } else {
    changedFiles.forEach(checkForSecrets);
  }
  
  console.log('\x1b[32mSecret check complete. Review any warnings above.\x1b[0m');
} catch (error) {
  console.error('Failed to get changed files:', error);
  console.log('Falling back to scanning all files...');
  scanDirectory('.');
}