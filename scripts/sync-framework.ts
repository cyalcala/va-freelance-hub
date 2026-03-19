import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const DEST = path.resolve(__dirname, '../../niche-directory-framework');

if (!fs.existsSync(DEST)) {
  console.error('[sync] FAILED: Target sibling directory (niche-directory-framework) not found at:', DEST);
  process.exit(1);
}

const FILES_TO_SYNC = [
  'jobs/system-audit.ts',
  'jobs/database-watchdog.ts',
  'jobs/scrape-opportunities.ts',
  'jobs/lib/scraper.ts',
  'jobs/lib/reddit.ts',
  'jobs/lib/hackernews.ts',
  'jobs/lib/jobicy.ts',
  'jobs/lib/ats.ts',
  'jobs/lib/trust.ts',
  'scripts/save.ts',
  'scripts/restore.ts',
  'ARCHITECTURE.md',
  'trigger.config.ts'
];

console.log('[sync] ═══ Initiating Cross-Repository Architecture Clone ═══');

for (const p of FILES_TO_SYNC) {
  const srcPath = path.join(SRC, p);
  const destPath = path.join(DEST, p);

  if (fs.existsSync(srcPath)) {
    // Ensure destination directory exists strictly before copying
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`[sync] System Layer Synced: ${p}`);
  } else {
    console.warn(`[sync] WARNING: Source file not found: ${p}`);
  }
}

// ── CUSTOM HEURISTIC ABSTRACTION (opportunities.astro) ──────────────
// Stripping explicit demographic parameters natively out of the generic boilerplate
const oppAstroPath = path.join(SRC, 'apps/frontend/src/pages/opportunities.astro');
if (fs.existsSync(oppAstroPath)) {
  let content = fs.readFileSync(oppAstroPath, 'utf-8');
  
  // Strip Hardcoded Strings
  content = content.replace(/const boostKw = \[.*?\];/g, 'const boostKw = ["<NICHE_SKILL_1>", "<NICHE_SKILL_2>"];');
  content = content.replace(/const inclusionKw = \[.*?\];/g, 'const inclusionKw = ["<TARGET_REGION_1>", "<TARGET_REGION_2>"];');
  content = content.replace(/if \(text\.includes\("virtual assistant"\) \|\| text\.includes\("filipino"\)\)/g, 'if (text.includes("<PRIMARY_NICHE>") || text.includes("<PRIMARY_REGION>"))');
  
  const destOppPath = path.join(DEST, 'apps/frontend/src/pages/opportunities.astro');
  fs.mkdirSync(path.dirname(destOppPath), { recursive: true });
  fs.writeFileSync(destOppPath, content);
  console.log('[sync] UI Layer Synced & Parameterized: /opportunities.astro');
}

// ── CUSTOM HEURISTIC ABSTRACTION (index.astro) ──────────────────────
// Scaling the relevancyBoost algorithm specifically away from the word 'virtual'
const indexAstroPath = path.join(SRC, 'apps/frontend/src/pages/index.astro');
if (fs.existsSync(indexAstroPath)) {
  let content = fs.readFileSync(indexAstroPath, 'utf-8');
  
  content = content.replace(/const isVirtual = n\.includes\('virtual'\);/g, "const isNicheTarget = n.includes('PRIMARY_KEYWORD');");
  content = content.replace(/if \(isVirtual\) boost \+= 1000;/g, "if (isNicheTarget) boost += 1000;");
  
  const destIndexPath = path.join(DEST, 'apps/frontend/src/pages/index.astro');
  fs.mkdirSync(path.dirname(destIndexPath), { recursive: true });
  fs.writeFileSync(destIndexPath, content);
  console.log('[sync] UI Layer Synced & Parameterized: /index.astro');
}

console.log('[sync] ═══ Synchronization Complete ═══');
