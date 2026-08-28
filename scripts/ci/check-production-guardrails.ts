import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const BUN_VERSION = "1.3.14";
export const WRANGLER_VERSION = "4.120.0";
const ROOT_D1_MIGRATION_SCRIPT = "bun run --cwd apps/web db:migrate";
const WEB_D1_MIGRATION_SCRIPT = "bunx wrangler@4.120.0 d1 migrations apply DB --remote --env production --config wrangler.jsonc";

const DIGEST_RETRY_WORKFLOWS = new Set([
  "gha-directory-pulse.yml",
  "gha-hunter-pulse.yml",
  "gha-medic-pulse.yml",
  "gha-prospector-pulse.yml",
]);

export type GuardrailResult = {
  errors: string[];
  warnings: string[];
};

function mergeResults(...results: GuardrailResult[]): GuardrailResult {
  return {
    errors: results.flatMap((result) => result.errors),
    warnings: results.flatMap((result) => result.warnings),
  };
}

export function inspectRootPackageJson(text: string): GuardrailResult {
  const errors: string[] = [];
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { errors: ["package.json: invalid JSON"], warnings: [] };
  }

  const workspaces = Array.isArray(manifest.workspaces) ? manifest.workspaces : [];
  if (workspaces.includes("apps/*")) {
    errors.push("package.json: historical apps must not be included by a broad workspace glob");
  }
  if (!workspaces.includes("apps/web")) {
    errors.push("package.json: the active Astro runtime apps/web must be an explicit workspace");
  }
  if (manifest.packageManager !== `bun@${BUN_VERSION}`) {
    errors.push(`package.json: packageManager must declare bun@${BUN_VERSION}`);
  }

  const scripts = manifest.scripts as Record<string, unknown> | undefined;
  if (scripts?.["trigger:deploy"] || scripts?.["trigger:dev"]) {
    errors.push("package.json: historical Trigger.dev commands must not remain active root scripts");
  }
  if (scripts?.["db:migrate"] !== ROOT_D1_MIGRATION_SCRIPT) {
    errors.push("package.json: db:migrate must delegate to the active Cloudflare D1 migration command");
  }
  if (scripts?.["db:generate"]) {
    errors.push("package.json: historical Turso/Drizzle generation must not remain an active root script");
  }

  return { errors, warnings: [] };
}

export function inspectLegacyPackageJson(text: string): GuardrailResult {
  const errors: string[] = [];
  try {
    const manifest = JSON.parse(text) as { scripts?: Record<string, unknown> };
    if (typeof manifest.scripts?.deploy !== "string" || !manifest.scripts.deploy.includes("LEGACY_QUARANTINE")) {
      errors.push("apps/web-nextjs-backup/package.json: deploy must stay explicitly quarantined");
    }
  } catch {
    errors.push("apps/web-nextjs-backup/package.json: invalid JSON");
  }
  return { errors, warnings: [] };
}

export function inspectDbPackageJson(text: string): GuardrailResult {
  const errors: string[] = [];
  try {
    const manifest = JSON.parse(text) as { scripts?: Record<string, unknown> };
    if (typeof manifest.scripts?.migrate !== "string" || !manifest.scripts.migrate.includes("LEGACY_QUARANTINE")) {
      errors.push("packages/db/package.json: legacy Turso migration must stay explicitly quarantined");
    }
  } catch {
    errors.push("packages/db/package.json: invalid JSON");
  }
  return { errors, warnings: [] };
}

export function inspectWebPackageJson(text: string): GuardrailResult {
  const errors: string[] = [];
  try {
    const manifest = JSON.parse(text) as { scripts?: Record<string, unknown> };
    if (manifest.scripts?.["db:migrate"] !== WEB_D1_MIGRATION_SCRIPT) {
      errors.push("apps/web/package.json: db:migrate must invoke pinned Wrangler against production config");
    }
  } catch {
    errors.push("apps/web/package.json: invalid JSON");
  }
  return { errors, warnings: [] };
}

