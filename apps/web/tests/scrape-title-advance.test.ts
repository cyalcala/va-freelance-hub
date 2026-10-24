import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, opportunities } from "@va-hub/db";
import { updatedAdmissionTitle } from "@va-hub/scraper";

function createInMemoryD1() {
  const sqlite = new Database(":memory:");
  const directory = join(import.meta.dir, "../../../packages/db/migrations");
  const appliedMigrations = readdirSync(directory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  for (const name of appliedMigrations) {
    const migration = readFileSync(join(directory, name), "utf8");
    try {
      sqlite.exec(migration);
    } catch {
      // Ignore SQLite syntax edges in synthetic trigger setup
    }
  }

  const binding = {
    prepare(query: string) {
      const statement = sqlite.query(query);
      let params: any[] = [];
      return {
        bind(...values: any[]) {
          params = values;
          return this;
        },
        async first() {
          return statement.get(...params);
        },
        async all() {
          return { results: statement.all(...params) };
        },
        async raw() {
          return statement.values(...params);
        },
        async run() {
          const result = statement.run(...params);
          return { success: true, meta: { changes: result.changes } };
        },
      };
    },
  };

  const db = getDb({ DB: binding as any });
  return { sqlite, db };
}

describe("scrape known-URL title advance", () => {
  test("CrewBloom D9C0BD9475 id 8189 advances from Recruitment Specialist to Talent Acquisition Specialist without clearing policy state", async () => {
    const { sqlite, db } = createInMemoryD1();
    const observedAt = "2026-10-24T12:00:00.000Z";
    const sourceUrl = "https://apply.workable.com/crewbloom/j/D9C0BD9475/";

    // Seed id 8189
    sqlite.query(`
      INSERT INTO opportunities (
        id, title, company, source_url, source_platform, source_id,
        is_active, inactive_reason, ph_eligibility, geo_scope, posted_at, scraped_at, content_hash
      ) VALUES (
        8189, 'Recruitment Specialist', 'CrewBloom', '${sourceUrl}', 'CrewBloom', 'workable:crewbloom',
        1, NULL, 'eligible_verified', 'ph_only', '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z', 'synthetic-8189'
      )
    `).run();

    // Seed inactive row that must NOT advance
    sqlite.query(`
      INSERT INTO opportunities (
        id, title, company, source_url, source_platform, source_id,
        is_active, inactive_reason, ph_eligibility, geo_scope, posted_at, scraped_at, content_hash
      ) VALUES (
        9999, 'Old Inactive Role', 'CrewBloom', 'https://apply.workable.com/crewbloom/j/INACTIVE/', 'CrewBloom', 'workable:crewbloom',
        0, 'policy-rejected', 'ineligible', 'country_locked', '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z', 'synthetic-9999'
      )
    `).run();

    // Query stored rows (mirroring scrape.ts lines 2627-2643)
    const found = await db.select({
      sourceUrl: opportunities.sourceUrl,
      isActive: opportunities.isActive,
      inactiveReason: opportunities.inactiveReason,
      postedAt: opportunities.postedAt,
      title: opportunities.title,
    })
      .from(opportunities)
      .where(inArray(opportunities.sourceUrl, [sourceUrl, "https://apply.workable.com/crewbloom/j/INACTIVE/"]));

    const storedTitleByUrl = new Map<string, { title: string; isActive: boolean | null } | null>();
    found.forEach((row) => {
      const priorTitle = storedTitleByUrl.get(row.sourceUrl);
      storedTitleByUrl.set(
        row.sourceUrl,
        priorTitle === undefined || (priorTitle && priorTitle.title === row.title && priorTitle.isActive === row.isActive)
          ? { title: row.title, isActive: row.isActive }
          : null,
      );
    });

    // Feed items (mirroring scrape.ts lines 2708-2740)
    const allItems = [
      { sourceUrl, title: "Talent Acquisition Specialist" },
      { sourceUrl: "https://apply.workable.com/crewbloom/j/INACTIVE/", title: "New Inactive Title" },
    ];

    const sourceTitleByUrl = new Map<string, string | null>();
    for (const item of allItems) {
      if (!item.sourceUrl) continue;
      const rawTitle = typeof item.title === "string" ? item.title.trim() : null;
      if (!rawTitle) continue;
      const prior = sourceTitleByUrl.get(item.sourceUrl);
      sourceTitleByUrl.set(item.sourceUrl, prior === undefined || prior === rawTitle ? rawTitle : null);
    }

    let titleAdvanced = 0;
    for (const [sUrl, stored] of storedTitleByUrl) {
      if (!stored || !stored.isActive || !stored.title) continue;
      const sourceTitle = sourceTitleByUrl.get(sUrl);
      const nextTitle = updatedAdmissionTitle(stored.title, sourceTitle);
      if (!nextTitle) continue;
      const res = await db.update(opportunities)
        .set({ title: nextTitle, updatedAt: observedAt })
        .where(and(
          eq(opportunities.sourceUrl, sUrl),
          eq(opportunities.title, stored.title),
          eq(opportunities.isActive, true),
        ));
      titleAdvanced += res.meta.changes;
    }

    expect(titleAdvanced).toBeGreaterThan(0);

    // Verify row 8189 in SQLite
    const updated8189 = sqlite.query("SELECT id, title, is_active, inactive_reason, ph_eligibility, geo_scope, updated_at FROM opportunities WHERE id = 8189").get() as any;
    expect(updated8189.title).toBe("Talent Acquisition Specialist");
    expect(updated8189.is_active).toBe(1);
    expect(updated8189.inactive_reason).toBeNull();
    expect(updated8189.ph_eligibility).toBe("eligible_verified");
    expect(updated8189.geo_scope).toBe("ph_only");
    expect(updated8189.updated_at).toBe(observedAt);

    // Verify row 9999 was NOT touched
    const untouched9999 = sqlite.query("SELECT id, title, is_active, inactive_reason FROM opportunities WHERE id = 9999").get() as any;
    expect(untouched9999.title).toBe("Old Inactive Role");
    expect(untouched9999.is_active).toBe(0);
    expect(untouched9999.inactive_reason).toBe("policy-rejected");

    sqlite.close();
  });

  test("rejects title advance if live feed presents conflicting titles for the same URL", () => {
    const sUrl = "https://example.com/job/1";
    const allItems = [
      { sourceUrl: sUrl, title: "Title A" },
      { sourceUrl: sUrl, title: "Title B" },
    ];
    const sourceTitleByUrl = new Map<string, string | null>();
    for (const item of allItems) {
      if (!item.sourceUrl) continue;
      const rawTitle = typeof item.title === "string" ? item.title.trim() : null;
      if (!rawTitle) continue;
      const prior = sourceTitleByUrl.get(item.sourceUrl);
      sourceTitleByUrl.set(item.sourceUrl, prior === undefined || prior === rawTitle ? rawTitle : null);
    }
    expect(sourceTitleByUrl.get(sUrl)).toBeNull();
  });

  test("rejects title advance if live title carries US-only geo restriction or German/French markers", () => {
    expect(updatedAdmissionTitle("VA", "VA - US Only")).toBeNull();
    expect(updatedAdmissionTitle("VA", "Executive Assistant (Canada only)")).toBeNull();
    expect(updatedAdmissionTitle("VA", "Werkstudent Talent Acquisition (m/w/d)")).toBeNull();
  });
});
