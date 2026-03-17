/**
 * Direct schema push to Turso using @libsql/client.
 * Bypasses drizzle-kit's broken auth for Turso on v0.21.
 * Run from repo root: bun --env-file=.env run packages/db/push.ts
 */
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS content_digests (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    creator_name TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    transcript_raw TEXT,
    action_plan TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    published_at TEXT,
    processed_at TEXT DEFAULT (datetime('now')) NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS content_digests_video_id_unique ON content_digests (video_id)`,
  `CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    type TEXT DEFAULT 'freelance' NOT NULL,
    source_url TEXT NOT NULL,
    source_platform TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    location_type TEXT DEFAULT 'remote',
    pay_range TEXT,
    description TEXT,
    posted_at TEXT,
    scraped_at TEXT DEFAULT (datetime('now')) NOT NULL,
    is_active INTEGER DEFAULT true NOT NULL,
    content_hash TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS opportunities_source_url_unique ON opportunities (source_url)`,
  `CREATE TABLE IF NOT EXISTS va_directory (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    company_name TEXT NOT NULL,
    website TEXT,
    hires_filipinos INTEGER DEFAULT true NOT NULL,
    niche TEXT DEFAULT 'admin',
    hiring_page_url TEXT,
    verified_at TEXT,
    notes TEXT,
    rating INTEGER,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL
  )`,
];

console.log("Pushing schema to Turso...");
for (const sql of statements) {
  await client.execute(sql);
  console.log("  ✓", sql.trim().split("\n")[0].slice(0, 60));
}
console.log("Schema push complete.");
client.close();
