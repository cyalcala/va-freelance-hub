import type { APIRoute } from "astro";
import { getDb, vaDirectory, sourceRegistry, providerProfiles, sourceOptOuts } from "@va-hub/db";
import { sql, eq } from "drizzle-orm";
import {
  classifyCandidates, chunkArray, maxRowsPerD1Batch, errorMessage,
  type RawCandidate, type ClassifiedCandidate,
  distinctAtsCandidates,
  providerConfigForPlatform,
  CANDIDATE_MAX_PER_RUN,
  CANDIDATE_ANOMALY_CEILING,
  CANDIDATE_INSERT_COLUMNS,
  maxRegistryRowsPerBatch,
  countBacklog,
  countReviewOverdue,
} from "@va-hub/scraper";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import {
  buildProspectCandidateQuery,
} from "@/lib/prospect-query";

export const prerender = false;

// Autonomous Prospector (2026-07-14). Mines already-ingested, already-eligible
// jobs for companies missing from va_directory and auto-adds the trusted,
// quality ones — removing the manual spreadsheet-import loop. Safety:
//  - Two gates (name quality + source trust) in @va-hub/scraper/prospector.
//  - Idempotent (skips existing normalized names); additive only, no deletes.
//  - Mass-add guard: > MAX_AUTO_ADD in one run is treated as anomalous
//    (a new bulk source or a bug) -> add nothing, flag for review.
//  - Fail-closed ATS: discovered ats_platform/ats_token are stored, but a
//    token absent from ATS_TOKEN_POLICIES stays PAUSED, so nothing is scraped
//    until a human promotes it (the workflow files that proposal).
//
// SP-06 (2026-08-29): durable candidate queue. Exact-host ATS discoveries
// (via prospector.ts exactOrSubdomain + extractAtsToken) create or refresh
// one idempotent row in `source_registry` as compliance=needs_review /
// operational=candidate without publishing or changing source policy.
// Lookalike hosts are already rejected by extractAtsToken; opt-outs are
// checked against source_opt_outs; duplicate sourceIds are suppressed;
// backlog/deadline/duplicate metrics are reported read-only.
const MIN_JOBS = 2;
const CANDIDATE_LIMIT = 200;
// Per-run drain rate: add at most this many of the highest-signal eligible
// companies each run, so a legitimate backlog clears gradually (N/run x 4
// runs/day) without a false anomaly alert.
const MAX_AUTO_ADD_PER_RUN = 15;
// Genuine-anomaly ceiling: more eligible than this in a single run implies a
// new bulk source or a parsing bug (the two quality gates already exclude
// garbage/spam), so add NOTHING and alert instead.
const ANOMALY_CEILING = 120;
// Conservative param budget: the row has 9 explicit columns, but Drizzle may
// also bind a default (e.g. created_at), so treat it as wider to stay well
// under D1's 100-bound-parameter cap. Batch failures also fall back to
// per-row inserts (below) so throughput is resilient regardless.
const DIRECTORY_INSERT_COLUMNS = 12;


