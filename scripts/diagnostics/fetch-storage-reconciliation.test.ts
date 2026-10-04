import { describe, expect, test } from "bun:test";
import {
  classifyFetchStorage,
  FETCH_STORAGE_DEBOUNCE_HOURS,
  normalizePlatformKey,
  reconcileFetchStorage,
  type FetchEventRow,
  type KnownRow,
  type StoredRow,
} from "./fetch-storage-reconciliation";

// One real scrape run as the durable tables recorded it on 2026-10-04T05:30:59.921Z:
// the primary clock fetched 107 items with zero errors and stored nothing.
const RUN_AT = "2026-10-04T05:30:59.921Z";

const EVENTS: FetchEventRow[] = [
  { source_id: "we-work-remotely", source_name: "We Work Remotely", count: 89, skipped: 0, ok: 1, error: null },
  { source_id: "remotive", source_name: "Remotive", count: 18, skipped: 0, ok: 1, error: null },
  { source_id: "greenhouse:remotecom", source_name: "Remote.com", count: 0, skipped: 1, ok: 1, error: null },
];

// last_seen_in_feed_at is written at most once per FETCH_STORAGE_DEBOUNCE_HOURS, so a
// URL present in the run's payload carries a stamp no older than the debounce.
const KNOWN: KnownRow[] = [
  { source_platform: "WeWorkRemotely", last_seen_in_feed_at: "2026-10-03T22:21:03.852Z" },
  { source_platform: "WeWorkRemotely", last_seen_in_feed_at: "2026-10-04T05:20:58.776Z" },
  { source_platform: "Remotive", last_seen_in_feed_at: "2026-10-04T02:41:06.512Z" },
];

const STORED: StoredRow[] = [];

describe("normalizePlatformKey", () => {
  test("folds case and separator differences so one identity joins to itself", () => {
    expect(normalizePlatformKey("Remote OK")).toBe(normalizePlatformKey("RemoteOK"));
    expect(normalizePlatformKey("We Work Remotely")).toBe(normalizePlatformKey("WeWorkRemotely"));
    expect(normalizePlatformKey("Real Work From Anywhere")).toBe(normalizePlatformKey("RealWorkFromAnywhere"));
  });

  test("keeps genuinely different names apart instead of merging identities", () => {
    expect(normalizePlatformKey("Grafana Labs")).not.toBe(normalizePlatformKey("Nearform"));
    expect(normalizePlatformKey("")).toBe("");
  });
});

