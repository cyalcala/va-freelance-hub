import { opportunities, type NewOpportunity } from "@va-hub/db";
import { sha256Hex } from "@va-hub/scraper";
import { getTableColumns, is, SQL, sql } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type PublicationRetryAction = "insert" | "gate-recovery" | "feed-reactivation" | "scrape-drain" | "triage-drain";
const columnNames = Object.keys(getTableColumns(opportunities)).sort();
const columns = new Set(columnNames);
const dialect = new SQLiteSyncDialect();

/** Strict JSON: property order is irrelevant; array order and values are not. */
function canonicalJson(value: unknown, ancestors = new Set<object>()): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? "-0" : JSON.stringify(value);
  if (typeof value !== "object" || value === null) throw new Error("publication retry material must be finite plain JSON");
  if (ancestors.has(value)) throw new Error("publication retry material must not contain cycles");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      if (keys.length !== value.length + 1 || keys.some(key => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) {
        throw new Error("publication retry arrays must be dense with no extra properties");
      }
      return `[${Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor)) throw new Error("publication retry arrays must not contain accessors or hidden elements");
        return canonicalJson(descriptor.value, ancestors);
      }).join(",")}]`;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error("publication retry material must use plain objects");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).some(key => typeof key !== "string")) throw new Error("publication retry material must not contain symbol keys");
    return `{${Object.keys(descriptors).sort().map(key => {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("publication retry material must not contain accessors or hidden properties");
      return `${JSON.stringify(key)}:${canonicalJson(descriptor.value, ancestors)}`;
    }).join(",")}}`;
  } finally { ancestors.delete(value); }
}

function copyJson(value: unknown): Json {
  const copy = JSON.parse(canonicalJson(value)) as Json;
  const freeze = (item: Json): void => {
    if (item && typeof item === "object") {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
  };
  freeze(copy);
  return copy;
}

function checkedFields(row: object): Record<string, PropertyDescriptor> {
  if (!row || typeof row !== "object" || Array.isArray(row)
    || (Object.getPrototypeOf(row) !== Object.prototype && Object.getPrototypeOf(row) !== null)) {
    throw new Error("publication persistence projection requires a plain opportunity object");
  }
  const fields = Object.getOwnPropertyDescriptors(row);
  if (Reflect.ownKeys(row).some(key => typeof key !== "string" || !columns.has(key))) {
    throw new Error("publication persistence projection contains an unknown column");
  }
  for (const field of Object.values(fields)) {
    if (!field.enumerable || !("value" in field)) throw new Error("publication persistence projection must not contain accessors or hidden properties");
  }
  return fields;
}

/**
 * Same schema projection is hashed and passed to .values(). Absent/undefined
 * columns explicitly mean Drizzle's omitted/default behavior, not SQL NULL or
 * a prediction of a generated ID/time. Bump the key version if writer/default
 * semantics change without changing this projection.
 */
export function snapshotPublicationInserts(rows: NewOpportunity[]): { rows: NewOpportunity[]; material: Json } {
  const material: Json[] = [];
  const copiedRows = rows.map(row => {
    const fields = checkedFields(row);
    const copied: Record<string, Json> = Object.create(null);
    const values: Record<string, Json> = Object.create(null);
    for (const column of columnNames) {
      const value = fields[column]?.value;
      if (value === undefined) {
        values[column] = { state: "default" };
      } else {
        copied[column] = copyJson(value);
        values[column] = { state: "value", value: copied[column] };
      }
    }
    material.push(values);
    return Object.freeze(copied) as NewOpportunity;
  });
  return { rows: copiedRows, material };
}

/**
 * Update undefined means no assignment; NULL means an assignment to NULL.
 * Known internal SQL expressions are bound by exact compiled SQLite SQL and
 * params, never by JSON.stringify of Drizzle internals. The current internal
 * CASE has no parameters; copy it to detach the writer from its mutable SQL
 * input. Unsupported parameterized expressions fail before persistence.
 * Drizzle semantics: https://orm.drizzle.team/docs/update
 */
export function snapshotPublicationUpdate<T extends object>(patch: T): { patch: T; material: Json } {
  const fields = checkedFields(patch);
  const copied: Record<string, unknown> = Object.create(null);
  const material: Record<string, Json> = Object.create(null);
  for (const column of Object.keys(fields).sort()) {
    const value = fields[column].value;
    if (value === undefined) {
      material[column] = { state: "omitted" };
    } else if (is(value, SQL)) {
      const compiled = dialect.sqlToQuery(value);
      if (compiled.params.length !== 0) throw new Error("publication persistence projection does not support parameterized update SQL");
      material[column] = { state: "sql", sql: compiled.sql, params: copyJson(compiled.params) };
      copied[column] = sql.raw(compiled.sql);
    } else {
      copied[column] = copyJson(value);
      material[column] = { state: "value", value: copied[column] as Json };
    }
  }
  return { patch: Object.freeze(copied) as T, material };
}

/** Full SHA-256 over the complete server-owned write request; no legacy fallback. */
export async function publicationRetryKey(request: {
  sourceId: string;
  tickKey: string;
  action: PublicationRetryAction;
  proposedCount: number;
  material: unknown;
}): Promise<string> {
  if (typeof request.sourceId !== "string" || !/^[a-z0-9:._-]+$/.test(request.sourceId)
    || typeof request.tickKey !== "string" || !request.tickKey || request.tickKey.includes("\0")
    || !Number.isSafeInteger(request.proposedCount) || request.proposedCount < 0
    || typeof request.action !== "string"
    || !["insert", "gate-recovery", "feed-reactivation", "scrape-drain", "triage-drain"].includes(request.action)) {
    throw new Error("publication retry identity requires a valid source, tick, action and count");
  }
  // Existing Web Crypto helper is Workers-compatible. SHA-256 digest API:
  // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
  return `publication-retry-v1:${await sha256Hex(canonicalJson({ version: 1, sourceId: request.sourceId,
    tickKey: request.tickKey, action: request.action, proposedCount: request.proposedCount, material: request.material }))}`;
}
