import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { PUBLIC_PH_ELIGIBILITIES } from "../../apps/web/src/lib/public-opportunities";
import { packBoard, READ_SNAPSHOT_SQL, unpackBoard, validateSnapshotCandidate, type StoredSnapshot } from "../../apps/web/src/lib/public-serving-snapshot";
import type { PublicBoard, PublicJob } from "../../apps/web/src/lib/public-board";

const root = resolve(import.meta.dir, "../..");
const bundlePath = resolve(root, "apps/web/src/data/public-lkg.json");
const publicJobFields = ["id", "title", "company", "type", "sourceUrl", "sourcePlatform", "sourceId", "tags", "category", "experienceLevel", "postedAt", "scrapedAt", "geoScope", "phEligibility", "geoEvidence", "clientTimezone", "locationType", "payRange", "updatedAt"] as const;
const directoryFields = ["id", "companyName", "website", "niche", "isDayshift", "isVerified", "isRemote", "isMarketplace"] as const;

/** Accept only the existing serving row; never re-query or republish source jobs. */
export async function selectReleaseLkg(previous: PublicBoard, stored: StoredSnapshot | null, now: number): Promise<PublicBoard> {
  if (!validateSnapshotCandidate(previous).ok) throw new Error("invalid_committed_lkg");
  if (!stored?.payload) throw new Error("snapshot_missing");
  const candidate = await unpackBoard(stored);
  const generatedMs = Date.parse(candidate.generatedAt);
  if (generatedMs > now) throw new Error("snapshot_future_timestamp");
  if (generatedMs <= Date.parse(previous.generatedAt)) throw new Error("snapshot_not_newer");
  if (!validateSnapshotCandidate(candidate, previous).ok) throw new Error("snapshot_invalid_or_collapsed");
  if (candidate.jobs.some((job) => !PUBLIC_PH_ELIGIBILITIES.includes(job.phEligibility as never))) throw new Error("snapshot_ineligible");
  const minimal: PublicBoard = {
    generatedAt: new Date(generatedMs).toISOString(),
    jobs: candidate.jobs.map((job) => ({ ...Object.fromEntries(publicJobFields.map((key) => [key, job[key]])), description: null }) as PublicJob),
    directory: candidate.directory.map((row) => Object.fromEntries(directoryFields.map((key) => [key, row[key]])) as PublicBoard["directory"][number]),
  };
  await packBoard(minimal); // Enforce the same Worker payload ceiling before writing.
  return minimal;
}

export async function refreshReleaseLkg(options: {
  path: string;
  now: number;
  readStored(): Promise<StoredSnapshot | null>;
}) {
  const previous = JSON.parse(await readFile(options.path, "utf8")) as PublicBoard;
  if (!validateSnapshotCandidate(previous).ok) throw new Error("invalid_committed_lkg");
  let board = previous;
  let status = "retained";
  let reason: string | null = null;
  try {
    board = await selectReleaseLkg(previous, await options.readStored(), options.now);
    const temporary = `${options.path}.release-tmp`;
    await writeFile(temporary, JSON.stringify(board) + "\n", "utf8");
    await rename(temporary, options.path);
    status = "refreshed";
  } catch (error) {
    board = previous;
    const known = ["snapshot_missing", "snapshot_future_timestamp", "snapshot_not_newer", "snapshot_invalid_or_collapsed", "snapshot_ineligible"];
    reason = error instanceof Error && known.includes(error.message) ? error.message : "capture_unavailable";
  }
  const sha256 = createHash("sha256").update(await readFile(options.path)).digest("hex");
  return { status, reason, sha256, generatedAt: board.generatedAt, ageSeconds: Math.max(0, Math.floor((options.now - Date.parse(board.generatedAt)) / 1000)), jobs: board.jobs.length, companies: board.directory.length };
}

async function readProductionSnapshot(): Promise<StoredSnapshot | null> {
  const child = Bun.spawn(["node", resolve(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "DB", "--remote", "--env", "production", "--config", "wrangler.jsonc", "--json", "--command", READ_SNAPSHOT_SQL], {
    cwd: resolve(root, "apps/web"), stdout: "pipe", stderr: "pipe",
  });
  const timer = setTimeout(() => child.kill(), 30_000);
  try {
    const [stdout, , exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (exit !== 0) throw new Error("capture_unavailable");
    const result = JSON.parse(stdout);
    if (!Array.isArray(result) || result.length !== 1 || result[0].success !== true
      || result[0].meta?.changed_db !== false || result[0].meta?.rows_written !== 0
      || result[0].results?.length > 1) throw new Error("capture_unavailable");
    return result[0].results?.[0] ?? null;
  } finally { clearTimeout(timer); }
}

if (import.meta.main) {
  // Public counts/time only; do not log the payload or Wrangler stderr.
  const receipt = await refreshReleaseLkg({ path: bundlePath, now: Date.now(), readStored: readProductionSnapshot });
  const output = resolve(root, "public-lkg-release-receipt.json");
  await writeFile(output, JSON.stringify({ ...receipt, sourceSha: process.env.GITHUB_SHA ?? null }, null, 2) + "\n");
  console.info(JSON.stringify(receipt));
}
