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