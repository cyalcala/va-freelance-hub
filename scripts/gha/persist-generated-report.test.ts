import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = join(import.meta.dir, "persist-generated-report.sh");
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : Bun.which("bash")!;
const git = process.platform === "win32" ? "C:/Program Files/Git/cmd/git.exe" : Bun.which("git")!;
const shellPath = (value: string) => value.replaceAll("\\", "/").replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
const owners = ["directory", "enrichment", "hunter", "medic", "prospector", "sentinel", "workable", "economics"];
const files: Record<string, string> = {
  directory: "docs/directory-health-latest.md", enrichment: "docs/enrichment-latest.md",
  hunter: "docs/source-health-latest.md", sentinel: "docs/source-health-latest.md",
  medic: "docs/health-digest-latest.md", prospector: "docs/prospector-latest.md",
  workable: "docs/workable-candidates-latest.md", economics: "docs/source-economics-latest.md",
};

function fixture(key = "directory") {
  const dir = mkdtempSync(join(tmpdir(), "report-persistence-"));
  const workspace = join(dir, "workspace");
  const canonical = join(dir, "canonical.git");
  const mirror = join(dir, "mirror.git");
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(dir, "empty-git-config"), GIT_TERMINAL_PROMPT: "0" };
  writeFileSync(env.GIT_CONFIG_GLOBAL, "");
  const gitRun = (cwd: string, ...args: string[]) => {
    const result = Bun.spawnSync([git, "-C", cwd, ...args], { env, stdout: "pipe", stderr: "pipe" });
    if (result.exitCode) throw new Error(result.stderr.toString());
    return result.stdout.toString().trim();
  };
  mkdirSync(workspace);
  gitRun(workspace, "init", "-q", "-b", "main");
  gitRun(workspace, "config", "user.name", "fixture");
  gitRun(workspace, "config", "user.email", "fixture@example.invalid");
  gitRun(workspace, "config", "core.autocrlf", "false");
  const write = (path: string, text: string) => { mkdirSync(resolve(workspace, path, ".."), { recursive: true }); writeFileSync(join(workspace, path), text); };
  for (const path of new Set(Object.values(files))) write(path, "original report\n");
  write("docs/economics-snapshots/latest.json", '{"old":true}\n');
  write("docs/economics-snapshots/snapshots/old.json", '{"old":true}\n');
  write("runtime.ts", "unchanged runtime\n");
  gitRun(workspace, "add", ".");
  gitRun(workspace, "commit", "-qm", "initial");
  const base = gitRun(workspace, "rev-parse", "HEAD");
  gitRun(dir, "clone", "--bare", "-q", workspace, canonical);
  gitRun(dir, "clone", "--bare", "-q", workspace, mirror);
  const commands = join(dir, "commands.log");
  const summary = join(dir, "summary.md");
  const wrapper = join(dir, "run.sh");
  // Run the checked-in script against real isolated bare repositories. The
  // wrapper maps the two exact production URLs to local fixtures and rejects
  // every other network URL. No real credentials or external write can occur.
  writeFileSync(wrapper, `
git() {
  local args=("$@") service='' verb='' arg i
  for ((i=0; i<\${#args[@]}; i++)); do
    arg="\${args[$i]}"
    case "$arg" in
      https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub.git) args[$i]="$SSM_BARE"; service=canonical ;;
      https://github.com/cyalcala/va-freelance-hub.git) args[$i]="$GH_BARE"; service=mirror ;;
      https://*|http://*|ssh://*) echo 'unexpected external URL' >&2; return 99 ;;
      fetch|push|ls-remote) verb="$arg" ;;
    esac
  done
  if [[ -n "$service" ]]; then
    printf '%s %s\\n' "$service" "$verb" >> "$COMMAND_LOG"
    if [[ "$verb" == push ]]; then
      [[ "$*" != *--force* && "$*" != *--mirror* && "$*" != *--delete* ]] || return 98
      if [[ "$service" == canonical && "$FAIL_STAGE" == canonical ]]; then return 31; fi
      if [[ "$service" == mirror && "$FAIL_STAGE" == mirror ]]; then return 32; fi
      if [[ "$service" == canonical && -n "$RACE_SHA" && ! -e "$RACE_MARKER" ]]; then
        "$REAL_GIT" --git-dir="$SSM_BARE" update-ref refs/heads/main "$RACE_SHA" || return
        : > "$RACE_MARKER"
      fi
      if [[ "$service" == canonical && "$FAIL_STAGE" == readback ]]; then return 0; fi
    fi
  fi
  "$REAL_GIT" "\${args[@]}"
}
source "$REPORT_SCRIPT"
`);
  const run = (extra: Record<string, string> = {}) => {
    const result = Bun.spawnSync([bash, "--noprofile", "--norc", shellPath(wrapper)], {
      env: { ...env, REAL_GIT: git.replaceAll("\\", "/"), REPORT_SCRIPT: shellPath(script),
        GITHUB_WORKSPACE: shellPath(workspace), RUNNER_TEMP: shellPath(dir),
        GITHUB_REPOSITORY: "cyalcala/va-freelance-hub", GITHUB_REF: "refs/heads/main", REPORT_KEY: key,
        GH_REPORT_TOKEN: "SYNTHETIC-TOKEN-DO-NOT-PRINT", GITHUB_STEP_SUMMARY: shellPath(summary),
        SSM_BARE: shellPath(canonical), GH_BARE: shellPath(mirror), COMMAND_LOG: shellPath(commands),
        FAIL_STAGE: "", RACE_SHA: "", RACE_MARKER: shellPath(join(dir, "raced")), ...extra },
      stdout: "pipe", stderr: "pipe", timeout: 90_000,
    });
    return { exitCode: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
  };
  const head = (repo: string) => gitRun(repo, "rev-parse", "refs/heads/main");
  const advance = (repo: string, path: string, content: string, publish = true) => {
    const other = join(dir, `other-${Math.random().toString(36).slice(2)}`);
    gitRun(dir, "clone", "-q", repo, other);
    gitRun(other, "config", "user.name", "concurrent fixture");
    gitRun(other, "config", "user.email", "fixture@example.invalid");
    mkdirSync(resolve(other, path, ".."), { recursive: true });
    writeFileSync(join(other, path), content);
    gitRun(other, "add", "--", path);
    gitRun(other, "commit", "-qm", "concurrent preserved commit");
    const sha = gitRun(other, "rev-parse", "HEAD");
    // Export the object for a simulated receive-pack race without advancing it.
    gitRun(other, "push", "-q", repo, `${sha}:${publish ? "refs/heads/main" : "refs/heads/fixture-race"}`);
    return sha;
  };
  return { dir, workspace, canonical, mirror, base, write, run, head, advance, gitRun,
    commands: () => existsSync(commands) ? readFileSync(commands, "utf8").trim().split(/\r?\n/) : [],
    summary: () => existsSync(summary) ? readFileSync(summary, "utf8") : "",
    dispose: () => { const target = resolve(dir); if (!target.startsWith(resolve(tmpdir()) + sep) || !target.split(sep).at(-1)?.startsWith("report-persistence-")) throw new Error("unsafe fixture cleanup"); rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); },
  };
}

