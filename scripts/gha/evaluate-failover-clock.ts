// SP-21 — thin CLI around the pure decision function
// packages/scraper/failover-clock.ts. See that file for the full rationale;
// this script only reads the wrangler D1 evidence file and prints the
// decision as JSON, the same shape scripts/gha/source-alert-lifecycle.ts
// uses for its own CLI.
//
// Usage:
//   bun scripts/gha/evaluate-failover-clock.ts <wrangler-d1-json-path> \
//     [--now ISO] [--stale-after-minutes N]
//
// <wrangler-d1-json-path> is the file produced by:
//   wrangler d1 execute DB --remote --env production --json --command \
//     "SELECT last_attempt_at FROM source_fetch_state WHERE source_id = '__ingest_diag__' LIMIT 1;"
// i.e. the shape `[{"results":[{"last_attempt_at": "..."}]}]`. A missing
// file, unparseable JSON, or empty results array all degrade to "no
// heartbeat evidence" (action "unknown") rather than throwing, matching the
// fail-safe contract in failover-clock.ts.
import { readFile } from "node:fs/promises";
// Relative, not "@va-hub/scraper": scripts/ is not itself a workspace member,
// so the package name only resolves from within apps/web (its declared
// dependent) — a plain `bun scripts/gha/evaluate-failover-clock.ts` from the
// repo root cannot see it.
import { decideFailoverTakeover, DEFAULT_STALE_AFTER_MINUTES } from "../../packages/scraper/failover-clock";

async function main(argv: string[]): Promise<void> {
  const [diagnosticPath, ...rest] = argv;
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i];
    if (k?.startsWith("--")) flags.set(k.slice(2), rest[i + 1] ?? "");
  }
  const now = flags.get("now") || new Date().toISOString();
  const staleAfterMinutes = flags.has("stale-after-minutes")
    ? Number.parseInt(flags.get("stale-after-minutes")!, 10)
    : DEFAULT_STALE_AFTER_MINUTES;

  let lastAttemptAt: string | null = null;
  if (diagnosticPath) {
    try {
      const raw = await readFile(diagnosticPath, "utf8");
      const parsed = JSON.parse(raw);
      const row = parsed?.[0]?.results?.[0];
      lastAttemptAt = row?.last_attempt_at ?? null;
    } catch (err) {
      console.error(`warning: could not read diagnostic evidence (${(err as Error).message}); treating as missing`);
    }
  }

  const decision = decideFailoverTakeover(
    { lastAttemptAt, now },
    Number.isFinite(staleAfterMinutes) ? staleAfterMinutes : DEFAULT_STALE_AFTER_MINUTES,
  );
  console.log(JSON.stringify(decision));
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
