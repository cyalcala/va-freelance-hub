/**
 * Discovered-Corpus Reconciliation & Stratified Validation — scripts/lake/reconcile-discovered-corpus.ts
 *
 * Gauntlet Phase 3 (Deep Source Universe Expansion): turns the inert
 * `review_status='discovered'` corpus (imported registry claims) into
 * allocatable capacity by running a bounded stratified slice through the
 * existing sanctioned admission engine.
 *
 * Contract:
 *  - Reads only `review_status='discovered'` rows (never re-evaluates probed rows).
 *  - Deterministic stratified slice: evenly-spaced N boards per family.
 *  - Probing/evaluation/persistence is delegated to `runBulkAtsDiscovery`
 *    (geoGate + Jev + Wilson + ON CONFLICT UPDATE) — the sanctioned path;
 *    this script adds no new write semantics.
 *  - Records a lake_runs ledger row with the reconciliation evidence.
 *
 * Run:
 *   bun run scripts/lake/reconcile-discovered-corpus.ts --per-family=30
 *   bun run scripts/lake/reconcile-discovered-corpus.ts --per-family=30 --dry-run
 */

import { getLakeClient } from "./client";
import { ensureDiscoveryTable, runBulkAtsDiscovery, type BulkSeed } from "./domain-ats-discovery";
import { stratifySample } from "./import-source-registry";

type LakeClient = ReturnType<typeof getLakeClient>;

function argOf(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

export interface ReconciliationOptions {
  perFamily: number;
  dryRun: boolean;
  probeDelayMs: number;
}

export function parseReconciliationArgs(argv: string[]): ReconciliationOptions {
  const get = (prefix: string) => {
    const hit = argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
  };
  return {
    perFamily: get("--per-family=") ? Number.parseInt(get("--per-family=")!, 10) : 30,
    dryRun: argv.includes("--dry-run"),
    probeDelayMs: get("--delay-ms=") ? Number.parseInt(get("--delay-ms="), 10) : 1500,
  };
}

export function rowToBulkSeed(row: any): BulkSeed {
  return {
    companyName: String(row.company_hint ?? row.domain ?? "").trim(),
    atsFamily: String(row.ats_family).toLowerCase(),
    tenantSlug: String(row.tenant_slug),
    website: undefined,
  };
}

export async function loadDiscoveredSeeds(client: LakeClient, family?: string): Promise<BulkSeed[]> {
  await ensureDiscoveryTable(client);
  const res = family
    ? await client.execute({
        sql: `SELECT domain, company_hint, ats_family, tenant_slug FROM lake_ats_discovery WHERE review_status = 'discovered' AND ats_family = ? ORDER BY id;`,
        args: [family],
      })
    : await client.execute(
        `SELECT domain, company_hint, ats_family, tenant_slug FROM lake_ats_discovery WHERE review_status = 'discovered' ORDER BY id;`,
      );
  return (res.rows as any[]).map(rowToBulkSeed);
}

export async function reconcileDiscoveredCorpus(options: ReconciliationOptions): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log("=== Discovered-Corpus Reconciliation (Gauntlet Phase 3) ===");
  console.log(`Per-family slice: ${options.perFamily} | DryRun: ${options.dryRun} | Delay: ${options.probeDelayMs}ms\n`);

  const client = getLakeClient();
  const all = await loadDiscoveredSeeds(client);
  const counts: Record<string, number> = {};
  for (const s of all) counts[s.atsFamily] = (counts[s.atsFamily] ?? 0) + 1;
  console.log(`Discovered corpus: ${all.length} unvalidated claims. By family: ${JSON.stringify(counts)}`);

  if (all.length === 0) {
    console.log("Nothing to reconcile — corpus exhausted or fully validated.");
    return;
  }

  const slice = stratifySample(all, options.perFamily);
  const sliceCounts: Record<string, number> = {};
  for (const s of slice) sliceCounts[s.atsFamily] = (sliceCounts[s.atsFamily] ?? 0) + 1;
  console.log(`Stratified slice: ${slice.length} boards. By family: ${JSON.stringify(sliceCounts)}\n`);

  const stats = await runBulkAtsDiscovery(slice, {
    dryRun: options.dryRun,
    probeDelayMs: options.probeDelayMs,
    limit: slice.length,
  });

  const evaluated = stats.admitted + stats.shadowed + stats.rejected;
  const marginalYield = stats.domainsScanned > 0 ? stats.jobsIngested / stats.domainsScanned : 0;
  const summary = {
    script: "reconcile-discovered-corpus",
    startedAt,
    finishedAt: new Date().toISOString(),
    corpusSize: all.length,
    sliceSize: slice.length,
    byFamilySlice: sliceCounts,
    domainsScanned: stats.domainsScanned,
    admitted: stats.admitted,
    shadowed: stats.shadowed,
    rejected: stats.rejected,
    jobsIngested: stats.jobsIngested,
    marginalQualifiedYieldPerProbe: Number(marginalYield.toFixed(4)),
    dryRun: options.dryRun,
  };
  console.log(`\nReconciliation evidence: scanned=${stats.domainsScanned} admitted=${stats.admitted} shadowed=${stats.shadowed} rejected=${stats.rejected} jobsIngested=${stats.jobsIngested} marginalYield/probe=${marginalYield.toFixed(4)}`);

  if (!options.dryRun) {
    try {
      await client.execute({
        sql: `INSERT INTO lake_runs (script, status, stats_json) VALUES (?, ?, ?);`,
        args: ["reconcile-discovered-corpus", "completed", JSON.stringify(summary)],
      });
    } catch (err: any) {
      console.warn(`Run ledger write skipped: ${err?.message ?? err}`);
    }
  }
}

if (import.meta.main) {
  reconcileDiscoveredCorpus(parseReconciliationArgs(process.argv.slice(2))).catch((err) => {
    console.error("Reconciliation failed:", err);
    process.exit(1);
  });
}