test("all eight actual YAML writers use the shared main-only action and preserve generation/triggers", () => {
  for (const owner of owners) {
    const name = owner === "economics" ? "gha-source-economics.yml" : `gha-${owner}-pulse.yml`;
    const workflow = Bun.YAML.parse(readFileSync(join(root, ".github/workflows", name), "utf8")) as any;
    const steps = Object.values(workflow.jobs).flatMap((job: any) => job.steps ?? []);
    const persistence = steps.filter((step: any) => step.uses === "./.github/actions/persist-generated-report");
    expect(persistence).toHaveLength(1);
    expect(persistence[0].with).toEqual({ "report-key": owner, "gcp-credentials-json": "${{ secrets.GCP_SA_KEY }}" });
    expect(persistence[0].if).toBe("${{ github.ref == 'refs/heads/main' }}");
    expect(steps.filter((step: any) => /git (?:push origin HEAD:main|pull --(?:rebase|ff-only) origin main)/.test(step.run ?? ""))).toHaveLength(0);
    expect(workflow.on.workflow_dispatch).toBeDefined();
  }
  const action = Bun.YAML.parse(readFileSync(join(root, ".github/actions/persist-generated-report/action.yml"), "utf8")) as any;
  expect(action.runs.using).toBe("composite");
  expect(action.runs.steps[0].with).toEqual({ credentials_json: "${{ inputs.gcp-credentials-json }}", project_id: "antigravity-494415", create_credentials_file: true, cleanup_credentials: true });
  expect(action.runs.steps.at(-1).if).toBe("${{ always() }}");
  expect(JSON.stringify(action)).not.toMatch(/add-iam|set-iam|print-access-token|upload-artifact|secrets (?:create|versions)/);
});

