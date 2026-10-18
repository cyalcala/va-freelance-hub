import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const workflowText = readFileSync(resolve(import.meta.dir, "../../.github/workflows/sync-secrets-to-gcp.yml"), "utf8");
const workflow = Bun.YAML.parse(workflowText) as any;
const verify = workflow.jobs["verify-ssm"];
const probe = verify.steps.find((step: any) => step.name === "Probe canonical SSM read and dry-run push");
const cleanup = verify.steps.find((step: any) => step.name === "Remove ephemeral auth file");
const canonical = "https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub.git";
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : Bun.which("bash");
const shellPath = (value: string) => value.replaceAll("\\", "/").replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);

// These job conditions use only exact string equality and boolean operators,
// which have the same behavior here and in GitHub's expression evaluator.
function selectedJobs(eventName: string, operation = "") {
  return Object.entries(workflow.jobs).filter(([, job]: any) => {
    const expression = job.if.match(/^\$\{\{\s*([\s\S]+?)\s*\}\}$/)?.[1];
    if (!expression || !/^[\w.\s'()=!&|\-]+$/.test(expression)) throw new Error("Unsupported job condition");
    return new Function("github", "inputs", `return (${expression});`)({ event_name: eventName }, { operation });
  }).map(([name]) => name);
}

test("manual operation selection keeps legacy/default secret sync exclusive from SSM verification", () => {
  expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
  const input = workflow.on.workflow_dispatch.inputs.operation;
  expect(input).toEqual({
    description: "Operation to perform (verify-ssm never synchronizes secrets or writes refs)",
    type: "choice", required: true, default: "sync-secrets", options: ["sync-secrets", "verify-ssm"],
  });
  for (const [operation, expected] of [
    ["", ["sync-secrets"]], [input.default, ["sync-secrets"]],
    ["verify-ssm", ["verify-ssm"]], ["unknown", []],
  ] as const) {
    expect(selectedJobs("workflow_dispatch", operation)).toEqual([...expected]);
    for (const event of ["push", "schedule", "pull_request", "workflow_call"]) {
      expect(selectedJobs(event, operation)).toEqual([]);
    }
  }
});

test("verification confines the existing GCP key to an ephemeral manual read/dry-run job", () => {
  expect(workflow.permissions).toEqual({ contents: "read" });
  expect(verify["runs-on"]).toBe("ubuntu-latest");
  expect(verify["timeout-minutes"]).toBe(5);
  const checkoutIndex = verify.steps.findIndex((step: any) => step.uses === "actions/checkout@v4");
  const authIndex = verify.steps.findIndex((step: any) => step.uses === "google-github-actions/auth@v2");
  const setupIndex = verify.steps.findIndex((step: any) => step.uses === "google-github-actions/setup-gcloud@v2");
  expect(checkoutIndex).toBeLessThan(authIndex);
  expect(authIndex).toBeLessThan(setupIndex);
  expect(verify.steps[checkoutIndex].with["persist-credentials"]).toBe(false);
  expect(verify.steps[authIndex].with).toEqual({
    credentials_json: "${{ secrets.GCP_SA_KEY }}", project_id: "antigravity-494415",
    create_credentials_file: true, cleanup_credentials: true,
  });
  expect(verify.steps[setupIndex].with.version).toBe(">= 395.0.0");
  expect(probe.env).toEqual({ CANONICAL_SSM_URL: canonical, GIT_TERMINAL_PROMPT: "0", CLOUDSDK_CORE_DISABLE_PROMPTS: "1" });
  expect(cleanup.if).toBe("${{ always() }}");
  expect(cleanup.env.AUTH_FILE).toBe("${{ steps.auth.outputs.credentials_file_path }}");
  const jobText = JSON.stringify(verify);
  expect(jobText.match(/secrets\.[A-Z_]+/g)).toEqual(["secrets.GCP_SA_KEY"]);
  expect(jobText).not.toMatch(/upload-artifact|upload-cloud-storage|add-iam|set-iam|secrets (?:create|versions)|print-access-token|GITHUB_ENV|GITHUB_OUTPUT|--global/);
});

function fixture(extraEnv: Record<string, string> = {}) {
  if (!bash || !existsSync(bash)) throw new Error("The SSM workflow fixture requires installed Bash");
  const workspace = mkdtempSync(join(tmpdir(), "ssm-capability-"));
  const commandLog = join(workspace, "commands.log");
  const summaryPath = join(workspace, "summary.md");
  // Shell functions replace both CLIs. No test can fall through to a real Git
  // or GCP command, and any unsupported subcommand fails the checked-in step.
  const stubs = `
gcloud() {
  printf 'gcloud %s\\n' "$*" >> "$COMMAND_LOG"
  [[ "$*" == 'auth list --filter=status:ACTIVE --format=value(account)' ]] || return 90
  [[ "$FAIL_STAGE" != 'gcloud' ]] || return 21
  printf '%s\\n' 'fixture-service-account@example.invalid'
}
git() {
  printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
  [[ "$1" == '-c' && "$2" == 'credential.helper=' ]] || return 91
  shift 2
  [[ "$1" == '-c' && "$2" == 'credential.https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev.helper=gcloud.sh' ]] || return 92
  shift 2
  while [[ "$#" -gt 0 && "$1" == '-c' ]]; do shift 2; done
  case "$1" in
    ls-remote)
      [[ "$*" == "ls-remote --heads --tags $CANONICAL_SSM_URL" ]] || return 93
      [[ "$FAIL_STAGE" != 'read' ]] || return 22
      printf '%s\\t%s\\n' '1111111111111111111111111111111111111111' 'refs/heads/main'
      ;;
    push)
      # Fail before simulating a push unless ALL arguments are exactly the
      # expected dry-run command, fixed canonical URL, and diagnostic ref.
      [[ "$*" == "push --dry-run --porcelain --no-follow-tags $CANONICAL_SSM_URL HEAD:refs/heads/codex/diagnostics/ssm-capability-900001-2" ]] || return 94
      [[ "$FAIL_STAGE" != 'push' ]] || return 23
      printf '%s\\n' '* HEAD:refs/heads/codex/diagnostics/ssm-capability-900001-2 [new branch]'
      ;;
    *) return 95 ;;
  esac
}
`;
  const run = (script: string, env: Record<string, string> = {}) => {
    const scriptPath = join(workspace, "step.sh");
    writeFileSync(scriptPath, stubs + script);
    const child = Bun.spawnSync([bash, "--noprofile", "--norc", "-e", "-o", "pipefail", shellPath(scriptPath)], {
      cwd: workspace,
      env: {
        PATH: process.env.PATH ?? process.env.Path ?? "", SystemRoot: process.env.SystemRoot ?? "C:/Windows",
        TEMP: workspace, TMP: workspace, GITHUB_WORKSPACE: shellPath(workspace),
        COMMAND_LOG: shellPath(commandLog), GITHUB_STEP_SUMMARY: shellPath(summaryPath),
        GITHUB_RUN_ID: "900001", GITHUB_RUN_ATTEMPT: "2", FAIL_STAGE: "", ...probe.env, ...extraEnv, ...env,
      },
      stdout: "pipe", stderr: "pipe",
    });
    return { exitCode: child.exitCode, stdout: child.stdout.toString(), stderr: child.stderr.toString() };
  };
  const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : "";
  return {
    workspace, run,
    commands: () => read(commandLog).trim().split(/\r?\n/).filter(Boolean),
    summary: () => read(summaryPath),
    dispose: () => {
      const target = resolve(workspace);
      if (!target.startsWith(resolve(tmpdir()) + sep) || !target.split(sep).at(-1)?.startsWith("ssm-capability-")) {
        throw new Error("Refusing fixture cleanup outside its temporary directory");
      }
      rmSync(target, { recursive: true, force: true });
    },
  };
}

test("actual probe script lists refs then makes exactly one dry-run diagnostic push", () => {
  const subject = fixture();
  try {
    const result = subject.run(probe.run);
    expect(result.exitCode).toBe(0);
    const commands = subject.commands();
    expect(commands).toHaveLength(3);
    expect(commands[0]).toStartWith("gcloud auth list ");
    expect(commands[1]).toContain(` ls-remote --heads --tags ${canonical}`);
    expect(commands[2]).toContain(` push --dry-run --porcelain --no-follow-tags ${canonical} HEAD:refs/heads/codex/diagnostics/ssm-capability-900001-2`);
    expect(commands.filter((command) => command.includes(" push ")).every((command) => command.includes(" push --dry-run --porcelain "))).toBe(true);
    expect(subject.summary()).toContain("no ref written");
    expect(subject.summary()).toContain("not persisted-write, protected-branch, or mirror-continuity proof");
  } finally { subject.dispose(); }
});

for (const [stage, exitCode, commandCount] of [["gcloud", 21, 1], ["read", 22, 2], ["push", 23, 3]] as const) {
  test(`actual probe stops on ${stage} failure without a success claim or later command`, () => {
    const subject = fixture({ FAIL_STAGE: stage });
    try {
      const result = subject.run(probe.run);
      expect(result.exitCode).toBe(exitCode);
      expect(subject.commands()).toHaveLength(commandCount);
      expect(subject.summary()).toBe("");
      const pushes = subject.commands().filter((command) => command.includes(" push "));
      expect(pushes).toHaveLength(stage === "push" ? 1 : 0);
      expect(pushes.every((command) => command.includes(" push --dry-run --porcelain "))).toBe(true);
    } finally { subject.dispose(); }
  });
}

for (const extraEnv of [{ GITHUB_RUN_ID: "" }, { GITHUB_RUN_ATTEMPT: "" }, { GITHUB_RUN_ID: "1; git push origin main" }]) {
  test(`actual probe refuses invalid diagnostic identity ${JSON.stringify(extraEnv)}`, () => {
    const subject = fixture(extraEnv);
    try {
      expect(subject.run(probe.run).exitCode).toBe(1);
      expect(subject.commands()).toEqual([]);
      expect(subject.summary()).toBe("");
    } finally { subject.dispose(); }
  });
}

test("actual always-run cleanup removes only the generated auth file after a failed probe", () => {
  const subject = fixture({ FAIL_STAGE: "read" });
  try {
    const authFile = join(subject.workspace, "gha-creds-fixture.json");
    const unrelatedFile = join(subject.workspace, "other.json");
    const credential = "SYNTHETIC-CREDENTIAL-MUST-NOT-APPEAR";
    writeFileSync(authFile, credential);
    writeFileSync(unrelatedFile, credential);
    const failedProbe = subject.run(probe.run);
    expect(failedProbe.exitCode).toBe(22);
    const result = subject.run(cleanup.run, { AUTH_FILE: shellPath(authFile) });
    expect(result.exitCode).toBe(0);
    expect(existsSync(authFile)).toBe(false);
    const rejected = subject.run(cleanup.run, { AUTH_FILE: shellPath(unrelatedFile) });
    expect(rejected.exitCode).toBe(1);
    expect(existsSync(unrelatedFile)).toBe(true);
    expect(subject.run(cleanup.run, { AUTH_FILE: "" }).exitCode).toBe(0);
    expect(failedProbe.stdout + failedProbe.stderr + result.stdout + result.stderr + rejected.stdout + rejected.stderr + subject.summary()).not.toContain(credential);
  } finally { subject.dispose(); }
});