describe("reconcileFetchStorage", () => {
  test("closes the funnel per source when the trailing window outlasts the debounce", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: EVENTS,
      knownRows: KNOWN,
      storedRows: STORED,
    });

    expect(report.measurable).toBe(true);
    const wwr = report.sources.find((s) => s.sourceId === "we-work-remotely")!;
    expect(wwr.fetched).toBe(89);
    expect(wwr.alreadyKnown).toBe(2);
    expect(wwr.newlyStored).toBe(0);
    expect(wwr.unexplained).toBe(87);
    expect(wwr.platformMatch).toBe("normalized");
    expect(wwr.anomalous).toBe(true);
  });

  test("counts a stamp written by a LATER tick of the same source as already known", () => {
    // Observed live on 2026-10-04: the 05:30:59Z run stamped one WWR row and the
    // 05:40Z run stamped 87 more, because the 12h debounce had only just expired.
    // Excluding later stamps would invent 88 unexplained items out of one run.
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: [{ source_id: "we-work-remotely", source_name: "We Work Remotely", count: 89, skipped: 0, ok: 1, error: null }],
      knownRows: [
        { source_platform: "WeWorkRemotely", last_seen_in_feed_at: "2026-10-03T22:21:03.852Z" },
        { source_platform: "WeWorkRemotely", last_seen_in_feed_at: "2026-10-04T05:41:12.004Z" },
      ],
      storedRows: [],
    });

    const wwr = report.sources[0];
    expect(wwr.alreadyKnown).toBe(2);
    expect(wwr.unexplained).toBe(87);
  });

  test("refuses to report an anomaly when the window cannot bound the debounce", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: FETCH_STORAGE_DEBOUNCE_HOURS,
      events: EVENTS,
      knownRows: KNOWN,
      storedRows: STORED,
    });

    expect(report.measurable).toBe(false);
    expect(report.censored).toContain("debounce");
    for (const source of report.sources) {
      expect(source.alreadyKnown).toBeNull();
      expect(source.unexplained).toBeNull();
      expect(source.anomalous).toBe(false);
    }
    expect(report.totals.unexplained).toBeNull();
  });

  test("treats an unmapped source name as UNKNOWN, never as a zero", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: [{ source_id: "breezy:yokly", source_name: "Yokly", count: 11, skipped: 0, ok: 1, error: null }],
      knownRows: KNOWN,
      storedRows: STORED,
    });

    const yokly = report.sources[0];
    expect(yokly.platform).toBeNull();
    expect(yokly.platformMatch).toBe("none");
    expect(yokly.fetched).toBe(11);
    expect(yokly.alreadyKnown).toBeNull();
    expect(yokly.unexplained).toBeNull();
    expect(report.totals.unmappedSources).toBe(1);
    expect(report.totals.fetched).toBe(11);
  });

  test("refuses to attribute a platform that two source names normalize onto", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: [
        { source_id: "breezy:a", source_name: "Acme Inc", count: 4, skipped: 0, ok: 1, error: null },
        { source_id: "greenhouse:b", source_name: "Acme, Inc.", count: 6, skipped: 0, ok: 1, error: null },
      ],
      knownRows: [{ source_platform: "Acme Inc", last_seen_in_feed_at: RUN_AT }],
      storedRows: [],
    });

    expect(report.sources.every((s) => s.platform === null)).toBe(true);
    expect(report.sources.every((s) => s.platformMatch === "collision")).toBe(true);
    expect(report.sources.every((s) => s.unexplained === null)).toBe(true);
  });

  test("a cadence-skipped event contributes no items and is still reported", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: [{ source_id: "greenhouse:remotecom", source_name: "Remote.com", count: 0, skipped: 1, ok: 1, error: null }],
      knownRows: [],
      storedRows: [],
    });

    const source = report.sources[0];
    expect(source.fetched).toBe(0);
    expect(source.skipped).toBe(1);
    expect(source.anomalous).toBe(false);
  });

  test("never reports a negative unexplained: an over-counted known side floors at zero", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: [{ source_id: "remotive", source_name: "Remotive", count: 1, skipped: 0, ok: 1, error: null }],
      knownRows: [
        { source_platform: "Remotive", last_seen_in_feed_at: RUN_AT },
        { source_platform: "Remotive", last_seen_in_feed_at: RUN_AT },
        { source_platform: "Remotive", last_seen_in_feed_at: "2026-10-04T05:00:00.000Z" },
      ],
      storedRows: [],
    });

    const remotive = report.sources[0];
    expect(remotive.alreadyKnown).toBe(3);
    expect(remotive.unexplained).toBe(0);
    expect(remotive.anomalous).toBe(false);
  });
});

