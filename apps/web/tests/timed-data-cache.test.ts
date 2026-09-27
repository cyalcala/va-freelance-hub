import { expect, test } from "bun:test";
import { createTimedDataCache } from "../src/lib/timed-data-cache";

test("warm requests and simultaneous requests share one successful load until expiry", async () => {
  let now = 0;
  let loads = 0;
  const cache = createTimedDataCache<number>(300_000, () => now);
  const load = async () => ++loads;
  expect(await Promise.all([cache(load), cache(load), cache(load)])).toEqual([1, 1, 1]);
  now = 299_999;
  expect(await cache(load)).toBe(1);
  now = 300_000;
  expect(await cache(load)).toBe(2);
  expect(loads).toBe(2);
});

test("failed refreshes never cache an outage or return expired listings", async () => {
  let now = 0;
  const cache = createTimedDataCache<number>(100, () => now);
  expect(await cache(async () => 1)).toBe(1);
  now = 101;
  await expect(cache(async () => { throw new Error("D1 unavailable"); }))
    .rejects.toThrow("D1 unavailable");
  expect(await cache(async () => 2)).toBe(2);
});

test("the TTL begins after a slow load succeeds", async () => {
  let now = 0;
  const cache = createTimedDataCache<number>(100, () => now);
  expect(await cache(async () => { now = 90; return 1; })).toBe(1);
  now = 150;
  expect(await cache(async () => 2)).toBe(1);
});
