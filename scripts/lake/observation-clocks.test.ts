/**
 * Idempotent discovery/publication clock reconciliation — offline tests.
 *
 * Labels: "v6.5-CASES:" + MATH id for the case-G continuation, "MATH-09:",
 * "MATH-10:" and "SSAE-09:" for the rest.
 *
 * These tests exercise real repository code:
 * - scripts/lake/observation-clocks.ts (this unit's pure module)
 * - packages/scraper/contentHash.ts `hashString` (via `materialDigest`)
 * - scripts/lake/lake-shared.ts `computeFingerprint` (canonical identity)
 * - scripts/lake/measurement-contracts.ts `createPublicationCohortLabel` /
 *   `validatePublicationCohortLabel` (cohort separation contract)
 *
 * Nothing here proves a runtime SLO, a publication effect or deployed behaviour, and
 * nothing widens publication authority or lowers any floor.
 */

import { describe, expect, it } from "bun:test";
import { computeFingerprint } from "./lake-shared";
import {
  createPublicationCohortLabel,
  validatePublicationCohortLabel,
} from "./measurement-contracts";
import {
  applyPublication,
  applyQualification,
  applyRestriction,
  applySighting,
  checkReplayCoverage,
  clearRestriction,
  emptyClocks,
  isCurrentlyPublic,
  MATERIAL_FIELDS,
  materialDelta,
  materialDigest,
  observationAgeDays,
  stalenessDays,
  unknownMaterialFields,
  type DiscoveryClocks,
  type JobMaterialFacts,
} from "./observation-clocks";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const IDENTITY = computeFingerprint(
  "Brightwell VA",
  "Virtual Assistant",
  "https://careers.brightwell.example/jobs/42",
);

const KNOWN_FACTS: JobMaterialFacts = {
  title: "Virtual Assistant for US e-commerce team",
  location_raw: "Remote - Philippines",
  remote: "remote",
  description_digest: "d41d8cd98f00b204e9800998ecf8427e",
  apply_url: "https://careers.brightwell.example/jobs/42",
  posted_at: "2026-10-01T00:00:00.000Z",
  safety: "clear",
};

const FIRST_SEEN = "2026-10-01T02:00:00.000Z";
const REDISCOVERED = "2026-10-03T02:00:00.000Z";
const NOW = "2026-10-04T02:00:00.000Z";

function sighting(observedAt: string, facts: JobMaterialFacts = KNOWN_FACTS) {
  return { observed_at: observedAt, identity_hash: IDENTITY, facts };
}

/** A record that has been sighted once and published once as fresh discovery. */
function publishedRecord(): DiscoveryClocks {
  const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
  const qualified = applyQualification(first.clocks, { qualified_at: "2026-10-01T03:00:00.000Z" });
  const published = applyPublication(qualified.clocks, {
    published_at: "2026-10-01T05:00:00.000Z",
    cohort: "FRESH_DISCOVERY",
  });
  return published.clocks;
}

// ─── v6.5-CASES: MATH-09 case G — rediscovery keeps the original age ─────────

