import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC = path.resolve(__dirname, '..');
const DEST = path.resolve(__dirname, '../../niche-directory-framework');

if (!fs.existsSync(DEST)) {
  console.error('[sync] FAILED: Target sibling directory (niche-directory-framework) not found at:', DEST);
  process.exit(1);
}

// 🛡️ PROTECTED FILES: These define the "Niche Identity" and should NEVER be overwritten.
const PROTECTED_FILES = [
  'packages/config/index.ts',
  'apps/web/.env',
  'apps/frontend/.env',
  '.env'
];

// 🚀 CORE INFRASTRUCTURE: These are the "Titanium" parts to mirror.
const FILES_TO_SYNC = [
  'packages/db/client.ts',
  'packages/db/schema.ts',
  'jobs/system-audit.ts',
  'jobs/database-watchdog.ts',
  'jobs/resilience-watchdog.ts',
  'jobs/scrape-opportunities.ts',
  'jobs/lib/scraper.ts',
  'jobs/lib/sifter.ts',
  'jobs/lib/reddit.ts',
  'jobs/lib/hackernews.ts',
  'jobs/lib/jobicy.ts',
  'jobs/lib/ats.ts',
  'jobs/lib/trust.ts',
  'scripts/save.ts',
  'scripts/restore.ts',
  'scripts/resurrect.ts',
  'scripts/automation-audit.ts',
  'ARCHITECTURE.md',
  'HEALTH_CHECK.md',
  'trigger.config.ts',
  'package.json',
  'tsconfig.json'
];

console.log('[sync] ═══ Initiating Titanium Core Upgrade ═══');

for (const p of FILES_TO_SYNC) {
  const srcPath = path.join(SRC, p);
  const destPath = path.join(DEST, p);

  if (PROTECTED_FILES.includes(p)) {
    if (fs.existsSync(destPath)) {
      console.log(`[sync] Skipping Protected Identity: ${p}`);
      continue;
    }
  }

  if (fs.existsSync(srcPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`[sync] Core Layer Synced: ${p}`);
  }
}

console.log('[sync] ═══ Core Upgrade Complete ═══');
console.log('[sync] NOTE: Identity preserved in /packages/config/index.ts');