test("actual shell persists only the report, SSM before GitHub, with verified SHA and intact caller state", () => {
  const f = fixture();
  try {
    f.write(files.directory, "new report\n");
    f.write("runtime.ts", "unrelated dirty runtime\n");
    f.write("gha-creds-synthetic.json", "SYNTHETIC-KEY-DO-NOT-COMMIT");
    f.gitRun(f.workspace, "add", "runtime.ts");
    const before = f.gitRun(f.workspace, "status", "--porcelain");
    const result = f.run();
    expect(result.output).not.toContain("SYNTHETIC-TOKEN");
    if (result.exitCode !== 0) throw new Error(result.output);
    expect(result.exitCode).toBe(0);
    const saved = f.head(f.canonical);
    expect(f.head(f.mirror)).toBe(saved);
    expect(saved).not.toBe(f.base);
    expect(f.gitRun(f.canonical, "diff-tree", "--no-commit-id", "--name-only", "-r", saved)).toBe(files.directory);
    expect(f.gitRun(f.workspace, "status", "--porcelain")).toBe(before);
    expect(f.gitRun(f.workspace, "rev-parse", "HEAD")).toBe(f.base);
    expect(f.commands().indexOf("canonical push")).toBeLessThan(f.commands().indexOf("mirror push"));
    expect(f.summary()).toContain(saved);
    expect(f.summary()).toContain("GitLab: pending");
    expect(result.output + f.summary()).not.toContain("SYNTHETIC-TOKEN");
    expect(result.output + f.summary()).not.toContain("SYNTHETIC-KEY");
  } finally { f.dispose(); }
}, 120_000);

for (const stage of ["canonical", "readback", "mirror"]) test(`actual shell fails visibly on ${stage} failure and preserves canonical history`, () => {
  const f = fixture();
  try {
    f.write(files.directory, "new report\n");
    const result = f.run({ FAIL_STAGE: stage });
    expect(result.exitCode).not.toBe(0);
    expect(f.head(f.mirror)).toBe(f.base);
    expect(f.summary()).toBe("");
    if (stage === "mirror") {
      const retained = f.head(f.canonical);
      expect(retained).not.toBe(f.base);
      expect(result.output).toContain(retained);
      // Reset only the synthetic generated file, leaving the caller checkout
      // unchanged: a no-change invocation must repair the failed mirror.
      f.write(files.directory, "original report\n");
      expect(f.run().exitCode).toBe(0);
      expect(f.head(f.canonical)).toBe(retained);
      expect(f.head(f.mirror)).toBe(retained);
      expect(f.summary()).toContain("changes: `false`");
    } else {
      expect(f.head(f.canonical)).toBe(f.base);
      expect(f.commands()).not.toContain("mirror push");
    }
  } finally { f.dispose(); }
}, 120_000);

test("no-change invocation still catches up a canonical-ahead GitHub mirror", () => {
  const f = fixture();
  try {
    const saved = f.advance(f.canonical, "docs/other.md", "canonical evidence\n");
    expect(f.run().exitCode).toBe(0);
    expect(f.head(f.canonical)).toBe(saved);
    expect(f.head(f.mirror)).toBe(saved);
  } finally { f.dispose(); }
}, 120_000);

test("canonical race replays the single report commit and preserves the concurrent commit", () => {
  const f = fixture();
  try {
    f.write(files.directory, "new report\n");
    const raced = f.advance(f.canonical, "docs/other.md", "concurrent evidence\n", false);
    const result = f.run({ RACE_SHA: raced });
    expect(result.output).not.toContain("SYNTHETIC-TOKEN");
    if (result.exitCode !== 0) throw new Error(result.output);
    expect(result.exitCode).toBe(0);
    const saved = f.head(f.canonical);
    expect(f.gitRun(f.canonical, "rev-parse", `${saved}^`)).toBe(raced);
    expect(f.gitRun(f.canonical, "show", `${saved}:docs/other.md`)).toBe("concurrent evidence");
    expect(f.head(f.mirror)).toBe(saved);
    expect(f.commands().filter((x) => x === "canonical push")).toHaveLength(2);
  } finally { f.dispose(); }
}, 120_000);