describe("v6.5-CASES: MATH-09 case G — original first-observation age is not reset by rediscovery", () => {
  it("keeps first_observed_at and the age anchor identical across a rediscovery", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const rediscovered = applySighting(first.clocks, sighting(REDISCOVERED));

    expect(first.clocks.first_observed_at).toBe(FIRST_SEEN);
    expect(rediscovered.clocks.first_observed_at).toBe(FIRST_SEEN);
    expect(observationAgeDays(first.clocks, NOW)).toBe(3);
    expect(observationAgeDays(rediscovered.clocks, NOW)).toBe(
      observationAgeDays(first.clocks, NOW),
    );
    expect(rediscovered.clocks.last_observed_at).toBe(REDISCOVERED);
  });

  it("keeps the original first-publication clock and age after rediscovery and replay", () => {
    const published = publishedRecord();
    const rediscovered = applySighting(published, sighting(REDISCOVERED));
    const replayed = applyPublication(rediscovered.clocks, {
      published_at: REDISCOVERED,
      cohort: "FRESH_DISCOVERY",
    });

    expect(replayed.clocks.first_published_at).toBe("2026-10-01T05:00:00.000Z");
    expect(replayed.clocks.first_publication_cohort).toBe("FRESH_DISCOVERY");
    expect(observationAgeDays(published, NOW, "first_published")).toBe(2);
    expect(observationAgeDays(replayed.clocks, NOW, "first_published")).toBe(2);
    expect(replayed.transition).toBe("REPLAYED");
    expect(replayed.clocks.last_published_at).toBe(REDISCOVERED);
  });

  it("is idempotent over repeated rediscovery: no clock moves except last_observed_at", () => {
    let clocks = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN)).clocks;
    const original = { ...clocks };

    for (const at of [REDISCOVERED, "2026-10-04T01:00:00.000Z", NOW]) {
      const result = applySighting(clocks, sighting(at));
      expect(result.transition).toBe("REDISCOVERY_UNCHANGED");
      expect(result.requires_reevaluation).toBe(false);
      expect(result.changed_fields).toEqual([]);
      clocks = result.clocks;
    }

    expect(clocks.first_observed_at).toBe(original.first_observed_at);
    expect(clocks.first_ingested_at).toBe(original.first_ingested_at);
    expect(clocks.material_revision).toBe(original.material_revision);
    expect(clocks.material_digest).toBe(original.material_digest);
    expect(clocks.sighting_count).toBe(4);
    expect(clocks.last_observed_at).toBe(NOW);
  });

  it("never moves a first_* clock forward when an earlier sighting arrives late", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(REDISCOVERED));
    const lateEarlier = applySighting(first.clocks, sighting(FIRST_SEEN));

    expect(lateEarlier.clocks.first_observed_at).toBe(FIRST_SEEN);
    expect(lateEarlier.clocks.last_observed_at).toBe(REDISCOVERED);
    expect(observationAgeDays(lateEarlier.clocks, NOW)).toBe(3);
  });

  it("reports no age at all when the original observation time is unknown", () => {
    const record = emptyClocks(IDENTITY);

    expect(record.first_observed_at).toBeNull();
    expect(observationAgeDays(record, NOW)).toBeNull();
    expect(stalenessDays(record, NOW)).toBeNull();
  });

  it("distinguishes dormancy from total age without erasing the original clock", () => {
    const published = publishedRecord();
    const stale = applySighting(published, sighting("2026-10-03T20:00:00.000Z"));

    expect(observationAgeDays(stale.clocks, NOW)).toBe(3);
    expect(stalenessDays(stale.clocks, NOW)).toBe(0);
    expect(stalenessDays(published, NOW)).toBe(3);
    expect(published.first_observed_at).toBe(FIRST_SEEN);
  });

  it("refuses a sighting carrying a different canonical identity", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    // Identity is company + title + apply domain, so a different employer host is
    // required to produce a different canonical identity.
    const other = computeFingerprint(
      "Brightwell VA",
      "Virtual Assistant",
      "https://apply.other-employer.example/jobs/42",
    );
    expect(other).not.toBe(IDENTITY);
    const rebound = applySighting(first.clocks, {
      observed_at: REDISCOVERED,
      identity_hash: other,
      facts: KNOWN_FACTS,
    });

    expect(rebound.ok).toBe(false);
    expect(rebound.errors.join(" ")).toContain("identity_hash mismatch");
    expect(rebound.clocks).toEqual(first.clocks);
    expect(rebound.clocks.identity_hash).toBe(IDENTITY);
    expect(rebound.clocks.sighting_count).toBe(1);
  });

  it("treats a same-identity sighting from the same apply domain as one canonical job", () => {
    const otherJobOnSamePost = computeFingerprint(
      "Brightwell VA",
      "Virtual Assistant",
      "https://careers.brightwell.example/jobs/99?ref=sitemap",
    );

    expect(otherJobOnSamePost).toBe(IDENTITY);
  });
});

// ─── MATH-10 — material delta, unknown dates, complete-snapshot proof ────────

