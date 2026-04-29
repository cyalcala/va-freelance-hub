import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

function getHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}

const SRC = path.resolve(__dirname, '..');
const DEST = path.resolve(__dirname, '../../niche-directory-framework');

if (!fs.existsSync(DEST)) {
  console.error('[sync] FAILED: Target sibling directory (niche-directory-framework) not found at:', DEST);
  process.exit(0);
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
  'packages/sifter-native/sifter.zig',
  'packages/sifter-native/index.ts',
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
    const srcHash = getHash(srcPath);
    const destHash = getHash(destPath);

    if (srcHash === destHash) {
      console.log(`[sync] Identity Confirmed (No Change): ${p}`);
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`[sync] Core Layer Synced: ${p} (MODIFIED)`);
  }
}

// ── NATIVE REBUILD ────────────────────────────────────────────────
  const sifterSrc = path.join(SRC, 'packages/sifter-native/sifter.zig');
  const sifterDest = path.join(DEST, 'packages/sifter-native/sifter.zig');
  
  if (getHash(sifterSrc) !== getHash(sifterDest)) {
    console.log('[sync] Rebuilding Native Sifter in Destination...');
    try {
      // Use absolute path to the known zig binary for consistency
      const zigPath = 'C:\\zig\\zig-windows-x86_64-0.13.0\\zig.exe';
      const buildCmd = `${zigPath} build-lib -dynamic sifter.zig -O ReleaseSafe`;
      execSync(buildCmd, { 
        cwd: path.join(DEST, 'packages/sifter-native'),
        stdio: 'inherit' 
      });
      console.log('[sync] Native Sifter Rebuilt Successfully.');
    } catch (err) {
      console.error('[sync] FAILED to rebuild native sifter in destination:', err);
    }
  } else {
    console.log('[sync] Native Sifter is up to date. Skipping rebuild.');
  }

console.log('[sync] ═══ Core Upgrade Complete ═══');
console.log('[sync] NOTE: Identity preserved in /packages/config/index.ts');
