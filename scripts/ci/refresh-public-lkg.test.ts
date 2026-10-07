import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDurableLkgSnapshot } from "../../apps/web/src/lib/durable-lkg-snapshot";
import { packBoard } from "../../apps/web/src/lib/public-serving-snapshot";
import { refreshReleaseLkg, selectReleaseLkg } from "./refresh-public-lkg";

const temporary: string[] = [];
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }); });
const capturedAt = Date.parse(getDurableLkgSnapshot().generatedAt);
const now = capturedAt + 3 * 60 * 60 * 1_000;
const newer = new Date(capturedAt + 60 * 60 * 1_000).toISOString();

test("a release export accepts a newer serving row, strips descriptions and unknown fields", async () => {
  const previous = getDurableLkgSnapshot();
  const next = { ...previous, generatedAt: newer, privateField: "discard", jobs: previous.jobs.map((job) => ({ ...job, description: "omit", privateField: "discard" })) };
  const board = await selectReleaseLkg(previous, { generatedAt: next.generatedAt, payload: await packBoard(next) }, now);
  expect(board.generatedAt).toBe(next.generatedAt);
  expect(board.jobs.every((job) => job.description === null)).toBe(true);
  expect(JSON.stringify(board)).not.toContain("privateField");
});

test("an unavailable capture keeps the last bundle byte-for-byte and reports its real age", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-release-lkg-")); temporary.push(dir);
  const path = join(dir, "bundle.json");
  const previous = getDurableLkgSnapshot();
  const bytes = JSON.stringify(previous);
  await writeFile(path, bytes);
  const receipt = await refreshReleaseLkg({ path, now, async readStored() { throw new Error("D1 quota with secret upstream text"); } });
  expect(receipt.status).toBe("retained");
  expect(receipt.reason).toBe("capture_unavailable");
  expect(receipt.ageSeconds).toBe(Math.floor((now - Date.parse(previous.generatedAt)) / 1000));
  expect(await readFile(path, "utf8")).toBe(bytes);
});

test("old, future, empty, collapsed, malformed and ineligible captures cannot replace LKG", async () => {
  const previous = getDurableLkgSnapshot();
  for (const candidate of [
    previous,
    { ...previous, generatedAt: new Date(now + 60 * 60 * 1_000).toISOString() },
    { ...previous, generatedAt: newer, jobs: [] },
    { ...previous, generatedAt: newer, directory: [] },
    { ...previous, generatedAt: newer, jobs: previous.jobs.map((job, i) => i === 0 ? { ...job, tags: null } : job) },
    { ...previous, generatedAt: newer, jobs: previous.jobs.map((job, i) => i === 0 ? { ...job, phEligibility: "ineligible" } : job) },
  ]) {
    await expect(selectReleaseLkg(previous, { generatedAt: candidate.generatedAt, payload: JSON.stringify(candidate) }, now)).rejects.toThrow();
  }
});

test("a validated capture atomically replaces the artifact bundle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-release-lkg-")); temporary.push(dir);
  const path = join(dir, "bundle.json");
  const previous = getDurableLkgSnapshot(); await writeFile(path, JSON.stringify(previous));
  const next = { ...previous, generatedAt: newer };
  const receipt = await refreshReleaseLkg({ path, now, async readStored() { return { generatedAt: next.generatedAt, payload: await packBoard(next) }; } });
  expect(receipt.status).toBe("refreshed");
  expect(JSON.parse(await readFile(path, "utf8")).generatedAt).toBe(next.generatedAt);
});
