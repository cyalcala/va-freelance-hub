import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { directoryVisibilityFilters } from "./directory-visibility";
import { publicDataErrorClass } from "./public-route-load";
import { publicOpportunityFilters } from "./public-opportunities";
import type { PublicBoard, PublicDirectoryRow, PublicJob } from "./public-board";

const FRESH_MS = 15 * 60 * 1000;
const REBUILD_AFTER_MS = 60 * 60 * 1000;
const LEASE_MS = 10 * 60 * 1000;
const MAX_PAYLOAD_CHARS = 900_000;
const CACHE_URL = "https://remotejobs-ph.pages.dev/__snapshot/public-board-v1";

const dialect = new SQLiteSyncDialect();

export const CLAIM_REFRESH_SQL = `UPDATE public_serving_snapshot
SET refresh_started_at = ?
WHERE id = 1
  AND generated_at < ?
  AND (refresh_started_at IS NULL OR refresh_started_at < ?)`;

export const READ_SNAPSHOT_SQL = `SELECT generated_at AS generatedAt, payload
FROM public_serving_snapshot WHERE id = 1`;

export const WRITE_SNAPSHOT_SQL = `INSERT INTO public_serving_snapshot
  (id, generated_at, refresh_started_at, payload)
VALUES (1, ?, NULL, ?)
ON CONFLICT(id) DO UPDATE SET
  generated_at = excluded.generated_at,
  refresh_started_at = NULL,
  payload = excluded.payload`;

type SqlQuery = { sql: string; params: unknown[] };

export function opportunitySnapshotQuery(): SqlQuery {
  const where = dialect.sqlToQuery(publicOpportunityFilters());
  return {
    sql: `SELECT
      id, title, company, type,
      source_url AS sourceUrl,
      source_platform AS sourcePlatform,
      source_id AS sourceId,
      tags, category,
      experience_level AS experienceLevel,
      posted_at AS postedAt,
      scraped_at AS scrapedAt,
      geo_scope AS geoScope,
      ph_eligibility AS phEligibility,
      geo_evidence AS geoEvidence,
      substr(description, 1, 2000) AS description,
      client_timezone AS clientTimezone,
      location_type AS locationType,
      pay_range AS payRange,
      coalesce(updated_at, posted_at, scraped_at) AS updatedAt
    FROM opportunities
    WHERE ${where.sql}`,
    params: where.params,
  };
}

export function directorySnapshotQuery(): SqlQuery {
  const where = dialect.sqlToQuery(directoryVisibilityFilters());
  return {
    sql: `SELECT
      id,
      company_name AS companyName,
      website, niche,
      is_dayshift AS isDayshift,
      is_verified AS isVerified,
      is_remote AS isRemote,
      is_marketplace AS isMarketplace
    FROM va_directory
    WHERE ${where.sql}`,
    params: where.params,
  };
}

type StatementResult = {
  results?: Record<string, unknown>[];
  meta?: { changes?: number };
  changes?: number;
};

type BoundStatement = {
  all(): Promise<StatementResult | Record<string, unknown>[]>;
  first<T>(): Promise<T | null>;
  run(): Promise<StatementResult>;
};

type Prepared = { bind(...params: unknown[]): BoundStatement };

export type SnapshotDatabase = { prepare(sql: string): Prepared };

export type StoredSnapshot = { generatedAt: string; payload: string };

export type SnapshotStore = {
  read(): Promise<StoredSnapshot | null>;
  claimRefresh(nowIso: string, staleBeforeIso: string, leaseExpiredBeforeIso: string): Promise<boolean>;
  write(generatedAt: string, payload: string): Promise<void>;
  build(generatedAt: string): Promise<PublicBoard>;
};

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

type Slot = {
  board?: PublicBoard;
  serveUntil: number;
  refresh?: Promise<void>;
  inflight?: Promise<PublicBoard>;
};

const slot: Slot = { serveUntil: 0 };

export function resetPublicBoardState(): void {
  slot.board = undefined;
  slot.serveUntil = 0;
  slot.refresh = undefined;
  slot.inflight = undefined;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return value == null ? null : String(value);
  return value;
}

function asTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T | null): T | null {
  return value && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

function mapJob(row: Record<string, unknown>): PublicJob {
  return {
    id: Number(row.id),
    title: asText(row.title) ?? "",
    company: asText(row.company),
    type: oneOf(asText(row.type), ["VA", "freelance", "project", "full-time", "part-time"] as const, "freelance") ?? "freelance",
    sourceUrl: asText(row.sourceUrl) ?? "",
    sourcePlatform: asText(row.sourcePlatform) ?? "",
    sourceId: asText(row.sourceId),
    tags: asTags(row.tags),
    category: asText(row.category) ?? "other",
    experienceLevel: oneOf(asText(row.experienceLevel), ["entry", "mid", "senior", "any"] as const, null),
    postedAt: asText(row.postedAt),
    scrapedAt: asText(row.scrapedAt),
    geoScope: oneOf(asText(row.geoScope), ["worldwide", "apac_incl_ph", "ph_only", "region_excl_ph", "country_locked", "unknown"] as const, null),
    phEligibility: oneOf(asText(row.phEligibility), ["eligible_verified", "eligible_likely", "unclear", "ineligible"] as const, null),
    geoEvidence: asText(row.geoEvidence),
    description: asText(row.description),
    clientTimezone: asText(row.clientTimezone),
    locationType: oneOf(asText(row.locationType), ["remote", "hybrid", "onsite"] as const, null),
    payRange: asText(row.payRange),
    updatedAt: asText(row.updatedAt),
  };
}

function mapDirectory(row: Record<string, unknown>): PublicDirectoryRow {
  return {
    id: Number(row.id),
    companyName: asText(row.companyName) ?? "",
    website: asText(row.website),
    niche: asText(row.niche) ?? "global-va",
    isDayshift: asBool(row.isDayshift),
    isVerified: asBool(row.isVerified),
    isRemote: asBool(row.isRemote),
    isMarketplace: asBool(row.isMarketplace),
  };
}

async function allRows(db: SnapshotDatabase, query: SqlQuery): Promise<Record<string, unknown>[]> {
  const result = await db.prepare(query.sql).bind(...query.params).all();
  if (Array.isArray(result)) return result;
  return result.results ?? [];
}

export async function queryPublicBoard(
  db: SnapshotDatabase,
  generatedAt: string,
): Promise<PublicBoard> {
  const [jobRows, directoryRows] = await Promise.all([
    allRows(db, opportunitySnapshotQuery()),
    allRows(db, directorySnapshotQuery()),
  ]);
  return {
    generatedAt,
    jobs: jobRows.map(mapJob).filter((job) => Number.isSafeInteger(job.id)),
    directory: directoryRows.map(mapDirectory).filter((row) => Number.isSafeInteger(row.id)),
  };
}

function withoutDescriptions(board: PublicBoard): PublicBoard {
  return {
    ...board,
    jobs: board.jobs.map((job) => ({ ...job, description: null })),
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function blobFromBytes(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy]);
}

async function gzipJson(value: string): Promise<string> {
  const stream = blobFromBytes(new TextEncoder().encode(value)).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return `gz:${bytesToBase64(bytes)}`;
}

async function gunzipJson(payload: string): Promise<string> {
  if (!payload.startsWith("gz:")) return payload;
  const stream = blobFromBytes(base64ToBytes(payload.slice(3))).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

export async function packBoard(board: PublicBoard): Promise<string> {
  let payload = await gzipJson(JSON.stringify(board));
  if (payload.length <= MAX_PAYLOAD_CHARS) return payload;
  payload = await gzipJson(JSON.stringify(withoutDescriptions(board)));
  if (payload.length <= MAX_PAYLOAD_CHARS) return payload;
  throw new Error("public snapshot payload exceeds the storage ceiling");
}

export async function unpackBoard(stored: StoredSnapshot): Promise<PublicBoard> {
  const parsed = JSON.parse(await gunzipJson(stored.payload)) as PublicBoard;
  return { ...parsed, generatedAt: stored.generatedAt };
}

function changesOf(result: StatementResult): number {
  return result.meta?.changes ?? result.changes ?? 0;
}

export function createD1SnapshotStore(db: SnapshotDatabase): SnapshotStore {
  return {
    async read() {
      const row = await db.prepare(READ_SNAPSHOT_SQL).bind().first<StoredSnapshot>();
      if (!row?.payload) return null;
      return { generatedAt: row.generatedAt, payload: row.payload };
    },
    async claimRefresh(nowIso, staleBeforeIso, leaseExpiredBeforeIso) {
      const result = await db.prepare(CLAIM_REFRESH_SQL).bind(nowIso, staleBeforeIso, leaseExpiredBeforeIso).run();
      return changesOf(result) > 0;
    },
    async write(generatedAt, payload) {
      await db.prepare(WRITE_SNAPSHOT_SQL).bind(generatedAt, payload).run();
    },
    build(generatedAt) {
      return queryPublicBoard(db, generatedAt);
    },
  };
}

function cacheRequest(): Request {
  return new Request(CACHE_URL, { method: "GET" });
}

async function readEdge(cache: EdgeCache | null): Promise<PublicBoard | null> {
  if (!cache) return null;
  try {
    const match = await cache.match(cacheRequest());
    if (!match) return null;
    const generatedAt = match.headers.get("x-snapshot-generated-at");
    if (!generatedAt) return null;
    return unpackBoard({ generatedAt, payload: await match.text() });
  } catch {
    return null;
  }
}

async function writeEdge(cache: EdgeCache | null, board: PublicBoard): Promise<void> {
  if (!cache) return;
  try {
    const payload = await packBoard(board);
    await cache.put(cacheRequest(), new Response(payload, {
      headers: {
        "cache-control": "public, max-age=86400",
        "content-type": "application/json",
        "x-snapshot-generated-at": board.generatedAt,
      },
    }));
  } catch {
    // A cache write failure still leaves the in-memory board in place.
  }
}

function hold(board: PublicBoard, now: number): void {
  slot.board = board;
  slot.serveUntil = now + FRESH_MS;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function schedule(work: () => Promise<void>, waitUntil?: (promise: Promise<unknown>) => void): void {
  if (slot.refresh) return;
  const pending = work().finally(() => {
    if (slot.refresh === pending) slot.refresh = undefined;
  });
  slot.refresh = pending;
  if (waitUntil) waitUntil(pending);
}

async function refreshStored(
  store: SnapshotStore,
  cache: EdgeCache | null,
  now: number,
): Promise<void> {
  let stored: StoredSnapshot | null = null;
  try {
    stored = await store.read();
  } catch (error) {
    console.error("public snapshot read failed", publicDataErrorClass(error) ?? "Error");
    return;
  }

  if (stored && Date.parse(stored.generatedAt) + REBUILD_AFTER_MS > now) {
    const board = await unpackBoard(stored);
    hold(board, now);
    await writeEdge(cache, board);
    return;
  }

  let claimed = false;
  try {
    claimed = await store.claimRefresh(iso(now), iso(now - REBUILD_AFTER_MS), iso(now - LEASE_MS));
  } catch (error) {
    console.error("public snapshot lease failed", publicDataErrorClass(error) ?? "Error");
    return;
  }

  if (!claimed) {
    if (!stored) return;
    const board = await unpackBoard(stored);
    hold(board, now);
    await writeEdge(cache, board);
    return;
  }

  const generatedAt = iso(now);
  const board = await store.build(generatedAt);
  hold(board, now);
  await writeEdge(cache, board);
  try {
    await store.write(generatedAt, await packBoard(board));
  } catch (error) {
    console.error("public snapshot write failed", publicDataErrorClass(error) ?? "Error");
  }
}

async function loadCold(
  store: SnapshotStore,
  cache: EdgeCache | null,
  now: number,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<PublicBoard> {
  let readError: unknown = null;
  try {
    const stored = await store.read();
    if (stored) {
      const board = await unpackBoard(stored);
      hold(board, now);
      await writeEdge(cache, board);
      if (Date.parse(stored.generatedAt) + REBUILD_AFTER_MS <= now) {
        schedule(() => refreshStored(store, cache, now), waitUntil);
      }
      return board;
    }
  } catch (error) {
    readError = error;
    console.error("public snapshot read failed", publicDataErrorClass(error) ?? "Error");
  }
  const readClass = publicDataErrorClass(readError);
  if (readClass === "d1_quota" || readClass === "d1_busy") throw readError;

  const generatedAt = iso(now);
  const board = await store.build(generatedAt);
  hold(board, now);
  await writeEdge(cache, board);
  try {
    await store.write(generatedAt, await packBoard(board));
  } catch (error) {
    console.error("public snapshot write failed", publicDataErrorClass(error) ?? "Error");
  }
  return board;
}

export async function resolvePublicBoard(options: {
  now: number;
  cache: EdgeCache | null;
  store: SnapshotStore;
  waitUntil?: (promise: Promise<unknown>) => void;
}): Promise<PublicBoard> {
  const { now, cache, store, waitUntil } = options;
  if (slot.board && now < slot.serveUntil) return slot.board;

  const edge = await readEdge(cache);
  if (edge) {
    hold(edge, now);
    if (Date.parse(edge.generatedAt) + FRESH_MS <= now) {
      schedule(() => refreshStored(store, cache, now), waitUntil);
    }
    return edge;
  }

  if (slot.board) {
    hold(slot.board, now);
    schedule(() => refreshStored(store, cache, now), waitUntil);
    return slot.board;
  }

  if (slot.inflight) return slot.inflight;
  const pending = loadCold(store, cache, now, waitUntil).finally(() => {
    if (slot.inflight === pending) slot.inflight = undefined;
  });
  slot.inflight = pending;
  return pending;
}

function runtimeCache(): EdgeCache | null {
  try {
    if (typeof caches === "undefined") return null;
    const cache = (caches as { default?: EdgeCache }).default;
    return cache ?? null;
  } catch {
    return null;
  }
}

/**
 * Public pages call this instead of scanning D1. A warm isolate or edge copy
 * returns immediately. The opportunities table is read only while rebuilding
 * the single snapshot row, at most once per hour globally.
 */
export function loadPublicBoard(
  env: { DB?: SnapshotDatabase } | undefined,
  ctx?: { waitUntil?: (promise: Promise<unknown>) => void },
  now = Date.now(),
): Promise<PublicBoard> {
  if (!env?.DB) throw new Error("Cloudflare D1 binding (env.DB) is required.");
  return resolvePublicBoard({
    now,
    cache: runtimeCache(),
    store: createD1SnapshotStore(env.DB),
    waitUntil: ctx?.waitUntil?.bind(ctx),
  });
}
