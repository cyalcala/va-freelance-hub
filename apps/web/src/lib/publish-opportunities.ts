import type { NewOpportunity } from "@va-hub/db";
import {
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
    const result = await publishPublicExposure(publicationDb, {
      sourceId,
      now,
      tickKey,
      retryKey: `${tickKey}:${sourceId}:insert:${urls.length}:${urls.slice(0, 200)}`,
      proposedCount: group.length,
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
    const result = await publishPublicExposure(publicationDb, {
      sourceId,
      now,
      tickKey,
      retryKey: `${tickKey}:${sourceId}:activate:${ordered.join(",")}`,
      proposedCount: ordered.length,
      persist: async (allowed) => persistIds(ordered.slice(0, allowed)),
    });
    if (!result.ok) return { published, failed: true };
    published += result.publishedCount;
  }
  return { published, failed: false };
}