test("same-report concurrency conflicts fail without overwriting either history", () => {
  const f = fixture();
  try {
    f.write(files.directory, "our report\n");
    const prior = f.advance(f.canonical, files.directory, "their report\n");
    expect(f.run().exitCode).not.toBe(0);
    expect(f.head(f.canonical)).toBe(prior);
    expect(f.head(f.mirror)).toBe(f.base);
    expect(f.commands().filter((x) => x.endsWith(" push"))).toEqual([]);
  } finally { f.dispose(); }
}, 120_000);

test("GitHub-ahead and diverged histories fail without discarding mirror-only commits", () => {
  const f = fixture();
  try {
    const mirrorOnly = f.advance(f.mirror, "docs/mirror.md", "preserve this\n");
    f.write(files.directory, "new report\n");
    expect(f.run().exitCode).not.toBe(0);
    const canonicalOnly = f.advance(f.canonical, "docs/canonical.md", "canonical\n");
    expect(f.run().exitCode).not.toBe(0);
    expect(f.head(f.canonical)).toBe(canonicalOnly);
    expect(f.head(f.mirror)).toBe(mirrorOnly);
    expect(f.commands().filter((x) => x.endsWith(" push"))).toEqual([]);
  } finally { f.dispose(); }
}, 120_000);

test("economics snapshot additions and retention deletions remain in the one owned commit", () => {
  const f = fixture("economics");
  try {
    f.write(files.economics, "economics report\n");
    f.write("docs/economics-snapshots/latest.json", '{"new":true}\n');
    f.write("docs/economics-snapshots/snapshots/new.json", '{"new":true}\n');
    rmSync(join(f.workspace, "docs/economics-snapshots/snapshots/old.json"));
    expect(f.run().exitCode).toBe(0);
    const saved = f.head(f.canonical);
    expect(f.gitRun(f.canonical, "diff-tree", "--no-commit-id", "--name-only", "-r", saved).split(/\r?\n/)).toEqual([
      "docs/economics-snapshots/latest.json", "docs/economics-snapshots/snapshots/new.json",
      "docs/economics-snapshots/snapshots/old.json", files.economics,
    ]);
  } finally { f.dispose(); }
}, 120_000);

for (const extra of [{ REPORT_KEY: "../../runtime.ts" }, { GITHUB_REF: "refs/heads/codex/unreleased" }, { GITHUB_REPOSITORY: "fork/example" }]) test(`actual shell rejects unapproved target ${JSON.stringify(extra)}`, () => {
  const f = fixture();
  try {
    expect(f.run(extra).exitCode).not.toBe(0);
    expect(f.commands()).toEqual([]);
    expect(f.head(f.canonical)).toBe(f.base);
    expect(f.head(f.mirror)).toBe(f.base);
  } finally { f.dispose(); }
}, 120_000);

test("actual release classifier excludes exact operational inputs while retaining runtime deployment", () => {
  const workflow = Bun.YAML.parse(readFileSync(join(root, ".github/workflows/ci-guardrail.yml"), "utf8")) as any;
  const classifier = workflow.jobs.changes.steps.find((step: any) => step.id === "scope").run;
  const pattern = classifier.match(/grep -qvE '([^']+)'/)?.[1];
  expect(pattern).toBeDefined();
  const ignored = new RegExp(pattern!);
  for (const path of [".github/actions/persist-generated-report/action.yml", "scripts/gha/persist-generated-report.sh", "scripts/gha/persist-generated-report.test.ts", "scripts/gha/harvest.ts", "docs/directory-health-latest.md", "astra777.txt", "scripts/diagnostics/source-economics.ts"]) expect(ignored.test(path)).toBe(true);
  for (const path of ["apps/web/src/pages/api/cron/scrape.ts", "migrations/0055.sql", ".github/actions/some-deployer/action.yml", "scripts/gha/persist-generated-report.sh.extra", "scripts/gha/chef.ts", "scripts/gha/harvest.ts.extra", "notes.txt", "astra777.txt.backup", "other/astra777.txt", "apps/web/public/astra777.txt", "scripts/diagnostics/economics-snapshot.ts", "scripts/diagnostics/source-economics.ts.extra", "scripts/diagnostics/source-economics-helper.ts"]) expect(ignored.test(path)).toBe(false);
});