describe("classifyFetchStorage", () => {
  const base = {
    runAt: RUN_AT,
    trailingWindowHours: 24,
    events: EVENTS,
    knownRows: KNOWN,
    storedRows: STORED,
  };

  test("separates a live but unfederated source from one that is storing nothing", () => {
    const report = reconcileFetchStorage(base);
    expect(classifyFetchStorage(report).slice(0, 2)).toEqual(["fetched_but_unaccounted", "fetched_but_unaccounted"]);

    const storing = reconcileFetchStorage({
      ...base,
      storedRows: [{ source_platform: "WeWorkRemotely", scraped_at: RUN_AT }],
    });
    expect(classifyFetchStorage(storing)[0]).toBe("storing_new");
  });

  test("labels a source that neither fetched nor stored as silent", () => {
    const report = reconcileFetchStorage({
      runAt: RUN_AT,
      trailingWindowHours: 24,
      events: [{ source_id: "jobicy-supporting-apac", source_name: "Jobicy", count: 0, skipped: 1, ok: 0, error: "HTTP 500" }],
      knownRows: [{ source_platform: "Jobicy", last_seen_in_feed_at: "2026-10-01T08:00:00.000Z" }],
      storedRows: [],
    });
    expect(classifyFetchStorage(report)).toEqual(["fetch_failed"]);
  });

  test("is UNKNOWN, not healthy, while the debounce censors the window", () => {
    const censored = reconcileFetchStorage({
      ...base,
      trailingWindowHours: 1,
      events: [{ source_id: "remotive", source_name: "Remotive", count: 18, skipped: 0, ok: 1, error: null }],
    });
    expect(classifyFetchStorage(censored)).toEqual(["censored_unknown"]);
  });
});
// Measured live on 2026-10-04 (session 27, D1 read-only): at run
// 2026-10-04T05:01:02.032Z `remote-ok` fetched 41 items with ok=1 and no error, yet
// `opportunities` carries 1223 rows under source_platform "RemoteOK" whose newest
// `last_seen_in_feed_at` is 2026-10-03T14:01:02.516Z — older than the run's
// 24h trailing window. Its sibling platform name differs only by a space, so the
// normalized join would have attributed it if the platform had been in the set.
const REMOTE_OK_EVENTS: FetchEventRow[] = [
  { source_id: "remote-ok", source_name: "Remote OK", count: 41, skipped: 0, ok: 1, error: null },
];
const EXPIRED_REMOTE_OK_STAMP = "2026-10-03T14:01:02.516Z";

describe("platform universe coverage for a source whose stamps have expired", () => {
  const base = {
    runAt: "2026-10-04T05:01:02.032Z",
    trailingWindowHours: 24,
    events: REMOTE_OK_EVENTS,
    // The trailing window is empty: every RemoteOK stamp predates it.
    knownRows: [] as KnownRow[],
    storedRows: [] as StoredRow[],
  };

  test("is UNKNOWN when the caller supplies only rows inside the window", () => {
    // The honest reading, but the blind spot: a source that stopped stamping
    // vanishes from the platform universe and cannot be reported at all.
    const report = reconcileFetchStorage(base);
    expect(report.sources[0]!.platform).toBeNull();
    expect(report.sources[0]!.alreadyKnown).toBeNull();
    expect(classifyFetchStorage(report)).toEqual(["unmapped_unknown"]);
    expect(report.caveats.join(" ")).toContain("platform universe");
  });

  test("attributes and then reports the gap when the platform universe is supplied", () => {
    const report = reconcileFetchStorage({ ...base, platformNames: ["RemoteOK"] });
    expect(report.sources[0]!.platform).toBe("RemoteOK");
    expect(report.sources[0]!.platformMatch).toBe("normalized");
    expect(report.sources[0]!.fetched).toBe(41);
    // No stamp inside run-12h, so "already known" is 0 and the whole payload is unaccounted.
    expect(report.sources[0]!.alreadyKnown).toBe(0);
    expect(report.sources[0]!.unexplained).toBe(41);
    expect(report.sources[0]!.anomalous).toBe(true);
    expect(classifyFetchStorage(report)).toEqual(["fetched_but_unaccounted"]);
  });

  test("an in-window stamp for that platform still closes the reconciliation", () => {
    const closed = reconcileFetchStorage({
      ...base,
      platformNames: ["RemoteOK"],
      knownRows: [{ source_platform: "RemoteOK", last_seen_in_feed_at: "2026-10-03T22:21:03.852Z" }],
    });
    expect(closed.sources[0]!.alreadyKnown).toBe(1);
    expect(closed.sources[0]!.unexplained).toBe(40);
    expect(classifyFetchStorage(closed)).toEqual(["fetched_but_unaccounted"]);
  });

  test("a supplied name that no row carries stays unresolved rather than becoming zero", () => {
    const report = reconcileFetchStorage({ ...base, platformNames: ["NeverFetched"] });
    expect(report.sources[0]!.platform).toBeNull();
    expect(classifyFetchStorage(report)).toEqual(["unmapped_unknown"]);
  });

  test("the expired stamp itself would be outside every debounce-bounded count", () => {
    // Documents why widening the window does not help: the stamp is older than
    // run - 12h, so including the row still yields alreadyKnown 0.
    const withExpiredRow = reconcileFetchStorage({
      ...base,
      platformNames: ["RemoteOK"],
      knownRows: [{ source_platform: "RemoteOK", last_seen_in_feed_at: EXPIRED_REMOTE_OK_STAMP }],
    });
    expect(withExpiredRow.sources[0]!.alreadyKnown).toBe(0);
    expect(withExpiredRow.sources[0]!.unexplained).toBe(41);
  });
});

