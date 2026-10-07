import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { directoryVisibilityFilters } from "./directory-visibility";
import { publicDataErrorClass } from "./public-route-load";
import { publicOpportunityFilters } from "./public-opportunities";
import type { PublicBoard, PublicDirectoryRow, PublicJob } from "./public-board";
import { timestampMs } from "./public-board";
import { getDurableLkgSnapshot } from "./durable-lkg-snapshot";

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

export type SnapshotServingStatus =
  | "fresh"
  | "stale"
  | "lkg_fallback"
  | "degraded";

export type SnapshotHealthTelemetry = {
  status: SnapshotServingStatus;
  generatedAt: string | null;
  ageMs: number;
  jobCount: number;
  directoryCount: number;
  lastSource: "memory" | "edge" | "d1" | "durable_lkg";
  lastRefreshResult: "success" | "failed" | "rejected" | "none";
  lastRefreshError: string | null;
  lastPromotionAt: string | null;
  d1QuotaFailed: boolean;
};

type Slot = {
  activeBoard?: PublicBoard;
  activeSource?: "memory" | "edge" | "d1" | "durable_lkg";
  serveUntil: number;
  refresh?: Promise<void>;
  inflight?: Promise<PublicBoard>;
  lastPromotionAt?: string;
  lastRefreshResult?: "success" | "failed" | "rejected" | "none";
  lastRefreshError?: string | null;
  d1QuotaFailed: boolean;
};

const slot: Slot = {
  serveUntil: 0,
  lastRefreshResult: "none",
  lastRefreshError: null,
  d1QuotaFailed: false,
};

export function resetPublicBoardState(): void {
  slot.activeBoard = undefined;
  slot.activeSource = undefined;
  slot.serveUntil = 0;
  slot.refresh = undefined;
  slot.inflight = undefined;
  slot.lastPromotionAt = undefined;
  slot.lastRefreshResult = "none";
  slot.lastRefreshError = null;
  slot.d1QuotaFailed = false;
}

export type SnapshotValidationResult =
  | { ok: true; board: PublicBoard }
  | { ok: false; reason: string };

/**
 * Phase 4 Snapshot Validation.
 * Validates candidate schema, required fields, and integrity bounds before promotion.
 */
export function validateSnapshotCandidate(
  candidate: unknown,
  activeBoard?: PublicBoard | null,
): SnapshotValidationResult {
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, reason: "Candidate is not an object" };
  }

  const c = candidate as Partial<PublicBoard>;

  if (typeof c.generatedAt !== "string" || !c.generatedAt.trim()) {
    return { ok: false, reason: "Missing or invalid generatedAt timestamp" };
  }

  const parsedDate = Date.parse(c.generatedAt);
  if (!Number.isFinite(parsedDate) || parsedDate <= 0) {
    return { ok: false, reason: "Unparseable generatedAt ISO timestamp" };
  }

  if (!Array.isArray(c.jobs)) {
    return { ok: false, reason: "jobs property must be an array" };
  }

  if (!Array.isArray(c.directory)) {
    return { ok: false, reason: "directory property must be an array" };
  }

  // Validate job items
  for (let i = 0; i < c.jobs.length; i++) {
    const job = c.jobs[i];
    if (!job || typeof job !== "object") {
      return { ok: false, reason: `Job at index ${i} is not an object` };
    }
    if (!Number.isSafeInteger(job.id) || job.id <= 0) {
      return { ok: false, reason: `Job at index ${i} has invalid id: ${job.id}` };
    }
    if (typeof job.title !== "string" || !job.title.trim()) {
      return { ok: false, reason: `Job at index ${i} is missing title` };
    }
    if (typeof job.sourceUrl !== "string" || !job.sourceUrl.trim()) {
      return { ok: false, reason: `Job at index ${i} is missing sourceUrl` };
    }
    if (typeof job.sourcePlatform !== "string" || !job.sourcePlatform.trim()) {
      return { ok: false, reason: `Job at index ${i} is missing sourcePlatform` };
    }
    if (typeof job.category !== "string" || !job.category.trim()) {
      return { ok: false, reason: `Job at index ${i} is missing category` };
    }
  }

  // Validate directory items
  for (let i = 0; i < c.directory.length; i++) {
    const row = c.directory[i];
    if (!row || typeof row !== "object") {
      return { ok: false, reason: `Directory row at index ${i} is not an object` };
    }
    if (!Number.isSafeInteger(row.id) || row.id <= 0) {
      return { ok: false, reason: `Directory row at index ${i} has invalid id: ${row.id}` };
    }
    if (typeof row.companyName !== "string" || !row.companyName.trim()) {
      return { ok: false, reason: `Directory row at index ${i} is missing companyName` };
    }
  }

  // Anti-collapse sanity check: do not allow unexpected collapse of active listings
  if (activeBoard && activeBoard.jobs.length >= 1) {
    const activeCount = activeBoard.jobs.length;
    if (c.jobs.length === 0) {
      return {
        ok: false,
        reason: `Unexpected empty candidate: 0 jobs vs ${activeCount} active jobs`,
      };
    }
    if (activeCount >= 20 && c.jobs.length < Math.floor(activeCount * 0.1)) {
      return {
        ok: false,
        reason: `Suspicious job count collapse: ${c.jobs.length} candidate jobs vs ${activeCount} active jobs`,
      };
    }
  } else if (c.jobs.length === 0 && c.directory.length === 0) {
    return {
      ok: false,
      reason: "Candidate snapshot has 0 jobs and 0 directory entries",
    };
  }

  return { ok: true, board: candidate as PublicBoard };
}