export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;

    const rateLimiter = env?.API_RATE_LIMITER;
    if (rateLimiter) {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await rateLimiter.limit({ key: `prospect:${clientIp}` });
      if (!success) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
      }
    }

    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const db = getDb(env);
    const now = nowUtcIso();

    // 1. Candidate companies: appear in active eligible jobs, not yet in the
    // directory, with at least MIN_JOBS active postings. Correlated NOT IN
    // subquery (not a bound-param list) keeps this off the 100-param limit.
    const STALE_DAYS = 90;
    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60_000).toISOString();
    const rows = await db.all<{ company: string; jobs: number; sampleUrl: string | null; category: string | null }>(
      buildProspectCandidateQuery({ minimumJobs: MIN_JOBS, staleCutoff, limit: CANDIDATE_LIMIT }),
    );

    const raw: RawCandidate[] = rows.map((r) => ({
      company: r.company,
      jobs: Number(r.jobs) || 0,
      sampleUrl: r.sampleUrl ?? null,
      category: r.category ?? null,
    }));

    // 2. Existing directory names for idempotent skip.
    const existing = await db.select({ name: vaDirectory.companyName }).from(vaDirectory);
    const existingNormalized = new Set(existing.map((e) => e.name.toLowerCase().replace(/\s+/g, " ").trim()));

    // 3. Classify (name-quality + source-trust gates, dedup vs directory).
    // autoAdd is ordered by active job count (query ORDER BY jobs DESC).
    const { autoAdd, review, rejected } = classifyCandidates(raw, existingNormalized);

    // 4. Cap-and-drain: only a genuinely extreme count is an anomaly (add
    // nothing + alert). A normal/large backlog drains the top N by job count
    // per run.
    const eligibleCount = autoAdd.length;
    const anomaly = eligibleCount > ANOMALY_CEILING;
    const toAdd = anomaly ? [] : autoAdd.slice(0, MAX_AUTO_ADD_PER_RUN);
    const draining = !anomaly && eligibleCount > MAX_AUTO_ADD_PER_RUN;

    // 5. Idempotent additive insert of the highest-signal trusted candidates
    // (chunked under D1's 100-param limit). Discovered ATS tokens are stored
    // but stay paused (fail-closed) until promoted in code.
    let added = 0;
    const addedNames: string[] = [];
    if (toAdd.length > 0) {
      const values = toAdd.map((c: ClassifiedCandidate) => ({
        companyName: c.companyName,
        website: null,
        hiresFilipinos: true,
        niche: c.niche as any,
        isVerified: false,
        isRemote: true,
        notes: `Prospector auto-add ${now.slice(0, 10)}: discovered from ${c.jobs} active job(s); sample ${c.sampleUrl ?? "n/a"}.`,
        atsPlatform: (c.atsRef?.platform ?? null) as any,
        atsToken: c.atsRef?.token ?? null,
      }));
      for (const batch of chunkArray(values, maxRowsPerD1Batch(DIRECTORY_INSERT_COLUMNS))) {
        try {
          await db.insert(vaDirectory).values(batch);
          added += batch.length;
          addedNames.push(...batch.map((b) => b.companyName));
        } catch (err) {
          // A whole-batch failure (param overflow or one bad row) must not
          // block the other rows — retry the batch one row at a time.
          console.warn(`[api/cron/prospect] batch insert failed, retrying rows individually:`, errorMessage(err));
          for (const row of batch) {
            try {
              await db.insert(vaDirectory).values(row);
              added += 1;
              addedNames.push(row.companyName);
            } catch (rowErr) {
              console.warn(`[api/cron/prospect] row insert failed for ${row.companyName}:`, errorMessage(rowErr));
            }
          }
        }
      }
    }

    // 5b. SP-06 durable candidate queue — exact-host ATS discoveries as
    // non-publishing source_registry candidates (needs_review/candidate).
    // Provenance: eligible opportunity sample; lookalikes already rejected by
    // prospector.ts exactOrSubdomain; opt-outs checked; duplicates suppressed;
    // backlog/deadlines reported.
    let durableCandidateStats = {
      discoveredDistinct: 0,
      inserted: 0,
      refreshed: 0,
      skippedDuplicate: 0,
      skippedOptOut: 0,
      anomalyGuardTripped: false,
      backlog: 0,
      overdue: 0,
    };
    let insertedCandidateIds: string[] = [];
    let refreshedCandidateIds: string[] = [];
    try {
      const classifiedWithAts = [...autoAdd, ...review];
      const distinctMap = distinctAtsCandidates(classifiedWithAts, now);
      durableCandidateStats.discoveredDistinct = distinctMap.size;

      if (distinctMap.size > 0) {
        // Load existing registry and opt-out state (small table, full scan is safe;
        // avoids dynamic IN-list param explosion and FK edge cases).
        let existingRegistryIds = new Set<string>();
        let existingCandidateOperational = new Map<string, string>();
        let overdueCount = 0;
        try {
          const regRows = await db.select({
            sourceId: sourceRegistry.sourceId,
            operationalState: sourceRegistry.operationalState,
            complianceState: sourceRegistry.complianceState,
            reviewDeadline: sourceRegistry.reviewDeadline,
          }).from(sourceRegistry);
          for (const r of regRows) {
            existingRegistryIds.add(r.sourceId);
            existingCandidateOperational.set(r.sourceId, r.operationalState);
          }
          durableCandidateStats.backlog = countBacklog(regRows.map((r) => ({
            sourceId: r.sourceId,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            reviewDeadline: r.reviewDeadline,
          })));
          durableCandidateStats.overdue = countReviewOverdue(regRows.map((r) => ({
            sourceId: r.sourceId,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            reviewDeadline: r.reviewDeadline,
          })), now);
        } catch (regErr) {
          console.warn("[api/cron/prospect] registry load failed (pre-migration DB?), skipping candidate queue:", errorMessage(regErr));
          // If registry tables missing, skip candidate logic but keep directory behavior.
          distinctMap.clear();
        }

        let optOutIds = new Set<string>();
        try {
          const optRows = await db.select({ sourceId: sourceOptOuts.sourceId }).from(sourceOptOuts);
          for (const r of optRows) optOutIds.add(r.sourceId);
        } catch (optErr) {
          console.warn("[api/cron/prospect] opt-out load failed, treating as empty:", errorMessage(optErr));
        }

        // Partition distinct candidates into insert / refresh / skip buckets.
        const toInsert: Array<{ sourceId: string; row: any }> = [];
        const toRefresh: Array<{ sourceId: string; provenance: string }> = [];
        for (const [sourceId, { row }] of distinctMap) {
          if (optOutIds.has(sourceId)) {
            durableCandidateStats.skippedOptOut++;
            continue;
          }
          if (existingRegistryIds.has(sourceId)) {
            const op = existingCandidateOperational.get(sourceId);
            if (op === "candidate") {
              // Refresh provenance + updated_at without changing policy.
              toRefresh.push({ sourceId, provenance: row.discoveryProvenance });
              durableCandidateStats.skippedDuplicate++; // counted as duplicate suppression
            } else {
              // Already decided (paused/active/etc.) — do not overwrite policy.
              durableCandidateStats.skippedDuplicate++;
            }
            continue;
          }
          toInsert.push({ sourceId, row });
        }

        // Mass-add guard for candidates (distinct tokens, not directory rows).
        if (toInsert.length + toRefresh.length > CANDIDATE_ANOMALY_CEILING) {
          durableCandidateStats.anomalyGuardTripped = true;
          console.warn(`[api/cron/prospect] candidate anomaly: ${toInsert.length + toRefresh.length} distinct ATS tokens > ${CANDIDATE_ANOMALY_CEILING}, adding nothing`);
          // Do not insert/refresh when anomaly tripped.
          toInsert.length = 0;
          toRefresh.length = 0;
        } else {
          // Per-run drain for inserts only (refreshes are always applied as they are tiny).
          const cappedInsert = toInsert.slice(0, CANDIDATE_MAX_PER_RUN);
          if (cappedInsert.length < toInsert.length) {
            console.warn(`[api/cron/prospect] candidate drain: ${toInsert.length} queued, draining ${cappedInsert.length} this run`);
          }

          // Ensure provider profiles exist for inserts (FK).
          if (cappedInsert.length > 0) {
            const neededProviderIds = new Set(cappedInsert.map((c) => c.row.providerId));
            for (const pid of neededProviderIds) {
              const cfg = providerConfigForPlatform(pid as any);
              if (!cfg) continue;
              try {
                await db.insert(providerProfiles).values({
                  id: cfg.providerId,
                  displayName: cfg.displayName,
                  providerFamily: cfg.providerFamily,
                  mechanism: cfg.mechanism as any,
                  authClass: cfg.authClass as any,
                  endpointPattern: cfg.endpointPattern,
                  allowedHosts: cfg.allowedHosts,
                  evidenceLeaseDays: 180,
                  defaultComplianceState: "needs_review" as any,
                  defaultOperationalState: "candidate" as any,
                } as any).onConflictDoNothing();
              } catch (provErr) {
                // Fallback to raw INSERT OR IGNORE if Drizzle helper unavailable.
                try {
                  await db.run(sql`INSERT OR IGNORE INTO provider_profiles (id, display_name, provider_family, mechanism, auth_class, endpoint_pattern, allowed_hosts, evidence_lease_days, default_compliance_state, default_operational_state) VALUES (${cfg.providerId}, ${cfg.displayName}, ${cfg.providerFamily}, ${cfg.mechanism}, ${cfg.authClass}, ${cfg.endpointPattern}, ${cfg.allowedHosts}, 180, 'needs_review', 'candidate')`);
                } catch {}
                console.warn(`[api/cron/prospect] provider ensure failed for ${pid}:`, errorMessage(provErr));
              }
            }

            // Chunked insert for candidates.
            const insertRows = cappedInsert.map((c) => c.row);
            for (const batch of chunkArray(insertRows, maxRegistryRowsPerBatch())) {
              // Drizzle insert with onConflictDoNothing for idempotency.
              try {
                await db.insert(sourceRegistry).values(batch as any).onConflictDoNothing();
                // Count only those that were actually inserted (onConflictDoNothing may have skipped race).
                // We conservatively count batch size; duplicate suppression already handled above so this is accurate as first insert.
                durableCandidateStats.inserted += batch.length;
                insertedCandidateIds.push(...batch.map((r: any) => r.sourceId));
              } catch (err) {
                // Fallback per-row with INSERT OR IGNORE.
                console.warn(`[api/cron/prospect] candidate batch insert failed, retrying rows:`, errorMessage(err));
                for (const row of batch) {
                  try {
                    await db.insert(sourceRegistry).values(row as any).onConflictDoNothing();
                    durableCandidateStats.inserted += 1;
                    insertedCandidateIds.push(row.sourceId);
                  } catch (rowErr) {
                    console.warn(`[api/cron/prospect] candidate row insert failed for ${row.sourceId}:`, errorMessage(rowErr));
                  }
                }
              }
            }
          }

          // Refresh existing candidate provenance (tiny, no cap needed; but still chunk).
          if (toRefresh.length > 0) {
            for (const batch of chunkArray(toRefresh, maxRegistryRowsPerBatch())) {
              for (const r of batch) {
                try {
                  await db.update(sourceRegistry).set({
                    discoveryProvenance: r.provenance,
                    updatedAt: now,
                  } as any).where(eq(sourceRegistry.sourceId, r.sourceId));
                  durableCandidateStats.refreshed += 1;
                  refreshedCandidateIds.push(r.sourceId);
                } catch (updErr) {
                  console.warn(`[api/cron/prospect] candidate refresh failed for ${r.sourceId}:`, errorMessage(updErr));
                }
              }
            }
          }
        }

        // Recompute backlog/overdue after inserts/refresh for accurate report.
        try {
          const postRows = await db.select({
            sourceId: sourceRegistry.sourceId,
            operationalState: sourceRegistry.operationalState,
            complianceState: sourceRegistry.complianceState,
            reviewDeadline: sourceRegistry.reviewDeadline,
          }).from(sourceRegistry);
          durableCandidateStats.backlog = countBacklog(postRows.map((r) => ({
            sourceId: r.sourceId,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            reviewDeadline: r.reviewDeadline,
          })));
          durableCandidateStats.overdue = countReviewOverdue(postRows.map((r) => ({
            sourceId: r.sourceId,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            reviewDeadline: r.reviewDeadline,
          })), now);
        } catch {}
      } else {
        // Still compute backlog even when no new candidates discovered this run.
        try {
          const regRows = await db.select({
            sourceId: sourceRegistry.sourceId,
            operationalState: sourceRegistry.operationalState,
            complianceState: sourceRegistry.complianceState,
            reviewDeadline: sourceRegistry.reviewDeadline,
          }).from(sourceRegistry);
          durableCandidateStats.backlog = countBacklog(regRows.map((r) => ({
            sourceId: r.sourceId,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            reviewDeadline: r.reviewDeadline,
          })));
          durableCandidateStats.overdue = countReviewOverdue(regRows.map((r) => ({
            sourceId: r.sourceId,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            reviewDeadline: r.reviewDeadline,
          })), now);
        } catch {}
      }
    } catch (candErr) {
      console.warn("[api/cron/prospect] durable candidate queue failed (non-blocking):", errorMessage(candErr));
    }

    // 6. ATS-enable proposals: discovered tokens on the companies we acted on
    // this run (added) or are surfacing for review, for a human to promote
    // into ATS_TOKEN_POLICIES. Now augmented by durable registry state:
    // proposals that became durable candidates are marked review_ready.
    const atsProposals = [...toAdd, ...review]
      .filter((c) => c.atsRef)
      .map((c) => ({ company: c.companyName, platform: c.atsRef!.platform, token: c.atsRef!.token, jobs: c.jobs, sampleUrl: c.sampleUrl }));

    return new Response(JSON.stringify({
      success: true,
      candidatesConsidered: raw.length,
      autoAddEligible: eligibleCount,
      added,
      addedNames,
      draining,
      backlogRemaining: Math.max(0, eligibleCount - added),
      reviewOnly: review.map((c) => ({ company: c.companyName, jobs: c.jobs, sampleUrl: c.sampleUrl })),
      rejectedForQuality: rejected,
      atsProposals,
      massAddGuardTripped: anomaly,
      // SP-06 durable candidate queue (non-publishing)
      durableCandidates: {
        ...durableCandidateStats,
        insertedIds: insertedCandidateIds,
        refreshedIds: refreshedCandidateIds,
        // Invariant: no candidate here has been published or enabled.
        mode: "non-publishing-candidate-only",
      },
      mode: "auto-add-directory-and-candidate-queue",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[api/cron/prospect] Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
