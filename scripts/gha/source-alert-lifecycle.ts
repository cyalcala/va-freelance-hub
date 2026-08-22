// OPS-05 — verified source-alert incident lifecycle.
//
// A PURE decision function plus a thin CLI. Given the current health signal for
// one incident class and the list of currently-open issues, it emits exactly one
// action — CREATE | UPDATE | HOLD | CLOSE — and the workflow executes ONLY that
// action against GitHub Issues. GitHub Issues is the durable state store; this
// module holds no state and performs no I/O in its decision path.
//
// Why this exists: the pulse workflows previously "skip if an open issue exists"
// but never rolled up or closed recovered incidents, so date-titled
// `source-health` issues accumulated as stale noise (e.g. #51–54, #69). This
// gives each incident CLASS a STABLE key (a hidden body marker, not the title)
// so repeated detections dedupe onto one open incident, and a defined healthy
// streak closes it — with these hard safety rules baked in:
//
//   * It NEVER unpauses a source, enables a source, or mutates production. The
//     only GitHub effects the caller may take from a decision are: open an issue,
//     comment on it, or close it.
//   * It fails closed on an ambiguous signal: state "unknown" (e.g. the
//     watchdog's post-deploy grace window) always yields HOLD, so an unproven
//     signal can never close an open incident.
//   * It is idempotent: a stable key + the streak marker mean reruns of the same
//     state produce HOLD, not duplicate issues or comments.

/** Confirmed health signal for one incident class this observation. */
export type IncidentState = "failing" | "healthy" | "unknown";

/** The minimal open-issue shape the decision needs (from `gh issue list`). */
export interface LifecycleIssue {
  number: number;
  body?: string | null;
}

export interface LifecycleInput {
  /** Stable incident-class key, e.g. "ingestion-health". */
  incidentKey: string;
  state: IncidentState;
  /** Currently-open issues (any label); matched by the embedded incident key. */
  openIssues: LifecycleIssue[];
  /** Consecutive healthy observations required to close. Default 2, min 1. */
  healthyThreshold?: number;
}

export type LifecycleAction =
  /** Failing, no open incident for this key → open one (streak starts at 0). */
  | { action: "CREATE"; incidentKey: string; healthyStreak: 0 }
  /** Append a bounded evidence comment and rewrite the streak marker. */
  | { action: "UPDATE"; issueNumber: number; healthyStreak: number; reason: "recurred-during-recovery" | "healthy-progress" }
  /** Nothing to do (idempotent no-op). */
  | { action: "HOLD"; reason: string }
  /** Healthy streak reached → close the incident. */
  | { action: "CLOSE"; issueNumber: number };

const INCIDENT_KEY_RE = /<!--\s*incident-key:\s*([a-z0-9._-]+)\s*-->/i;
const HEALTHY_STREAK_RE = /<!--\s*healthy-streak:\s*(\d+)\s*-->/i;

/** Extract the stable incident key embedded in an issue body, or null. */
export function parseIncidentKey(body: string | null | undefined): string | null {
  if (typeof body !== "string") return null;
  const m = body.match(INCIDENT_KEY_RE);
  return m ? m[1].toLowerCase() : null;
}

/** Extract the recorded healthy streak; absent/malformed marker reads as 0. */
export function parseHealthyStreak(body: string | null | undefined): number {
  if (typeof body !== "string") return 0;
  const m = body.match(HEALTHY_STREAK_RE);
  if (!m) return 0;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** The hidden markers a caller appends to an incident body (stable key + streak). */
export function renderMarkers(incidentKey: string, healthyStreak: number): string {
  return `<!-- incident-key: ${incidentKey} -->\n<!-- healthy-streak: ${Math.max(0, Math.trunc(healthyStreak))} -->`;
}

/**
 * Decide the single lifecycle action for one incident class. Pure: no I/O, no
 * mutation. `openIssues` may be malformed (non-array / missing bodies); such
 * input degrades to a safe no-op rather than throwing.
 */
export function decideAlertLifecycle(input: LifecycleInput): LifecycleAction {
  const parsedThreshold = Math.trunc(input.healthyThreshold ?? 2);
  const threshold = Math.max(1, Number.isFinite(parsedThreshold) ? parsedThreshold : 2);
  const issues = Array.isArray(input.openIssues) ? input.openIssues : [];
  // Stored keys are matched case-insensitively by parseIncidentKey; normalizing
  // here too guarantees a mixed-case caller cannot fork a second incident.
  const key = String(input.incidentKey).toLowerCase();

  // The matching OPEN incident for this class, if any (first wins; the lifecycle
  // guarantees at most one open per key).
  const match = issues.find(
    (i) => i && typeof i.number === "number" && parseIncidentKey(i.body) === key,
  );

  if (input.state === "failing") {
    if (!match) return { action: "CREATE", incidentKey: key, healthyStreak: 0 };
    const streak = parseHealthyStreak(match.body);
    // Already tracked as actively failing → no new noise.
    if (streak === 0) {
      return { action: "HOLD", reason: "still failing; incident already open and tracked" };
    }
    // It was recovering (streak >= 1) and failed again → reset the clock.
    return {
      action: "UPDATE",
      issueNumber: match.number,
      healthyStreak: 0,
      reason: "recurred-during-recovery",
    };
  }

  if (input.state === "healthy") {
    if (!match) return { action: "HOLD", reason: "healthy; no open incident" };
    const next = parseHealthyStreak(match.body) + 1;
    if (next >= threshold) return { action: "CLOSE", issueNumber: match.number };
    return {
      action: "UPDATE",
      issueNumber: match.number,
      healthyStreak: next,
      reason: "healthy-progress",
    };
  }

  // state === "unknown": fail closed — never create, never close on an
  // unproven signal (e.g. the post-deploy grace window).
  return { action: "HOLD", reason: "state unknown; no lifecycle action" };
}

// ── Thin CLI ────────────────────────────────────────────────────────────────
// Usage:
//   bun scripts/gha/source-alert-lifecycle.ts \
//     --incident-key ingestion-health --state healthy \
//     --issues open-issues.json [--threshold 2]
// `--issues` is a JSON array of { number, body } (e.g. `gh issue list --json
// number,body`). Prints the decision as one JSON object on stdout.
async function main(argv: string[]): Promise<void> {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (k?.startsWith("--")) args.set(k.slice(2), argv[i + 1] ?? "");
  }
  const incidentKey = args.get("incident-key");
  const state = args.get("state") as IncidentState | undefined;
  const issuesPath = args.get("issues");
  const threshold = args.has("threshold") ? Number.parseInt(args.get("threshold")!, 10) : undefined;

  if (!incidentKey || !state) {
    console.error("usage: --incident-key <key> --state failing|healthy|unknown [--issues file.json] [--threshold N]");
    process.exit(2);
  }
  if (state !== "failing" && state !== "healthy" && state !== "unknown") {
    console.error(`invalid --state "${state}" (expected failing|healthy|unknown)`);
    process.exit(2);
  }

  let openIssues: LifecycleIssue[] = [];
  if (issuesPath) {
    const { readFile } = await import("node:fs/promises");
    try {
      const raw = await readFile(issuesPath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) openIssues = parsed;
    } catch (err) {
      // Fail closed: an unreadable/invalid issue list degrades to "no open
      // incidents", so the worst case is a possible duplicate CREATE, never a
      // false CLOSE.
      console.error(`warning: could not read --issues (${(err as Error).message}); treating as empty`);
    }
  }

  const decision = decideAlertLifecycle({ incidentKey, state, openIssues, healthyThreshold: threshold });
  console.log(JSON.stringify(decision));
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
