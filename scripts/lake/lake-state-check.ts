/**
 * Lake state check — scripts/lake/lake-state-check.ts
 *
 * Read-only Turso lake observability snapshot. Never writes.
 *
 * Run from the repo root with: bun run lake:state [--json]
 */
import { getLakeClient, isLakeConfigured } from "./client";

export interface LakeState {
  qualifiedReady: number;
  notYetSynced: number;
  alreadySynced: number;
  rawObservations: number;
  unprocessedRaw: number;
  replayEvents: number;
  autoApprovedTenants: number;
  bySource: Array<{ source_id: string; cnt: number }>;
}

async function count(
  client: ReturnType<typeof getLakeClient>,
  sql: string,
  args: unknown[] = []
): Promise<number> {
  const res = await client.execute({ sql, args: args as any });
  return Number(res.rows[0]?.cnt ?? 0);
}

export async function checkLakeState(): Promise<LakeState> {
  if (!isLakeConfigured()) {
    throw new Error("TURSO_DATABASE_URL is not set — cannot check lake state.");
  }
  const client = getLakeClient();

  const [qualifiedReady, notYetSynced, alreadySynced, rawObservations, unprocessedRaw, replayEvents] =
    await Promise.all([
      count(
        client,
        `SELECT COUNT(*) as cnt FROM lake_candidate_jobs
         WHERE status = 'QUALIFIED_READY'
           AND ph_eligibility IN ('eligible_verified', 'eligible_likely');`
      ),
      count(
        client,
        `SELECT COUNT(*) as cnt FROM lake_candidate_jobs
         WHERE status = 'QUALIFIED_READY'
           AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
           AND synced_to_d1_at IS NULL;`
      ),
      count(client, `SELECT COUNT(*) as cnt FROM lake_candidate_jobs WHERE status = 'SYNCED_TO_D1';`),
      count(client, `SELECT COUNT(*) as cnt FROM lake_raw_observations;`),
      count(client, `SELECT COUNT(*) as cnt FROM lake_raw_observations WHERE processed = 0;`),
      count(client, `SELECT COUNT(*) as cnt FROM lake_replay_events;`).catch(() => 0),
    ]);

  const bySourceRes = await client.execute(`
    SELECT source_id, COUNT(*) as cnt
    FROM lake_candidate_jobs
    WHERE status = 'QUALIFIED_READY'
      AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
    GROUP BY source_id ORDER BY cnt DESC;
  `);

  const admittedAts = await client
    .execute(
      `SELECT COUNT(*) as cnt FROM lake_ats_discovery WHERE review_status = 'auto_approved';`
    )
    .then((r) => Number(r.rows[0]?.cnt ?? 0))
    .catch(() => 0);

  return {
    qualifiedReady,
    notYetSynced,
    alreadySynced,
    rawObservations,
    unprocessedRaw,
    replayEvents,
    autoApprovedTenants: admittedAts,
    bySource: bySourceRes.rows.map((r) => ({
      source_id: r.source_id as string,
      cnt: Number(r.cnt),
    })),
  };
}

export function renderLakeState(state: LakeState): string {
  const lines = [
    "=== TURSO LAKE STATE ===",
    `QUALIFIED_READY total:    ${state.qualifiedReady}`,
    `Not yet synced to D1:     ${state.notYetSynced}`,
    `Already SYNCED_TO_D1:     ${state.alreadySynced}`,
    `Raw observations:         ${state.rawObservations} (${state.unprocessedRaw} unprocessed)`,
    `Replay events:            ${state.replayEvents}`,
    `Auto-approved tenants:    ${state.autoApprovedTenants}`,
    "",
    "QUALIFIED_READY by source:",
    ...state.bySource.map((r) => `  ${r.source_id}: ${r.cnt}`),
  ];
  return lines.join("\n");
}

if (import.meta.main) {
  const asJson = process.argv.includes("--json");
  checkLakeState()
    .then((state) => {
      console.log(asJson ? JSON.stringify(state, null, 2) : renderLakeState(state));
    })
    .catch((err) => {
      console.error("Lake state check failed:", err.message);
      process.exit(1);
    });
}
