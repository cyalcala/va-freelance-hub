import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

/**
 * Apex SRE Context Aggregator
 * Bundles the codebase into a single formatted string for AI reasoning.
 * Respects .sentinelignore and focuses on structural integrity.
 */

const ROOT_DIR = process.cwd();
const IGNORE_FILE = join(ROOT_DIR, '.sentinelignore');
const ALLOWED_EXTENSIONS = ['.ts', '.astro', '.md', '.json', '.yml', '.sql', '.zig'];

function getIgnoreList(): string[] {
  if (!existsSync(IGNORE_FILE)) return [];
  return readFileSync(IGNORE_FILE, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

const ignores = getIgnoreList();

function isIgnored(path: string): boolean {
  const relPath = relative(ROOT_DIR, path);
  return ignores.some(ignore => {
    if (ignore.startsWith('!')) return false; // Basic negation support
    return relPath.includes(ignore) || relPath.startsWith(ignore);
  });
}

function aggregateFiles(dir: string, filesList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    if (isIgnored(fullPath)) continue;

    if (statSync(fullPath).isDirectory()) {
      aggregateFiles(fullPath, filesList);
    } else if (ALLOWED_EXTENSIONS.includes(extname(file))) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

export async function bundleContext(): Promise<string> {
  const files = aggregateFiles(ROOT_DIR);
  let bundle = `--- APEX SRE CONTEXT SNAPSHOT ---
Generated: ${new Date().toISOString()}
Root: ${ROOT_DIR}

`;

  // 1. Add Architectural Context first
  const priorityDocs = ['ARCHITECTURE.md', 'docs/SESSION_INIT.md', 'CHANGELOG.md'];
  for (const doc of priorityDocs) {
    const docPath = join(ROOT_DIR, doc);
    if (existsSync(docPath)) {
      bundle += `\n[FILE: ${doc}]\n${readFileSync(docPath, 'utf8')}\n---`;
    }
  }

  // 2. Add Codebase
  for (const file of files) {
    const relPath = relative(ROOT_DIR, file);
    if (priorityDocs.includes(relPath)) continue;

    try {
      const content = readFileSync(file, 'utf8');
      bundle += `\n[FILE: ${relPath}]\n${content}\n---`;
    } catch (e) {
      // Skip binaries or unreadable files
    }
  }

  return bundle;
}

// CLI Execution Support
if (process.argv.includes('--print')) {
  bundleContext().then(console.log);
}
