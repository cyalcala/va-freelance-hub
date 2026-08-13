import { expect, test } from "bun:test";
import { inspectDbPackageJson, inspectLegacyPackageJson, inspectRootPackageJson, inspectWorkflowText } from "./check-production-guardrails";

test("rejects mutable runtime, install, and CLI inputs", () => {
  const result = inspectWorkflowText(
    "ci.yml",
    [
      "bun-version: latest",
      "run: bun install",
      "run: npx wrangler@4 deploy",
    ].join("\n"),
  );

  expect(result.errors).toEqual([
    "ci.yml: Bun runtime must be pinned to 1.3.14",
    "ci.yml: dependency install must use bun install --frozen-lockfile",
    "ci.yml: Wrangler commands must be pinned to 4.120.0",
  ]);
});

test("rejects an accidental legacy deploy reference", () => {
  const result = inspectWorkflowText("deploy.yml", "run: bunx wrangler@4.120.0 pages deploy web-nextjs-backup/out");
  expect(result.errors).toEqual([
    "deploy.yml: active workflows must not reference the historical runtime web-nextjs-backup",
  ]);
});

test("accepts the frozen production toolchain", () => {
  const result = inspectWorkflowText(
    "ci.yml",
    [
      "bun-version: 1.3.14",
      "run: bun install --frozen-lockfile",
      "run: npx wrangler@4.120.0 deploy",
    ].join("\n"),
  );

  expect(result.errors).toEqual([]);
});

test("rejects an unversioned bunx Wrangler command", () => {
  const result = inspectWorkflowText("deploy.yml", "run: bunx wrangler pages deploy dist");
  expect(result.errors).toEqual([
    "deploy.yml: Wrangler commands must be pinned to 4.120.0",
  ]);
});

test("rejects malformed YAML before it reaches GitHub Actions", () => {
  const result = inspectWorkflowText("broken.yml", "jobs:\n  deploy: [");
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]).toStartWith("broken.yml: invalid YAML");
});

test("keeps validation on docs-only changes and configures Pages explicitly", () => {
  const result = inspectWorkflowText(
    "ci-guardrail.yml",
    [
      "on:",
      "  push:",
      "    branches: [main]",
      "run: bun install --frozen-lockfile",
      "bun-version: 1.3.14",
      "run: bunx wrangler@4.120.0 pages deploy dist --project-name remotejobs-ph --branch main --config wrangler.jsonc",
    ].join("\n"),
  );
  expect(result.errors).toEqual([]);
});

test("rejects an active legacy workspace or Trigger deployment script", () => {
  const result = inspectRootPackageJson(JSON.stringify({
    packageManager: "bun@1.3.14",
    workspaces: ["apps/*", "packages/*"],
    scripts: {
      "trigger:deploy": "bunx trigger.dev deploy",
      "db:migrate": "bun run --cwd apps/web db:migrate",
    },
  }));
  expect(result.errors).toEqual([
    "package.json: historical apps must not be included by a broad workspace glob",
    "package.json: the active Astro runtime apps/web must be an explicit workspace",
    "package.json: historical Trigger.dev commands must not remain active root scripts",
  ]);
});

test("requires the legacy deploy command to fail closed", () => {
  expect(inspectLegacyPackageJson(JSON.stringify({ scripts: { deploy: "wrangler pages deploy" } })).errors).toEqual([
    "apps/web-nextjs-backup/package.json: deploy must stay explicitly quarantined",
  ]);
});

test("keeps production migrations on the checked-in Cloudflare D1 path", () => {
  const root = inspectRootPackageJson(JSON.stringify({
    packageManager: "bun@1.3.14",
    workspaces: ["apps/web", "packages/*"],
    scripts: {
      "db:migrate": "bun run --cwd packages/db migrate",
      "db:generate": "bun run --cwd packages/db generate",
    },
  }));
  expect(root.errors).toEqual([
    "package.json: db:migrate must delegate to the active Cloudflare D1 migration command",
    "package.json: historical Turso/Drizzle generation must not remain an active root script",
  ]);

  expect(inspectDbPackageJson(JSON.stringify({ scripts: { migrate: "bun run migrate.ts" } })).errors).toEqual([
    "packages/db/package.json: legacy Turso migration must stay explicitly quarantined",
  ]);
});

test("rejects workflow patterns that hide operational failure", () => {
  const prospector = inspectWorkflowText(
    "gha-prospector-pulse.yml",
    [
      "for attempt in 1 2 3 4 5; do",
      "  git push origin HEAD:main",
      "done",
    ].join("\n"),
  );
  expect(prospector.errors).toEqual([
    "gha-prospector-pulse.yml: digest push retries must fail the job after the final rejected push",
  ]);

  const medic = inspectWorkflowText(
    "gha-medic-pulse.yml",
    "npx wrangler@4.120.0 d1 execute remoteph-jobs-db --remote --json --command 'SELECT 1'",
  );
  expect(medic.errors).toEqual([
    "gha-medic-pulse.yml: D1 commands must use the checked-in DB binding and production config",
  ]);

  const chef = inspectWorkflowText("gha-chef-pulse.yml", "bun run scripts/gha/chef.ts 2>&1 | tee chef.log");
  expect(chef.errors).toEqual([
    "gha-chef-pulse.yml: Chef execution must propagate pipeline failure after writing evidence",
  ]);

  const sentinel = inspectWorkflowText("gha-sentinel-pulse.yml", "SELECT source_url FROM opportunities");
  expect(sentinel.errors).toEqual([
    "gha-sentinel-pulse.yml: sweep diagnostics must read the reserved source_fetch_state record",
  ]);
});
