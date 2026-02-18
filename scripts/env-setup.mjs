#!/usr/bin/env node

import { copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const mode = process.argv[2];
const force = process.argv.includes('--force');

const templates = {
  development: '.env.example',
  production: '.env.production.example',
};

function printUsage() {
  console.log('Usage: node scripts/env-setup.mjs <development|production> [--force]');
}

if (!mode || !(mode in templates)) {
  printUsage();
  process.exit(1);
}

const source = path.resolve(process.cwd(), templates[mode]);
const target = path.resolve(process.cwd(), '.env');

try {
  await access(source);
} catch {
  console.error(`[env-setup] Template not found: ${templates[mode]}`);
  process.exit(1);
}

let targetExists = false;
try {
  await access(target);
  targetExists = true;
} catch {
  targetExists = false;
}

if (targetExists && !force) {
  console.error('[env-setup] .env already exists. Use --force to overwrite.');
  process.exit(1);
}

await copyFile(source, target);
console.log(`[env-setup] Copied ${templates[mode]} -> .env`);
