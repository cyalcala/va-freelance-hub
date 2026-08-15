import { and, asc, eq } from "drizzle-orm";
import { getDb, opportunities } from "@va-hub/db";
import {
  geoGate,
  decideTriage,
  mapTriageCategoryToUiCategory,
  sanitizeApplyUrl,
} from "@va-hub/scraper";
import { inngest, type CfBindings } from "../client";

// How many `pending-triage` rows one cron pass claims. Kept small on purpose:
// each row spends up to ~8 `env.AI.run` calls (4-model ladder + skeptic ladder),
// and the Workers AI Free tier allows only ~10k neurons/day. A small batch, a
// tight throttle, and 144 daily cron passes drain the ~65 listings/day steady-
// state (and any backlog) without ever tripping the daily quota (error 4006).
export const TRIAGE_DRAIN_BATCH = 12;

/** Row shape claimed for triage — only the fields the verdict needs. */
type PendingRow = {
  id: number;
  title: string;
  description: string | null;
  company: string | null;
  tags: string[] | null;
  locationRaw: string | null;
  sourceUrl: string;
  applicationUrl: string | null;
};

/**
 * Durable triage worker (Inngest pilot).
 *
 * The scrape route persists new gate-passed listings as hidden `pending-triage`
 * rows (is_active=0). This function claims them in small batches and classifies
 * each in its OWN Inngest step — i.e. its own Pages Function invocation with its
 * own fresh 50-subrequest budget. That is the structural fix for the 2026-08-07
 * freeze: the AI ladder never again shares one invocation across ~50 listings.
 *
 *  - concurrency 5  → the free-tier ceiling; also bounds neuron burn.
 *  - throttle 30/1m → keeps a backlog drain under the 10k-neuron/day quota.
 *  - retries 2      → transient AI/D1 blips self-heal; a row left `pending` on
 *                     ai-unavailable is simply reclaimed next pass (fail closed).
 */
export const triageDrain = inngest.createFunction(
  {
    id: "triage-drain",
    concurrency: { limit: 5 },
    throttle: { limit: 30, period: "1m" },
    retries: 2,
    triggers: [{ cron: "*/10 * * * *" }],
  },
  async (ctx) => {
    const step = ctx.step;
    const env = (ctx as unknown as { env: CfBindings }).env;
    const db = getDb(env);

    // 1. Claim the oldest pending-triage rows (hidden, is_active=0).
    const pending: PendingRow[] = await step.run("load-pending", async () => {
      return await db
        .select({
          id: opportunities.id,
          title: opportunities.title,
          description: opportunities.description,
          company: opportunities.company,
          tags: opportunities.tags,
          locationRaw: opportunities.locationRaw,
          sourceUrl: opportunities.sourceUrl,
          applicationUrl: opportunities.applicationUrl,
        })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.isActive, false),
            eq(opportunities.inactiveReason, "pending-triage"),
          ),
        )
        .orderBy(asc(opportunities.scrapedAt))
        .limit(TRIAGE_DRAIN_BATCH);
    });

    if (pending.length === 0) {
      return { claimed: 0, published: 0, rejected: 0, quarantined: 0, deferred: 0 };
    }

    // 2. Fan out — one step per listing, each its own invocation/budget.
    const outcomes = await Promise.all(
      pending.map((row) =>
        step.run(`triage-${row.id}`, async () => {
          const observedAt = new Date().toISOString();
          const baseTags = row.tags ?? [];

          // Deterministic geo verdict is cheap (no AI); re-derived rather than
          // stored so this stays the single geoGate source of truth.
          const gate = geoGate({
            title: row.title,
            description: row.description,
            locationRaw: row.locationRaw,
            tags: baseTags,
          });

          const decision = await decideTriage(
            {
              title: row.title,
              description: row.description,
              company: row.company,
              tags: baseTags,
              locationRaw: row.locationRaw,
            },
            { geoScope: gate.geoScope },
            env,
          );

          // FAIL CLOSED: transient failure or AI outage leaves the row pending;
          // the next cron pass reclaims it. Nothing unclassified is published.
          if (decision.kind === "error" || decision.kind === "ai-unavailable") {
            return "deferred" as const;
          }

          if (decision.kind === "ineligible") {
            await db
              .update(opportunities)
              .set({
                inactiveReason: "policy-rejected",
                phEligibility: "ineligible",
                geoScope: gate.geoScope,
                category: "other",
                tags: Array.from(new Set([...baseTags, "triage-rejected"])),
                geoEvidence: `AI triage: ${decision.reason.slice(0, 200)}`,
                geoCheckedAt: observedAt,
                updatedAt: observedAt,
              })
              .where(eq(opportunities.id, row.id));
            return "rejected" as const;
          }

          if (decision.kind === "consensus-split") {
            await db
              .update(opportunities)
              .set({
                inactiveReason: "policy-rejected",
                phEligibility: "unclear",
                geoScope: gate.geoScope,
                tags: Array.from(new Set([...baseTags, "consensus-quarantined"])),
                geoEvidence: `Consensus split — skeptic: ${decision.reason.slice(0, 200)}`,
                geoCheckedAt: observedAt,
                updatedAt: observedAt,
              })
              .where(eq(opportunities.id, row.id));
            return "quarantined" as const;
          }

          // Eligible → publish (is_active=1). Mirrors the inline scrape mapping.
          const triage = decision.triage;
          const mergedTags = Array.from(
            new Set([...baseTags, triage.category, ...(triage.tags || [])]),
          )
            .filter(Boolean)
            .map((t) => (typeof t === "string" ? t.toLowerCase().trim() : t));

          await db
            .update(opportunities)
            .set({
              isActive: true,
              inactiveReason: null,
              geoScope: gate.geoScope,
              phEligibility:
                gate.phEligibility === "unclear" ? "eligible_likely" : gate.phEligibility,
              geoEvidence:
                gate.geoScope === "unknown"
                  ? `AI triage passed: ${(triage.reason || "eligible").slice(0, 200)}`
                  : gate.evidence,
              geoCheckedAt: observedAt,
              applicationUrl:
                sanitizeApplyUrl(triage.applicationUrl) ||
                sanitizeApplyUrl(row.applicationUrl) ||
                row.sourceUrl,
              tags: mergedTags,
              payRange: triage.payRange,
              category: mapTriageCategoryToUiCategory(triage.category),
              experienceLevel: triage.experienceLevel,
              type:
                triage.employmentType === "contract"
                  ? "freelance"
                  : triage.employmentType || "freelance",
              updatedAt: observedAt,
            })
            .where(eq(opportunities.id, row.id));
          return "published" as const;
        }),
      ),
    );

    const count = (k: string) => outcomes.filter((o) => o === k).length;
    return {
      claimed: pending.length,
      published: count("published"),
      rejected: count("rejected"),
      quarantined: count("quarantined"),
      deferred: count("deferred"),
    };
  },
);