describe("MATH-10 — material delta is independent of canonical identity", () => {
  it("reports the changed geography field for an unchanged identity and URL", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const moved = applySighting(first.clocks, {
      observed_at: REDISCOVERED,
      identity_hash: IDENTITY,
      facts: { ...KNOWN_FACTS, location_raw: "Manila, Philippines (onsite)" },
    });

    expect(moved.ok).toBe(true);
    expect(moved.transition).toBe("MATERIAL_CHANGED");
    expect(moved.changed_fields).toEqual(["location_raw"]);
    expect(moved.requires_reevaluation).toBe(true);
    expect(moved.clocks.material_revision).toBe(2);
    expect(moved.clocks.first_observed_at).toBe(FIRST_SEEN);
    expect(moved.clocks.identity_hash).toBe(IDENTITY);
    expect(moved.clocks.material_facts?.apply_url).toBe(KNOWN_FACTS.apply_url);
  });

  it("reports a remote flag flip and a safety flip as separate material revisions", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const onsite = applySighting(first.clocks, {
      observed_at: REDISCOVERED,
      identity_hash: IDENTITY,
      facts: { ...KNOWN_FACTS, remote: "onsite" },
    });
    const unsafe = applySighting(onsite.clocks, {
      observed_at: "2026-10-04T01:00:00.000Z",
      identity_hash: IDENTITY,
      facts: { ...onsite.clocks.material_facts!, safety: "unsafe" },
    });

    expect(onsite.changed_fields).toEqual(["remote"]);
    expect(unsafe.changed_fields).toEqual(["safety"]);
    expect(unsafe.requires_reevaluation).toBe(true);
    expect(unsafe.clocks.material_revision).toBe(3);
    expect(unsafe.clocks.unknown_material_fields).toEqual([]);
  });

  it("retains an unknown posting date instead of substituting now", () => {
    const facts: JobMaterialFacts = { ...KNOWN_FACTS, posted_at: null };
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN, facts));

    expect(first.clocks.material_facts?.posted_at).toBeNull();
    expect(first.clocks.unknown_material_fields).toEqual(["posted_at"]);
    expect(materialDigest(facts)).not.toBe(materialDigest({ ...facts, posted_at: NOW }));
  });

  it("treats an explicit unknown disposition as missing evidence, not as a value", () => {
    const facts: JobMaterialFacts = { ...KNOWN_FACTS, remote: "unknown", safety: "unknown" };
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN, facts));

    expect(unknownMaterialFields(facts)).toEqual(["remote", "safety"]);
    expect(first.clocks.unknown_material_fields).toEqual(["remote", "safety"]);
    expect(checkReplayCoverage(first.clocks).requires_full_reacquisition).toBe(true);
  });

  it("narrows the missing-evidence set when a later complete observation fills a field", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN, { ...KNOWN_FACTS, posted_at: null }));
    const filled = applySighting(first.clocks, sighting(REDISCOVERED));

    expect(filled.transition).toBe("MATERIAL_CHANGED");
    expect(filled.changed_fields).toEqual(["posted_at"]);
    expect(filled.clocks.unknown_material_fields).toEqual([]);
    expect(checkReplayCoverage(filled.clocks)).toEqual({
      complete: true,
      missing_material_fields: [],
      requires_full_reacquisition: false,
    });
  });

  it("demands FULL reacquisition for an incomplete retained snapshot", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN, { ...KNOWN_FACTS, title: null, apply_url: null }));
    const coverage = checkReplayCoverage(first.clocks);

    expect(coverage.complete).toBe(false);
    expect(coverage.missing_material_fields).toEqual(["title", "apply_url"]);
    expect(coverage.requires_full_reacquisition).toBe(true);
  });

  it("separates identity from material equality: same fingerprint, different digest", () => {
    const baseline = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const changed = applySighting(baseline.clocks, {
      observed_at: REDISCOVERED,
      identity_hash: IDENTITY,
      facts: { ...KNOWN_FACTS, description_digest: "9e107d9d372bb6826bd81d3542a419d6" },
    });

    expect(computeFingerprint(
      "Brightwell VA",
      "Virtual Assistant",
      "https://careers.brightwell.example/jobs/42",
    )).toBe(IDENTITY);
    expect(changed.changed_fields).toEqual(["description_digest"]);
    expect(changed.clocks.identity_hash).toBe(baseline.clocks.identity_hash);
    expect(changed.clocks.material_digest).not.toBe(materialDigest(KNOWN_FACTS));
    expect(changed.clocks.first_observed_at).toBe(FIRST_SEEN);
  });

  it("cannot alias two fact sets by moving text across a field boundary", () => {
    const left: JobMaterialFacts = { ...KNOWN_FACTS, title: "ab", location_raw: "c" };
    const right: JobMaterialFacts = { ...KNOWN_FACTS, title: "a", location_raw: "bc" };

    expect(materialDigest(left)).not.toBe(materialDigest(right));
    expect(materialDelta(left, right)).toEqual(["title", "location_raw"]);
    expect(MATERIAL_FIELDS.every((field) => field in left)).toBe(true);
  });

  it("is insensitive to field order because the digest order is fixed", () => {
    const reordered: JobMaterialFacts = {
      safety: KNOWN_FACTS.safety,
      posted_at: KNOWN_FACTS.posted_at,
      apply_url: KNOWN_FACTS.apply_url,
      description_digest: KNOWN_FACTS.description_digest,
      remote: KNOWN_FACTS.remote,
      location_raw: KNOWN_FACTS.location_raw,
      title: KNOWN_FACTS.title,
    };

    expect(materialDigest(reordered)).toBe(materialDigest(KNOWN_FACTS));
  });

  it("refuses a malformed sighting timestamp rather than assuming the current time", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const bad = applySighting(first.clocks, {
      observed_at: "not-a-timestamp",
      identity_hash: IDENTITY,
      facts: KNOWN_FACTS,
    });

    expect(bad.ok).toBe(false);
    expect(bad.errors.join(" ")).toContain("observed_at");
    expect(bad.clocks.last_observed_at).toBe(FIRST_SEEN);
    expect(bad.clocks.first_observed_at).toBe(FIRST_SEEN);
  });
});