/**
 * Atomically promotes a candidate snapshot if valid, without destructively
 * mutating the currently served active board on validation failure.
 */
export function promoteSnapshot(
  candidate: PublicBoard,
  source: "memory" | "edge" | "d1" | "durable_lkg",
  now: number,
): boolean {
  const validation = validateSnapshotCandidate(candidate, slot.activeBoard);
  if (!validation.ok) {
    console.warn(`[public-snapshot] candidate from ${source} rejected: ${validation.reason}`);
    slot.lastRefreshResult = "rejected";
    slot.lastRefreshError = validation.reason;
    return false;
  }

  slot.activeBoard = validation.board;
  slot.activeSource = source;
  slot.serveUntil = now + FRESH_MS;
  slot.lastPromotionAt = new Date(now).toISOString();
  slot.lastRefreshResult = "success";
  slot.lastRefreshError = null;
  return true;
}

export function applySnapshotHeaders(headers: Headers, now = Date.now()): void {
  const health = getPublicSnapshotHealth(now);
  headers.set("X-Public-Snapshot", health.status);
  headers.set("X-Public-Snapshot-Jobs", String(health.jobCount));
  headers.set("X-Public-Snapshot-Source", health.lastSource);
}

export function getPublicSnapshotHealth(now = Date.now()): SnapshotHealthTelemetry {
  const board = slot.activeBoard;
  const generatedMs = board ? timestampMs(board.generatedAt) : 0;
  const ageMs = generatedMs ? Math.max(0, now - generatedMs) : 0;
  const isStale = ageMs > REBUILD_AFTER_MS;

  let status: SnapshotServingStatus;
  if (!board) {
    status = "degraded";
  } else if (slot.activeSource === "durable_lkg") {
    status = "lkg_fallback";
  } else if (isStale) {
    status = "stale";
  } else {
    status = "fresh";
  }

  return {
    status,
    generatedAt: board?.generatedAt ?? null,
    ageMs,
    jobCount: board?.jobs.length ?? 0,
    directoryCount: board?.directory.length ?? 0,
    lastSource: slot.activeSource ?? (board ? "memory" : "durable_lkg"),
    lastRefreshResult: slot.lastRefreshResult ?? "none",
    lastRefreshError: slot.lastRefreshError ?? null,
    lastPromotionAt: slot.lastPromotionAt ?? null,
    d1QuotaFailed: slot.d1QuotaFailed,
  };
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

function mapJob(row: Record<string, unknown> | unknown[]): PublicJob {
  if (Array.isArray(row)) {
    const id = Number(row[0]);
    return {
      id,
      title: asText(row[1]) && isNaN(Date.parse(String(row[1]))) ? asText(row[1])! : `Opportunity #${id}`,
      company: asText(row[2]),
      type: oneOf(asText(row[3]), ["VA", "freelance", "project", "full-time", "part-time"] as const, "freelance") ?? "freelance",
      sourceUrl: asText(row[4]) ?? `https://remotejobs-ph.pages.dev/jobs/${id}`,
      sourcePlatform: asText(row[5]) ?? "Job Board",
      sourceId: asText(row[6]),
      tags: asTags(row[7]),
      category: asText(row[8]) ?? "other",
      experienceLevel: oneOf(asText(row[9]), ["entry", "mid", "senior", "any"] as const, null),
      postedAt: asText(row[10]),
      scrapedAt: asText(row[11]),
      geoScope: oneOf(asText(row[12]), ["worldwide", "apac_incl_ph", "ph_only", "region_excl_ph", "country_locked", "unknown"] as const, null),
      phEligibility: oneOf(asText(row[13]), ["eligible_verified", "eligible_likely", "unclear", "ineligible"] as const, null),
      geoEvidence: asText(row[14]),
      description: asText(row[15]),
      clientTimezone: asText(row[16]),
      locationType: oneOf(asText(row[17]), ["remote", "hybrid", "onsite"] as const, null),
      payRange: asText(row[18]),
      updatedAt: asText(row.length === 2 ? row[1] : (row[19] ?? row[1])),
    };
  }
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

function mapDirectory(row: Record<string, unknown> | unknown[]): PublicDirectoryRow {
  if (Array.isArray(row)) {
    return {
      id: Number(row[0]),
      companyName: asText(row[1]) ?? "",
      website: asText(row[2]),
      niche: asText(row[3]) ?? "global-va",
      isDayshift: asBool(row[4]),
      isVerified: asBool(row[5]),
      isRemote: asBool(row[6]),
      isMarketplace: asBool(row[7]),
    };
  }
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
      const res = await db.prepare(READ_SNAPSHOT_SQL).bind().first<StoredSnapshot | { results?: unknown[] } | unknown[]>();
      if (!res) return null;
      const row = (res && typeof res === "object" && "results" in res && Array.isArray((res as any).results))
        ? (res as any).results[0]
        : res;
      if (!row) return null;
      if (Array.isArray(row)) {
        if (!row[1] || typeof row[1] !== "string" || (!String(row[1]).includes("{") && !String(row[1]).startsWith("gz:"))) {
          return null;
        }
        return { generatedAt: String(row[0]), payload: String(row[1]) };
      }
      if (typeof row === "object" && "payload" in row && typeof (row as any).payload === "string") {
        return { generatedAt: String((row as any).generatedAt), payload: (row as any).payload };
      }
      return null;
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
    const text = await match.text();
    return unpackBoard({ generatedAt, payload: text });
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
    // A cache write failure leaves active board in place
  }
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function schedule(work: () => Promise<void>, waitUntil?: (promise: Promise<unknown>) => void): void {
  if (slot.refresh) return;
  const pending = work().catch((err) => {
    slot.lastRefreshResult = "failed";
    slot.lastRefreshError = err instanceof Error ? err.message : String(err);
    console.error("public snapshot background refresh failed", publicDataErrorClass(err) ?? "Error");
  }).finally(() => {
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
    const errClass = publicDataErrorClass(error);
    if (errClass === "d1_quota" || errClass === "d1_busy") {
      slot.d1QuotaFailed = true;
    }
    slot.lastRefreshResult = "failed";
    slot.lastRefreshError = error instanceof Error ? error.message : String(error);
    console.error("public snapshot read failed during refresh", errClass ?? "Error");
    return;
  }

  if (stored?.payload && Date.parse(stored.generatedAt) + REBUILD_AFTER_MS > now) {
    try {
      const board = await unpackBoard(stored);
      if (promoteSnapshot(board, "d1", now)) {
        writeEdge(cache, board).catch(() => {});
      }
    } catch (unpackErr) {
      console.error("public snapshot unpack failed during refresh", unpackErr);
    }
    return;
  }

  let claimed = false;
  try {
    claimed = await store.claimRefresh(iso(now), iso(now - REBUILD_AFTER_MS), iso(now - LEASE_MS));
  } catch (error) {
    const errClass = publicDataErrorClass(error);
    if (errClass === "d1_quota" || errClass === "d1_busy") {
      slot.d1QuotaFailed = true;
    }
    slot.lastRefreshResult = "failed";
    slot.lastRefreshError = error instanceof Error ? error.message : String(error);
    console.error("public snapshot lease failed", errClass ?? "Error");
    return;
  }

  if (!claimed) {
    if (!stored?.payload) return;
    try {
      const board = await unpackBoard(stored);
      if (promoteSnapshot(board, "d1", now)) {
        writeEdge(cache, board).catch(() => {});
      }
    } catch {
      // Discard unparseable stored snapshot without replacing active board
    }
    return;
  }

  const generatedAt = iso(now);
  let candidate: PublicBoard | null = null;
  try {
    candidate = await store.build(generatedAt);
  } catch (error) {
    const errClass = publicDataErrorClass(error);
    if (errClass === "d1_quota" || errClass === "d1_busy") {
      slot.d1QuotaFailed = true;
    }
    slot.lastRefreshResult = "failed";
    slot.lastRefreshError = error instanceof Error ? error.message : String(error);
    console.error("public snapshot build failed during refresh", errClass ?? "Error");
    return;
  }

  // Atomically promote candidate only if valid
  if (candidate && promoteSnapshot(candidate, "d1", now)) {
    writeEdge(cache, candidate).catch(() => {});
    try {
      await store.write(generatedAt, await packBoard(candidate));
    } catch (error) {
      console.error("public snapshot write failed", publicDataErrorClass(error) ?? "Error");
    }
  }
}

async function loadCold(
  store: SnapshotStore,
  cache: EdgeCache | null,
  now: number,
  waitUntil?: (promise: Promise<unknown>) => void,
  allowLkgFallback = true,
): Promise<PublicBoard> {
  let readError: unknown = null;
  let stored: StoredSnapshot | null = null;

  try {
    stored = await store.read();
    if (stored?.payload) {
      const candidate = await unpackBoard(stored);
      if (promoteSnapshot(candidate, "d1", now)) {
        writeEdge(cache, candidate).catch(() => {});
        if (Date.parse(candidate.generatedAt) + REBUILD_AFTER_MS <= now) {
          schedule(() => refreshStored(store, cache, now), waitUntil);
        }
        return slot.activeBoard!;
      }
    }
  } catch (error) {
    readError = error;
    const errClass = publicDataErrorClass(error);
    if (errClass === "d1_quota" || errClass === "d1_busy") {
      slot.d1QuotaFailed = true;
    }
    console.error("public snapshot read failed", errClass ?? "Error");
  }

  const readClass = publicDataErrorClass(readError);

  // If D1 did not hit quota or lock limits, attempt rebuilding from source tables
  if (readClass !== "d1_quota" && readClass !== "d1_busy") {
    try {
      const generatedAt = iso(now);
      const candidate = await store.build(generatedAt);
      if (promoteSnapshot(candidate, "d1", now)) {
        writeEdge(cache, candidate).catch(() => {});
        packBoard(candidate)
          .then((packed) => store.write(generatedAt, packed))
          .catch((writeErr) => {
            console.error("public snapshot write failed", publicDataErrorClass(writeErr) ?? "Error");
          });
        return slot.activeBoard!;
      }
    } catch (buildErr) {
      console.error("public snapshot build failed", publicDataErrorClass(buildErr) ?? "Error");
      if (!readError) readError = buildErr;
    }
  }

  // Fall back to Durable Last-Known-Good snapshot
  if (allowLkgFallback) {
    const lkg = getDurableLkgSnapshot();
    if (promoteSnapshot(lkg, "durable_lkg", now)) {
      writeEdge(cache, lkg).catch(() => {});
      return slot.activeBoard!;
    }
  }

  // If fallback is disabled and readError occurred, propagate error
  if (readError) throw readError;
  throw new Error("Unable to load or reconstruct public serving snapshot");
}

export async function resolvePublicBoard(options: {
  now: number;
  cache: EdgeCache | null;
  store: SnapshotStore;
  waitUntil?: (promise: Promise<unknown>) => void;
  allowLkgFallback?: boolean;
}): Promise<PublicBoard> {
  const { now, cache, store, waitUntil, allowLkgFallback = true } = options;

  // 1. In-memory warm hit (0ms, 0 D1 reads)
  if (slot.activeBoard && now < slot.serveUntil) {
    return slot.activeBoard;
  }

  // 2. Edge cache hit
  const edge = await readEdge(cache);
  if (edge) {
    if (promoteSnapshot(edge, "edge", now)) {
      if (Date.parse(edge.generatedAt) + FRESH_MS <= now) {
        schedule(() => refreshStored(store, cache, now), waitUntil);
      }
      return slot.activeBoard!;
    }
  }

  // 3. Stale in-memory board (TTL means "refresh this data", NOT "delete usable data")
  if (slot.activeBoard) {
    slot.serveUntil = now + FRESH_MS;
    schedule(() => refreshStored(store, cache, now), waitUntil);
    return slot.activeBoard;
  }

  // 4. Inflight deduplication
  if (slot.inflight) return slot.inflight;

  // 5. Cold isolate initialization
  const pending = loadCold(store, cache, now, waitUntil, allowLkgFallback).finally(() => {
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
 * If D1 is unavailable or exhausted, the durable LKG snapshot is served.
 */
const offlineStore: SnapshotStore = {
  async read() {
    throw new Error("Cloudflare D1 binding (env.DB) is required.");
  },
  async claimRefresh() {
    throw new Error("Cloudflare D1 binding (env.DB) is required.");
  },
  async write() {
    throw new Error("Cloudflare D1 binding (env.DB) is required.");
  },
  async build() {
    throw new Error("Cloudflare D1 binding (env.DB) is required.");
  },
};

export function loadPublicBoard(
  env: { DB?: SnapshotDatabase } | undefined,
  ctx?: { waitUntil?: (promise: Promise<unknown>) => void },
  now = Date.now(),
  options?: { allowLkgFallback?: boolean },
): Promise<PublicBoard> {
  return resolvePublicBoard({
    now,
    cache: runtimeCache(),
    store: env?.DB ? createD1SnapshotStore(env.DB) : offlineStore,
    waitUntil: ctx?.waitUntil?.bind(ctx),
    allowLkgFallback: options?.allowLkgFallback ?? true,
  });
}