// The live remote-ok measurement (2026-10-04): the platform holds 1223 rows whose
// newest stamp is 2026-10-03T14:01:02.516Z, while four consecutive runs fetched 41
// items with ok=1 and no error. Durable columns therefore cannot say whether those 41
// URLs are stored-with-aged-stamps or were never stored.
const REMOTE_OK_ROW_TOTALS = [{ source_platform: "RemoteOK", rows: 1223 }];

describe("platform population vs a fetched gap", () => {
  const base = {
    runAt: "2026-10-04T05:01:02.032Z",
    trailingWindowHours: 24,
    events: REMOTE_OK_EVENTS,
    knownRows: [] as KnownRow[],
    storedRows: [] as StoredRow[],
    platformNames: ["RemoteOK"],
  };

  test("a platform holding at least as many rows as were fetched cannot be called a storage loss", () => {
    const report = reconcileFetchStorage({ ...base, platformRowCounts: REMOTE_OK_ROW_TOTALS });
    const source = report.sources[0]!;
    expect(source.platformRowTotal).toBe(1223);
    expect(source.fetched).toBe(41);
    expect(source.unexplained).toBe(41);
    // Still an unexplained gap, and still flagged: the population count does not
    // prove these URLs are stored, so the anomaly claim is not withdrawn.
    expect(source.anomalous).toBe(true);
    expect(classifyFetchStorage(report)).toEqual(["platform_population_unresolved"]);
  });

  test("the unresolved state names the missing evidence instead of implying storage loss", () => {
    const report = reconcileFetchStorage({ ...base, platformRowCounts: REMOTE_OK_ROW_TOTALS });
    expect(report.caveats.join(" ")).toContain("per-URL");
  });

  test("a population smaller than the fetched count keeps the storage-loss class", () => {
    // The genuine-loss shape must not be excused by the new state: if the platform
    // holds fewer rows lifetime than the run fetched, the gap cannot be an aged stamp.
    const report = reconcileFetchStorage({
      ...base,
      platformRowCounts: [{ source_platform: "RemoteOK", rows: 3 }],
    });
    expect(report.sources[0]!.platformRowTotal).toBe(3);
    expect(classifyFetchStorage(report)).toEqual(["fetched_but_unaccounted"]);
  });

  test("omitting the input changes no class and says so", () => {
    const report = reconcileFetchStorage(base);
    expect(report.sources[0]!.platformRowTotal).toBeNull();
    expect(classifyFetchStorage(report)).toEqual(["fetched_but_unaccounted"]);
    expect(report.caveats.join(" ")).toContain("No platform row totals");
  });

  test("a count for another platform never attributes itself to this source", () => {
    const report = reconcileFetchStorage({
      ...base,
      platformRowCounts: [{ source_platform: "NeverFetched", rows: 1223 }],
    });
    expect(report.sources[0]!.platformRowTotal).toBeNull();
    expect(classifyFetchStorage(report)).toEqual(["fetched_but_unaccounted"]);
  });
});
