import type { NewOpportunity } from "@va-hub/db";
import {
  loadPublicationPolicy,
  publishPublicExposure,
  publicationTickKey,
  wrapD1Binding,
  type PublicationDatabase,
} from "@va-hub/scraper";

export function publicationDbFromEnv(env: { DB?: { prepare: (sql: string) => any } } | null | undefined): PublicationDatabase | null {
  return env?.DB?.prepare ? wrapD1Binding(env.DB) : null;
}

function canonicalPublicationSourceId(sourceId: string | null | undefined): string {
  return sourceId && /^[a-z0-9:._-]+$/.test(sourceId) ? sourceId : "unattributed";
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
  insertBatch: (rows: NewOpportunity[]) => Promise<number>,
  rows: NewOpportunity[],
  now: string,
  channel: string,
): Promise<{ published: number; failed: boolean }> {
  const tickKey = publicationTickKey(channel, now);
  const grouped = new Map<string, NewOpportunity[]>();
  for (const row of rows) {
    const sourceId = canonicalPublicationSourceId(row.sourceId);
    const list = grouped.get(sourceId) ?? [];
    list.push(row);
    grouped.set(sourceId, list);
  }
  let published = 0;
  for (const [sourceId, group] of grouped) {
    const urls = group.map((row) => row.sourceUrl).sort().join("\n");
    const proposedCount = await canaryClampedProposal(publicationDb, sourceId, group.length);
    const result = await publishPublicExposure(publicationDb, {
      sourceId,
      now,
      tickKey,
      retryKey: `${tickKey}:${sourceId}:insert:${proposedCount}:${urls.slice(0, 200)}`,
      proposedCount,
      persist: async (allowed) => {
        const written = await insertBatch(group.slice(0, allowed));
        return { publishedCount: written, ids: [] };
      },
    });
    if (!result.ok) return { published, failed: true };
    published += result.publishedCount;
  }
  return { published, failed: false };
}

export async function publishGroupedActivations(
  publicationDb: PublicationDatabase,
  rows: Array<{ id: number; sourceId: string | null }>,
  now: string,
  channel: string,
  persistIds: (ids: number[]) => Promise<{ publishedCount: number; ids: number[] }>,
): Promise<{ published: number; failed: boolean }> {
  if (rows.length === 0) return { published: 0, failed: false };
  const tickKey = publicationTickKey(channel, now);
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const sourceId = canonicalPublicationSourceId(row.sourceId);
    const list = grouped.get(sourceId) ?? [];
    list.push(row.id);
    grouped.set(sourceId, list);
  }
  let published = 0;
  for (const [sourceId, ids] of grouped) {
    const ordered = [...ids].sort((a, b) => a - b);
    const proposedCount = await canaryClampedProposal(publicationDb, sourceId, ordered.length);
    const result = await publishPublicExposure(publicationDb, {
      sourceId,
      now,
      tickKey,
      retryKey: `${tickKey}:${sourceId}:activate:${ordered.join(",")}`,
      proposedCount,
      persist: async (allowed) => persistIds(ordered.slice(0, allowed)),
    });
    if (!result.ok) return { published, failed: true };
    published += result.publishedCount;
  }
  return { published, failed: false };
}