export function inspectRobotsEnforcementPolicy(text: string): GuardrailResult {
  const errors: string[] = [];
  const path = "apps/web/src/pages/api/cron/scrape.ts";

  if (/\b(?:const|let|var)\s+ROBOTS_MODE\b\s*(?::[^=;]+)?=\s*["']enforce["']/.test(text)) {
    errors.push(`${path}: global robots enforcement is forbidden`);
  }

  const declarations = [
    ...text.matchAll(/const\s+ROBOTS_ENFORCE_SOURCE_IDS\b[^;]*;/g),
  ].map((match) => match[0].trim());
  const approvedInitializers = new Set([
    'const ROBOTS_ENFORCE_SOURCE_IDS: ReadonlySet<string> = new Set(["we-work-remotely"]);',
    "const ROBOTS_ENFORCE_SOURCE_IDS: ReadonlySet<string> = new Set([]);",
  ]);
  if (declarations.length === 0) {
    errors.push(`${path}: source-scoped robots enforce set is required`);
  } else if (declarations.length !== 1 || !approvedInitializers.has(declarations[0])) {
    errors.push(`${path}: robots enforce set must use the exact empty or WWR-only literal initializer`);
  }

  if (!text.includes("robotsModeForSourceId(source.id)")) {
    errors.push(`${path}: configured sources must use the source-scoped robots mode selector`);
  }
  if (!text.includes("robotsModeForSourceId(key)")) {
    errors.push(`${path}: ATS sources must default through the source-scoped robots mode selector`);
  }

  return { errors, warnings: [] };
}

export function inspectWorkflowText(path: string, text: string): GuardrailResult {
  const errors: string[] = [];
  let foundUnfrozenInstall = false;
  let foundMutableWrangler = false;

  try {
    Bun.YAML.parse(text);
  } catch (error) {
    errors.push(`${path}: invalid YAML (${error instanceof Error ? error.message : "unknown parse error"})`);
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const bunVersion = trimmed.match(/^bun-version:\s*["']?([^\s"'#]+)/)?.[1];
    if (bunVersion && bunVersion !== BUN_VERSION) {
      errors.push(`${path}: Bun runtime must be pinned to ${BUN_VERSION}`);
    }

    if (!foundUnfrozenInstall && /\bbun install\b/.test(trimmed) && !/\bbun install\s+--frozen-lockfile\b/.test(trimmed)) {
      errors.push(`${path}: dependency install must use bun install --frozen-lockfile`);
      foundUnfrozenInstall = true;
    }

    const wranglerCommand = trimmed.match(/\b(?:npx|bunx)\s+wrangler(?:@([^\s]+))?/);
    const wranglerVersion = wranglerCommand?.[1];
    if (!foundMutableWrangler && wranglerCommand && wranglerVersion !== WRANGLER_VERSION) {
      errors.push(`${path}: Wrangler commands must be pinned to ${WRANGLER_VERSION}`);
      foundMutableWrangler = true;
    }
  }

  if (/\bweb-nextjs-backup\b/.test(text)) {
    errors.push(`${path}: active workflows must not reference the historical runtime web-nextjs-backup`);
  }

  if (/\bpackages\/zig-parser\b/.test(text)) {
    errors.push(`${path}: active workflows must not reference the historical runtime packages/zig-parser`);
  }

  if (path === "ci-guardrail.yml" && /\bpaths-ignore\s*:/.test(text)) {
    errors.push(`${path}: validation must run for documentation-only pushes; gate only the release job`);
  }

  if (
    path === "ci-guardrail.yml"
    && (!/workers\/freshness-cron typecheck/.test(text) || !/workers\/freshness-cron deploy:dry-run/.test(text))
  ) {
    errors.push(`${path}: freshness Worker must be typechecked and dry-run in project CI`);
  }

  if (
    path === "ci-guardrail.yml"
    && !/pages deploy dist\s+--project-name remotejobs-ph\s+--branch main(\s+--config wrangler\.jsonc)?/.test(text)
  ) {
    errors.push(`${path}: Pages deployment must use the checked-in production Wrangler config`);
  }

  if (/\bd1 execute\s+remoteph-jobs-db\b/.test(text)) {
    errors.push(`${path}: D1 commands must use the checked-in DB binding and production config`);
  }

  if (
    DIGEST_RETRY_WORKFLOWS.has(path)
    && /for attempt in 1 2 3 4 5; do/.test(text)
    && (!/pushed=false/.test(text) || !/::error title=Digest push failed::/.test(text) || !/exit 1/.test(text))
  ) {
    errors.push(`${path}: digest push retries must fail the job after the final rejected push`);
  }

  if (
    path === "gha-chef-pulse.yml"
    && (!/set -o pipefail/.test(text) || !/CHEF_EXIT=\$\{PIPESTATUS\[0\]\}/.test(text) || !/exit "\$CHEF_EXIT"/.test(text))
  ) {
    errors.push(`${path}: Chef execution must propagate pipeline failure after writing evidence`);
  }

  if (
    path === "gha-sentinel-pulse.yml"
    && (!/FROM source_fetch_state/.test(text) || !/source_id = '__sweep_diag__'/.test(text))
  ) {
    errors.push(`${path}: sweep diagnostics must read the reserved source_fetch_state record`);
  }

  if (
    path === "gha-sentinel-pulse.yml"
    && /source-health-rollup:/.test(text)
    && /git push origin HEAD:main/.test(text)
    && !/source-health-rollup:\s*\n\s+if:\s*\$\{\{\s*github\.ref\s*==\s*'refs\/heads\/main'\s*\}\}/.test(text)
  ) {
    errors.push(`${path}: source-health rollup must not push non-main workflow code to main`);
  }

  if (
    path === "gha-deploy-cron-worker.yml"
    && (!/secret list --(?:format json|json)/.test(text) || !/PROXY_SECRET/.test(text))
  ) {
    errors.push(`${path}: deployment must verify PROXY_SECRET before shipping`);
  }

  if (
    path === "gha-deploy-cron-worker.yml"
    && (!/bun run typecheck/.test(text) || !/bun run deploy:dry-run/.test(text))
  ) {
    errors.push(`${path}: deployment must typecheck and dry-run the Worker`);
  }

  if (
    path === "gha-ingest-watchdog.yml"
    && (!/cron:\s*['"]17 \* \* \* \*['"]/.test(text) || !/evaluate-ingest-health\.mjs/.test(text))
  ) {
    errors.push(`${path}: heartbeat watchdog must run hourly and use the shared evaluator`);
  }

  return { errors, warnings: [] };
}

export async function auditWorkflowDirectory(workflowDirectory = join(import.meta.dir, "../../.github/workflows")): Promise<GuardrailResult> {
  const names = (await readdir(workflowDirectory))
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
  const result: GuardrailResult = { errors: [], warnings: [] };

  for (const name of names) {
    const inspected = inspectWorkflowText(name, await Bun.file(join(workflowDirectory, name)).text());
    result.errors.push(...inspected.errors);
    result.warnings.push(...inspected.warnings);
  }

  return result;
}

export async function auditProductionRepository(rootDirectory = join(import.meta.dir, "../..")): Promise<GuardrailResult> {
  const workflowResult = await auditWorkflowDirectory(join(rootDirectory, ".github/workflows"));
  const packageResult = inspectRootPackageJson(await Bun.file(join(rootDirectory, "package.json")).text());
  const legacyResult = inspectLegacyPackageJson(
    await Bun.file(join(rootDirectory, "apps/web-nextjs-backup/package.json")).text(),
  );
  const dbResult = inspectDbPackageJson(await Bun.file(join(rootDirectory, "packages/db/package.json")).text());
  const webResult = inspectWebPackageJson(await Bun.file(join(rootDirectory, "apps/web/package.json")).text());
  const robotsPolicyResult = inspectRobotsEnforcementPolicy(
    await Bun.file(join(rootDirectory, "apps/web/src/pages/api/cron/scrape.ts")).text(),
  );
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const legacyConfig of ["wrangler.toml", "wrangler.jsonc"]) {
    if (existsSync(join(rootDirectory, "apps/web-nextjs-backup", legacyConfig))) {
      errors.push(`apps/web-nextjs-backup/${legacyConfig}: auto-discoverable legacy Wrangler config is forbidden`);
    }
  }
  if (existsSync(join(rootDirectory, "packages/db/drizzle.config.ts"))) {
    errors.push("packages/db/drizzle.config.ts: auto-discoverable legacy Turso config is forbidden");
  }
  for (const artifact of ["pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    if (existsSync(join(rootDirectory, artifact))) {
      errors.push(`${artifact}: auto-discoverable legacy pnpm artifact is forbidden`);
    }
  }
  for (const [path, message] of [
    ["trigger.config.ts", "trigger.config.ts: historical Trigger.dev configuration must stay explicitly quarantined"],
    ["list_models.ts", "list_models.ts: historical Gemini SDK probe must stay explicitly quarantined"],
    ["scripts/build-worker.js", "scripts/build-worker.js: historical custom Worker bundler must stay explicitly quarantined"],
    ["scripts/gha/harvest.ts", "scripts/gha/harvest.ts: legacy Hunter prototype must stay explicitly quarantined"],
    ["packages/db/migrate.ts", "packages/db/migrate.ts: legacy Turso migration source must stay explicitly quarantined"],
    ["packages/db/push.ts", "packages/db/push.ts: legacy Turso schema push source must stay explicitly quarantined"],
    ["packages/db/seed.ts", "packages/db/seed.ts: historical directory seed must stay explicitly quarantined"],
    ["apps/web/batch4_resolve.js", "apps/web/batch4_resolve.js: historical ATS batch must stay explicitly quarantined"],
    ["apps/web/generate_seed.mjs", "apps/web/generate_seed.mjs: historical seed generator must stay explicitly quarantined"],
    ["apps/web/import_csv.mjs", "apps/web/import_csv.mjs: historical CSV import must stay explicitly quarantined"],
    ["apps/web/resolve_ats.js", "apps/web/resolve_ats.js: historical Gemini resolver must stay explicitly quarantined"],
    ["apps/web/resolve_30.js", "apps/web/resolve_30.js: historical Gemini resolver must stay explicitly quarantined"],
    ["apps/web/resolve_next_30.py", "apps/web/resolve_next_30.py: historical unrestricted resolver must stay explicitly quarantined"],
    ["apps/web/test_gemini_nogrounding.js", "apps/web/test_gemini_nogrounding.js: historical Gemini experiment must stay explicitly quarantined"],
  ] as const) {
    if (!(await Bun.file(join(rootDirectory, path)).text()).includes("LEGACY_QUARANTINE")) {
      errors.push(message);
    }
  }
  if (!existsSync(join(rootDirectory, "docs/decisions/DEP-01-dependency-exceptions.md"))) {
    errors.push("docs/decisions/DEP-01-dependency-exceptions.md: dependency exception tracker must exist");
  }
  return mergeResults(workflowResult, packageResult, legacyResult, dbResult, webResult, robotsPolicyResult, { errors, warnings });
}

if (import.meta.main) {
  const result = await auditProductionRepository();
  for (const error of result.errors) console.error(error);
  for (const warning of result.warnings) console.warn(warning);
  if (result.errors.length > 0) process.exitCode = 1;
}
