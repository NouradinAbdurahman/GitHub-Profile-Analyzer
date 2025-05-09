#!/usr/bin/env node
// Generate a secure random string for use as SESSION_SECRET

const crypto = require('crypto');

// Generate a secure random string of 64 characters
const sessionSecret = crypto.randomBytes(32).toString('hex');

console.log('\n=== SECURE SESSION SECRET ===');
console.log(sessionSecret);
console.log('\nCopy this value for your SESSION_SECRET environment variable.');
console.log('Add it to your .env.local file and to your Vercel deployment settings.\n');