// ─── MATH-09 / SSAE-09 — cohort separation, supersession, withdrawal ─────────

describe("MATH-09 / SSAE-09 — publication cohorts and idempotent supersession", () => {
  it("locks the first cohort and refuses to relabel it by a later fresh receipt", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const backlog = applyPublication(first.clocks, {
      published_at: "2026-10-01T05:00:00.000Z",
      cohort: "BACKLOG_IMPORT",
    });
    const laterFresh = applyPublication(backlog.clocks, {
      published_at: REDISCOVERED,
      cohort: "FRESH_DISCOVERY",
    });

    expect(backlog.clocks.first_publication_cohort).toBe("BACKLOG_IMPORT");
    expect(laterFresh.clocks.first_publication_cohort).toBe("BACKLOG_IMPORT");
    expect(laterFresh.clocks.first_published_at).toBe("2026-10-01T05:00:00.000Z");
  });

  it("labels a reactivation as an event, never as a new cohort or first publication", () => {
    const published = publishedRecord();
    const withdrawn = applyRestriction(published, {
      restricted_at: "2026-10-02T00:00:00.000Z",
      reason: "employer withdrew the listing",
    });
    // A restricted record refuses a positive publication receipt at this layer.
    const refused = applyPublication(withdrawn.clocks, {
      published_at: REDISCOVERED,
      cohort: "FRESH_DISCOVERY",
    });
    expect(refused.ok).toBe(false);
    expect(refused.errors.join(" ")).toContain("restricted since");

    const restored = clearRestriction(withdrawn.clocks, {
      restored_at: "2026-10-03T00:00:00.000Z",
      authority_ref: "reviewer decision ADR-009 restoration",
    });
    const reactivated = applyPublication(restored.clocks, {
      published_at: REDISCOVERED,
      cohort: "FRESH_DISCOVERY",
    });

    expect(reactivated.transition).toBe("REACTIVATED");
    expect(reactivated.clocks.first_published_at).toBe(published.first_published_at);
    expect(reactivated.clocks.first_publication_cohort).toBe("FRESH_DISCOVERY");
    expect(reactivated.clocks.restricted_count).toBe(1);
    expect(observationAgeDays(reactivated.clocks, NOW, "first_published")).toBe(2);
  });

  it("requires a referenced authority to clear a restriction", () => {
    const published = publishedRecord();
    const withdrawn = applyRestriction(published, {
      restricted_at: REDISCOVERED,
      reason: "safety review",
    });

    expect(clearRestriction(withdrawn.clocks, { restored_at: NOW, authority_ref: "" }).ok).toBe(false);
    expect(clearRestriction(withdrawn.clocks, { restored_at: "nope", authority_ref: "x" }).ok).toBe(false);
    expect(clearRestriction(published, { restored_at: NOW, authority_ref: "x" }).ok).toBe(false);
    expect(clearRestriction(withdrawn.clocks, {
      restored_at: NOW,
      authority_ref: "owner-approved restoration",
    }).ok).toBe(true);
  });

  it("does not let a replayed sighting clear a restriction", () => {
    const published = publishedRecord();
    const withdrawn = applyRestriction(published, {
      restricted_at: REDISCOVERED,
      reason: "opt-out",
    });
    const rediscovered = applySighting(withdrawn.clocks, sighting(NOW));

    expect(rediscovered.transition).toBe("REDISCOVERY_UNCHANGED");
    expect(isCurrentlyPublic(rediscovered.clocks)).toBe(false);
    expect(rediscovered.clocks.restricted_reason).toBe("opt-out");
  });

  it("classifies a repeat receipt at or before the first publication as replay recovery", () => {
    const published = publishedRecord();
    const replayed = applyPublication(published, {
      published_at: "2026-10-01T05:00:00.000Z",
      cohort: "REPLAY_RECOVERY",
    });

    expect(replayed.transition).toBe("REPLAYED");
    expect(replayed.clocks.last_published_at).toBe("2026-10-01T05:00:00.000Z");
  });

  it("keeps first publication evidence when a withdrawal hides the job", () => {
    const published = publishedRecord();
    const withdrawn = applyRestriction(published, {
      restricted_at: REDISCOVERED,
      reason: "verified as a duplicate canonical opening",
    });

    expect(withdrawn.transition).toBe("RESTRICTED");
    expect(withdrawn.requires_reevaluation).toBe(true);
    expect(isCurrentlyPublic(published)).toBe(true);
    expect(isCurrentlyPublic(withdrawn.clocks)).toBe(false);
    expect(withdrawn.clocks.first_published_at).toBe(published.first_published_at);
    expect(withdrawn.clocks.first_publication_cohort).toBe("FRESH_DISCOVERY");
    expect(withdrawn.clocks.restricted_reason).toContain("duplicate");
  });

  it("refuses a second restriction and an empty restriction reason", () => {
    const published = publishedRecord();
    const withdrawn = applyRestriction(published, {
      restricted_at: REDISCOVERED,
      reason: "safety review",
    });
    const again = applyRestriction(withdrawn.clocks, {
      restricted_at: NOW,
      reason: "safety review again",
    });
    const empty = applyRestriction(published, { restricted_at: NOW, reason: "" });

    expect(again.ok).toBe(false);
    expect(again.clocks.restricted_at).toBe(REDISCOVERED);
    expect(empty.ok).toBe(false);
    expect(empty.clocks.restricted_at).toBeNull();
  });

  it("keeps the earliest qualification clock across later decisions", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN));
    const qualified = applyQualification(first.clocks, { qualified_at: "2026-10-01T04:00:00.000Z" });
    const requalified = applyQualification(qualified.clocks, { qualified_at: REDISCOVERED });
    const bad = applyQualification(qualified.clocks, { qualified_at: "nope" });

    expect(requalified.clocks.first_qualified_at).toBe("2026-10-01T04:00:00.000Z");
    expect(bad.ok).toBe(false);
    expect(bad.clocks.first_qualified_at).toBe("2026-10-01T04:00:00.000Z");
  });

  it("agrees with the measurement contract on the cohort it records", () => {
    const published = publishedRecord();
    const label = createPublicationCohortLabel(
      "job-42",
      "brightwell-va",
      "brightwell-provider",
      published.first_publication_cohort!,
      published.last_observed_at!,
      published.material_facts?.posted_at ?? null,
      "v1",
    );
    const result = validatePublicationCohortLabel(label);

    expect(result.valid).toBe(true);
    expect(label.cohort).toBe("FRESH_DISCOVERY");
  });

  it("still refuses a fresh label when the source posting date is unknown", () => {
    const first = applySighting(emptyClocks(IDENTITY), sighting(FIRST_SEEN, { ...KNOWN_FACTS, posted_at: null }));
    const label = createPublicationCohortLabel(
      "job-42",
      "brightwell-va",
      "brightwell-provider",
      "FRESH_DISCOVERY",
      first.clocks.first_observed_at!,
      first.clocks.material_facts?.posted_at ?? null,
      "v1",
    );

    expect(first.clocks.material_facts?.posted_at).toBeNull();
    expect(validatePublicationCohortLabel(label).valid).toBe(false);
  });
});

// ─── Purity ─────────────────────────────────────────────────────────────────

describe("MATH-09 — clock transitions are pure and immutable", () => {
  it("never mutates the record it was given", () => {
    const original = publishedRecord();
    const snapshot = JSON.stringify(original);

    applySighting(original, sighting(REDISCOVERED));
    applySighting(original, sighting(REDISCOVERED, { ...KNOWN_FACTS, remote: "onsite" }));
    applyQualification(original, { qualified_at: NOW });
    applyPublication(original, { published_at: NOW, cohort: "REPLAY_RECOVERY" });
    applyRestriction(original, { restricted_at: NOW, reason: "test" });
    clearRestriction(original, { restored_at: NOW, authority_ref: "test" });

    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("starts an identity with every clock unknown and versioned", () => {
    const record = emptyClocks(IDENTITY);

    expect(record.contract_version).toBe(1);
    expect(record.last_transition).toBe("INITIALIZED");
    expect(record.material_digest).toBeNull();
    expect(record.sighting_count).toBe(0);
    expect(record.material_revision).toBe(0);
    expect(record.restricted_at).toBeNull();
  });
});