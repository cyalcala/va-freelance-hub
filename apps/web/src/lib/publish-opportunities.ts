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
    const sourceId = row.sourceId && /^[a-z0-9:._-]+$/.test(row.sourceId) ? row.sourceId : "unattributed";
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
