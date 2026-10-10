import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDb, opportunities } from "@va-hub/db";
import { publicOpportunityFilters } from "../../src/lib/public-opportunities";
import { withdrawInvalidPublicDrift } from "../../src/lib/publication-drift-withdrawal";
import { createClickHandler } from "../../src/pages/api/click/[id]";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
const BOUNDARY = "2026-09-10T12:00:00.000Z";
const STALE = "2026-09-09T12:00:00.000Z";
const DRIFT_STALE = "2026-09-08T12:00:00.000Z";
const FUTURE = "2026-10-10T12:00:00.001Z";
const IMPOSSIBLE = "2026-09-31T12:00:00.000Z";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

type Seed = {
  label: string;
  locationType: "remote" | "hybrid" | "onsite" | null;
  postedAt: string | null;
  eligibility: "eligible_verified" | "eligible_likely" | "unclear" | "ineligible";
  active?: number;
  inactiveReason?: string | null;
};

const seeds: Seed[] = [
  { label: "retain-fresh", locationType: "remote", postedAt: FRESH, eligibility: "eligible_verified" },
  { label: "retain-boundary", locationType: "remote", postedAt: BOUNDARY, eligibility: "eligible_likely" },
  { label: "retain-null-workplace", locationType: null, postedAt: FRESH, eligibility: "eligible_likely" },
  { label: "retain-missing-date", locationType: "remote", postedAt: null, eligibility: "eligible_likely" },
  { label: "retain-unclear-onsite", locationType: "onsite", postedAt: FRESH, eligibility: "unclear" },
  { label: "retain-ineligible-stale", locationType: "remote", postedAt: STALE, eligibility: "ineligible" },
  { label: "withdraw-onsite", locationType: "onsite", postedAt: FRESH, eligibility: "eligible_likely" },
  { label: "withdraw-hybrid", locationType: "hybrid", postedAt: FRESH, eligibility: "eligible_verified" },
  { label: "withdraw-stale", locationType: "remote", postedAt: STALE, eligibility: "eligible_likely" },
  { label: "withdraw-future", locationType: "remote", postedAt: FUTURE, eligibility: "eligible_likely" },
  { label: "withdraw-invalid", locationType: "remote", postedAt: IMPOSSIBLE, eligibility: "eligible_likely" },
  { label: "retain-repaired-date", locationType: "remote", postedAt: DRIFT_STALE, eligibility: "eligible_likely" },
  { label: "retain-already-inactive", locationType: "onsite", postedAt: FRESH, eligibility: "eligible_likely", active: 0, inactiveReason: "stale-feed" },
];

setSystemTime(new Date(REFERENCE));
globalThis.fetch = (() => {
  throw new Error("publication drift fixture rejects every network request");
}) as unknown as typeof fetch;

const sqlite = new Database(":memory:");
try {
  const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
  for (const name of readdirSync(migrations).filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort()) {
    sqlite.exec(readFileSync(join(migrations, name), "utf8"));
  }
  sqlite.exec("DELETE FROM opportunities;");
  const insert = sqlite.query(`INSERT INTO opportunities (
    title, company, type, source_url, source_platform, source_id, content_hash, category,
    location_type, description, posted_at, scraped_at, is_active, ph_eligibility, inactive_reason, updated_at, location_raw
  ) VALUES (?, 'Drift Co', 'freelance', ?, 'Native', 'remotive', ?, 'support', ?, 'Remote role open to applicants in the Philippines.', ?, ?, ?, ?, ?, ?, 'Remote')`);
  seeds.forEach((seed) => {
    const sourceUrl = `https://remotive.com/remote-jobs/customer-support/${seed.label}`;
    insert.run(
      seed.label,
      sourceUrl,
      sha256(sourceUrl),
      seed.locationType,
      seed.postedAt,
      REFERENCE,
      seed.active ?? 1,
      seed.eligibility,
      seed.inactiveReason ?? null,
      REFERENCE,
    );
  });

  let driftMutations = 0;
  const binding = { prepare(query: string) {
    const statement = sqlite.query(query);
    let params: unknown[] = [];
    const repairBeforeWrite = () => {
      if (!/^update\s+"opportunities"/i.test(query) || !params.includes(DRIFT_STALE)) return;
      const pending = sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE posted_at = ?").get(DRIFT_STALE) as { n: number };
      if (pending.n !== 1) return;
      driftMutations += 1;
      sqlite.query("UPDATE opportunities SET posted_at = ? WHERE posted_at = ?").run(FRESH, DRIFT_STALE);
    };
    return {
      bind(...values: unknown[]) { params = values; return this; },
      async first() { return statement.get(...(params as never[])); },
      async all() { repairBeforeWrite(); return { results: statement.all(...(params as never[])) }; },
      async raw() { repairBeforeWrite(); return statement.values(...(params as never[])); },
      async run() {
        repairBeforeWrite();
        const result = statement.run(...(params as never[]));
        return { success: true, meta: { changes: result.changes } };
      },
    };
  } };
  const db = getDb({ DB: binding as never });
  const aborted = await withdrawInvalidPublicDrift(db, "not-a-date");
  const first = await withdrawInvalidPublicDrift(db, REFERENCE);
  const second = await withdrawInvalidPublicDrift(db, REFERENCE);
  const rows = sqlite.query(`SELECT id, title, is_active AS active, ph_eligibility AS eligibility,
    location_type AS type, posted_at AS postedAt, inactive_reason AS reason
    FROM opportunities ORDER BY id`).all() as Array<{
    id: number; title: string; active: number; eligibility: string; type: string | null;
    postedAt: string | null; reason: string | null;
  }>;
  const byTitle = new Map(rows.map((row) => [row.title, row]));
  const click = createClickHandler({ getDb: () => db });
  const apply = async (title: string) => {
    const row = byTitle.get(title);
    if (!row) throw new Error(`missing ${title}`);
    const target = `https://remotive.com/remote-jobs/customer-support/${title}`;
    const response = await click({
      params: { id: String(row.id) },
      request: new Request(`https://remotejobs.ph/api/click/${row.id}?url=${encodeURIComponent(target)}`),
      locals: { runtime: { env: { DB: binding } } },
      redirect: (location: string, status: number) => new Response(null, { status, headers: { Location: location } }),
    } as never);
    return { status: response.status, location: response.headers.get("Location") };
  };
  const visible = await db.select({ id: opportunities.id }).from(opportunities).where(publicOpportunityFilters());
  const ledgerCount = sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get() as { n: number };
  const result = {
    reference: REFERENCE,
    driftMutations,
    aborted,
    first,
    second,
    rows,
    visible,
    ledgerCount: ledgerCount.n,
    applyFresh: await apply("retain-fresh"),
    applyOnsite: await apply("withdraw-onsite"),
    applyMissingDate: await apply("retain-missing-date"),
    transports: 0,
  };
  console.log(`NATIVE_PUBLICATION_DRIFT_RESULT ${JSON.stringify(result)}`);
} finally {
  sqlite.close();
  setSystemTime();
}
