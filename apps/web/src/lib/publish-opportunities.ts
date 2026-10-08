import type { NewOpportunity } from "@va-hub/db";
import {
  loadPublicationPolicy,
  publishPublicExposure,
  publicationTickKey,
  wrapD1Binding,
  type PublicationDatabase,
} from "@va-hub/scraper";
import { publicationRetryKey, snapshotPublicationInserts, snapshotPublicationUpdate } from "./publication-retry-key";

export function publicationDbFromEnv(env: { DB?: { prepare: (sql: string) => any } } | null | undefined): PublicationDatabase | null {
  return env?.DB?.prepare ? wrapD1Binding(env.DB) : null;
}

function canonicalPublicationSourceId(sourceId: string | null | undefined): string {
  return sourceId && /^[a-z0-9:._-]+$/.test(sourceId) ? sourceId : "unattributed";
}

/** IDs returned by the opportunity INSERT, never inferred from D1 write metadata. */
export function normalizePersistedOpportunityIds(ids: readonly number[]): number[] {
  if (!Array.isArray(ids)) throw new Error("opportunity insert must return persisted IDs");
  return [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))];
}

/**
 * EX-CANARY-INGESTION: clamp a proposed batch to a canary source's enforced
 * per-tick cap so the publication gateway never fires its automatic
 * rollback-to-shadow. The gateway remains the authoritative enforcement layer;
 * this caller clamp only prevents a valid-cap canary from breaching. An
 * unreadable policy or an invalid cap proposes zero — a missed tick that dedup
 * naturally retries, never an unclamped canary proposal.
 */
async function canaryClampedProposal(
  publicationDb: PublicationDatabase,
  sourceId: string,
  proposed: number,
): Promise<number> {
  try {
    const policy = await loadPublicationPolicy(publicationDb, sourceId);
    if (policy.operational !== "canary") return proposed;
    const cap = policy.canaryMaxNewItemsPerTick;
    if (typeof cap !== "number" || !Number.isSafeInteger(cap) || cap <= 0) return 0;
    return Math.min(proposed, cap);
  } catch {
    return 0;
  }
}

export async function publishGroupedInserts(
  publicationDb: PublicationDatabase,
  insertBatch: (rows: NewOpportunity[]) => Promise<number[]>,
  rows: NewOpportunity[],
  now: string,
  channel: string,
): Promise<{ published: number; failed: boolean }> {
  const tickKey = publicationTickKey(channel, now);
  // Detach before grouping or awaiting policy: the recorded source and the
  // eventual write must come from the same validated input snapshot.
  const input = snapshotPublicationInserts(rows).rows;
  const grouped = new Map<string, NewOpportunity[]>();
  for (const row of input) {
    const sourceId = canonicalPublicationSourceId(row.sourceId);
    const list = grouped.get(sourceId) ?? [];
    list.push(row);
    grouped.set(sourceId, list);
  }
  let published = 0;
  for (const [sourceId, group] of grouped) {
    const proposedCount = await canaryClampedProposal(publicationDb, sourceId, group.length);
    const selected = snapshotPublicationInserts(group.slice(0, proposedCount));
    const retryKey = await publicationRetryKey({ sourceId, tickKey, action: "insert", proposedCount, material: selected.material });
    const result = await publishPublicExposure(publicationDb, {
      sourceId,
      now,
      tickKey,
      retryKey,
      proposedCount,
      persist: async (allowed) => {
        const ids = normalizePersistedOpportunityIds(await insertBatch(selected.rows.slice(0, allowed)));
        if (ids.length > allowed) throw new Error("insert returned more persisted IDs than allowed");
        return { publishedCount: ids.length, ids };
      },
    });
    if (!result.ok) return { published, failed: true };
    published += result.publishedCount;
  }
  return { published, failed: false };
}

export async function publishGroupedActivations<T extends object>(
  publicationDb: PublicationDatabase,
  rows: Array<{ id: number; sourceId: string | null }>,
  now: string,
  channel: string,
  patch: T,
  persistIds: (ids: number[], patch: T) => Promise<{ publishedCount: number; ids: number[] }>,
): Promise<{ published: number; failed: boolean }> {
  if (rows.length === 0) return { published: 0, failed: false };
  const tickKey = publicationTickKey(channel, now);
  const action = channel === "scrape-gate" ? "gate-recovery" : channel === "scrape-reactivate" ? "feed-reactivation" : null;
  if (!action) throw new Error("grouped activation requires a known publication action");
  const update = snapshotPublicationUpdate(patch);
  const grouped = new Map<string, number[]>();
  const targetSources = new Map<number, string>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.id) || row.id <= 0) throw new Error("activation target ID must be a positive safe integer");
    const sourceId = canonicalPublicationSourceId(row.sourceId);
    const priorSource = targetSources.get(row.id);
    if (priorSource !== undefined) {
      if (priorSource !== sourceId) throw new Error("activation target has conflicting source attribution");
      continue;
    }
    targetSources.set(row.id, sourceId);
    const list = grouped.get(sourceId) ?? [];
    list.push(row.id);
    grouped.set(sourceId, list);
  }
  let published = 0;
  for (const [sourceId, ids] of grouped) {
    const ordered = [...ids].sort((a, b) => a - b);
    const proposedCount = await canaryClampedProposal(publicationDb, sourceId, ordered.length);
    const selected = ordered.slice(0, proposedCount);
    const retryKey = await publicationRetryKey({ sourceId, tickKey, action, proposedCount,
      material: { ids: selected, patch: update.material } });
    const result = await publishPublicExposure(publicationDb, {
      sourceId,
      now,
      tickKey,
      retryKey,
      proposedCount,
      persist: async (allowed) => persistIds(selected.slice(0, allowed), update.patch),
    });
    if (!result.ok) return { published, failed: true };
    published += result.publishedCount;
  }
  return { published, failed: false };
}