test("execute the actual release classifier for CI-only and mixed runtime changes", () => {
  const dir = mkdtempSync(join(tmpdir(), "report-classifier-"));
  try {
    const workflow = Bun.YAML.parse(readFileSync(join(root, ".github/workflows/ci-guardrail.yml"), "utf8")) as any;
    const classifier = workflow.jobs.changes.steps.find((step: any) => step.id === "scope").run;
    writeFileSync(join(dir, "classifier.sh"), classifier);
    writeFileSync(join(dir, "run.sh"), `
git() {
  case "$1" in
    cat-file) return 0 ;;
    diff) printf '%s\\n' "$CHANGED" ;;
    *) return 99 ;;
  esac
}
source "$CLASSIFIER"
`);
    let caseIndex = 0;
    for (const [paths, expected] of [
      [".github/actions/persist-generated-report/action.yml\nscripts/gha/persist-generated-report.sh\nscripts/gha/harvest.ts", "false"],
      [".github/actions/persist-generated-report/action.yml\napps/web/src/pages/api/cron/scrape.ts", "true"],
      ["scripts/gha/harvest.ts\nscripts/gha/chef.ts", "true"],
      ["astra777.txt", "false"],
      ["scripts/diagnostics/source-economics.ts", "false"],
      ["astra777.txt\nscripts/diagnostics/source-economics.ts\nscripts/diagnostics/source-economics.test.ts\ndocs/SYSTEM_SAVEPOINT.md", "false"],
      ["astra777.txt\napps/web/src/pages/api/cron/scrape.ts", "true"],
      ["scripts/diagnostics/source-economics.ts\nscripts/diagnostics/economics-snapshot.ts", "true"],
      ["astra777.txt\nnotes.txt", "true"],
    ]) {
      const output = join(dir, `result-${caseIndex++}`);
      const result = Bun.spawnSync([bash, "--noprofile", "--norc", shellPath(join(dir, "run.sh"))], {
        env: { ...process.env, CLASSIFIER: shellPath(join(dir, "classifier.sh")),
          BEFORE: "1111111111111111111111111111111111111111", CURRENT: "2222222222222222222222222222222222222222",
          CHANGED: paths!, GITHUB_OUTPUT: shellPath(output) }, stdout: "pipe", stderr: "pipe", timeout: 60_000,
      });
      expect(result.exitCode).toBe(0);
      expect(readFileSync(output, "utf8").trim()).toBe(`deployable=${expected}`);
    }
  } finally {
    const target = resolve(dir);
    if (!target.startsWith(resolve(tmpdir()) + sep) || !target.split(sep).at(-1)?.startsWith("report-classifier-")) throw new Error("unsafe classifier cleanup");
    rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}, 120_000);

test("actual composite cleanup removes only its generated credential file", () => {
  const dir = mkdtempSync(join(tmpdir(), "report-credentials-"));
  try {
    const action = Bun.YAML.parse(readFileSync(join(root, ".github/actions/persist-generated-report/action.yml"), "utf8")) as any;
    const cleanup = action.runs.steps.at(-1).run;
    writeFileSync(join(dir, "cleanup.sh"), cleanup);
    const auth = join(dir, "gha-creds-fixture.json");
    const unrelated = join(dir, "unrelated.json");
    const secret = "SYNTHETIC-CREDENTIAL-DO-NOT-PRINT";
    writeFileSync(auth, secret);
    writeFileSync(unrelated, secret);
    const run = (path: string) => Bun.spawnSync([bash, "--noprofile", "--norc", shellPath(join(dir, "cleanup.sh"))], {
      env: { ...process.env, AUTH_FILE: shellPath(path), GITHUB_WORKSPACE: shellPath(dir) }, stdout: "pipe", stderr: "pipe", timeout: 60_000,
    });
    const removed = run(auth);
    expect(removed.exitCode).toBe(0);
    expect(existsSync(auth)).toBe(false);
    const rejected = run(unrelated);
    expect(rejected.exitCode).not.toBe(0);
    expect(existsSync(unrelated)).toBe(true);
    expect(removed.stdout.toString() + removed.stderr.toString() + rejected.stdout.toString() + rejected.stderr.toString()).not.toContain(secret);
  } finally {
    const target = resolve(dir);
    if (!target.startsWith(resolve(tmpdir()) + sep) || !target.split(sep).at(-1)?.startsWith("report-credentials-")) throw new Error("unsafe credential cleanup");
    rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}, 120_000);
