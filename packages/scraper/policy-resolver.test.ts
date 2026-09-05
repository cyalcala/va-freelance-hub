import { expect, test, describe } from "bun:test";
import {
  fallbackPolicy,
  resolvePolicy,
  isPublishable,
  resolvePublicationEnvelope,
  loadRegistryPolicies,
  ROBOTS_ENFORCE_SOURCE_IDS,
  robotsModeForSourceIdMirror,
  ATS_PLATFORM_POLICIES,
  ATS_TOKEN_POLICIES,
  KNOWN_SOURCE_IDS,
  KNOWN_STATIC_IDS,
  KNOWN_ATS_IDS,
} from "./policy-resolver";
import { sources } from "./sources";

// ─── Helpers ────────────────────────────────────────────────────────────────

function allowedStaticIds(): string[] {
  return sources.filter((s) => s.complianceStatus === "allowed").map((s) => s.id);
}

// ─── SP-04 Acceptance: Golden parity — every current source id is byte-equivalent before/after resolver ─

describe("SP-04 golden parity: hard-coded fallback is byte-equivalent to current policy", () => {
  const allowed = [
    "we-work-remotely",
    "remotive",
    "real-work-from-anywhere",
    "remote-ok",
    "jobicy-admin-support-apac",
    "jobicy-supporting-apac",
  ];
  const pausedStatic = [
    "problogger",
    "remote-co",
    "authentic-jobs",
    "dribbble",
    "onlinejobs-ph",
    "jobspresso",
  ];

  test("allowed static sources are enabled + publishable + active", () => {
    for (const id of allowed) {
      const p = fallbackPolicy(id);
      expect(p.enabled).toBe(true);
      expect(p.publishable).toBe(true);
      expect(p.complianceState).toBe("allowed");
      expect(p.operationalState).toBe("active");
      expect(p.kind).toBe("static");
      // resolve with no registry row is identical
      const r = resolvePolicy(id, null);
      expect(r).toEqual(p);
      const withUndefined = resolvePolicy(id, undefined);
      expect(withUndefined).toEqual(p);
    }
  });

  test("paused static sources are blocked/paused and not fetchable", () => {
    for (const id of pausedStatic) {
      const p = fallbackPolicy(id);
      expect(p.enabled).toBe(false);
      expect(p.publishable).toBe(false);
      expect(p.complianceState).toBe("blocked");
      expect(p.operationalState).toBe("paused");
      expect(p.kind).toBe("static");
      expect(resolvePolicy(id)).toEqual(p);
    }
  });

  test("every ATS token is paused/blocked and not publishable (fail-closed)", () => {
    for (const id of KNOWN_ATS_IDS) {
      const p = fallbackPolicy(id);
      expect(p.enabled).toBe(false);
      expect(p.publishable).toBe(false);
      expect(p.kind).toBe("ats");
      // Compliance is blocked (legacy paused maps to blocked)
      expect(p.complianceState).toBe("blocked");
      expect(p.operationalState).toBe("paused");
      expect(resolvePolicy(id)).toEqual(p);
      // Must carry the exact pause note from the resolver's copy
      expect(p.complianceNotes.length).toBeGreaterThan(20);
      // Token note vs platform note both contain Paused prefix
      expect(p.complianceNotes.startsWith("Paused")).toBe(true);
    }
  });

  test("KNOWN_SOURCE_IDS is exactly 26 (12 static + 14 ATS) — no drift", () => {
    expect(KNOWN_STATIC_IDS.length).toBe(12);
    expect(KNOWN_ATS_IDS.length).toBe(14);
    expect(KNOWN_SOURCE_IDS.length).toBe(26);
    expect(new Set(KNOWN_SOURCE_IDS).size).toBe(26);
    // Hard-coded expectation to catch silent additions
    expect(KNOWN_SOURCE_IDS.sort()).toEqual(
      [
        "we-work-remotely",
        "remotive",
        "real-work-from-anywhere",
        "jobicy-admin-support-apac",
        "jobicy-supporting-apac",
        "remote-ok",
        "problogger",
        "remote-co",
        "authentic-jobs",
        "dribbble",
        "onlinejobs-ph",
        "jobspresso",
        "ashby:supabase",
        "ashby:camunda",
        "ashby:tremendous",
        "ashby:amplify",
        "ashby:ashby",
        "greenhouse:grafanalabs",
        "greenhouse:nearform",
        "greenhouse:gitlab",
        "greenhouse:ghost",
        "greenhouse:remotecom",
        "breezy:20four7va",
        "breezy:sourcefit",
        "breezy:vaaphilippines-recruitment",
        "breezy:time-etc",
      ].sort(),
    );
  });

  test("ATS platform defaults are all paused and fail-closed", () => {
    const platforms = Object.keys(ATS_PLATFORM_POLICIES);
    expect(platforms.sort()).toEqual(["ashby", "breezy", "greenhouse", "lever", "workable"].sort());
    for (const p of Object.values(ATS_PLATFORM_POLICIES)) {
      expect(p.enabled).toBe(false);
      expect(p.complianceStatus).toBe("paused");
    }
  });

  test("ATS token policies are all enabled=false (no reviewed allow)", () => {
    for (const [key, pol] of Object.entries(ATS_TOKEN_POLICIES)) {
      expect(pol.enabled).toBe(false);
      expect(pol.complianceStatus).toBe("paused");
      expect(key.includes(":")).toBe(true);
    }
  });
});

// ─── Unknown / adversarial — must never publish ─────────────────────────────

describe("unknown and adversarial identities remain non-publishing candidates", () => {
  // Generic unknowns (no ":") -> needs_review/candidate, never fetchable.
  const genericUnknowns = [
    "unknown-source",
    "remote-ok ",
    "",
    "   ",
    "eviljobicy.com",
    "unknown:token:extra", // unknown platform but still ATS-shaped -> treated as ats paused
  ];

  // ATS-like unknowns on known platforms -> blocked/paused (platform default, fail-closed).
  // This mirrors current scrape.ts: an unreviewed token on a known AtsPlatform
  // inherits that platform's paused policy, not needs_review.
  const atsUnknowns = [
    "workable:unknownco",
    "greenhouse:unknownco",
    "lever:acme",
    "breezy:evilco",
    "ashby:unknown",
    "ashby:supabase:extra",
    "we-work-remotely:evil", // hyphenated platform not in AtsPlatform -> unknown ATS paused
    "WORKABLE:ACME", // case-sensitive: uppercase platform unknown -> paused
  ];

  for (const id of genericUnknowns) {
    test(`generic unknown "${id}" is not fetchable`, () => {
      const p = fallbackPolicy(id);
      // Generic without ":" is needs_review/candidate; with ":" but unknown platform is blocked/paused — both non-publishable
      if (id.includes(":")) {
        expect(p.complianceState).toBe("blocked");
        expect(p.operationalState).toBe("paused");
        expect(p.kind).toBe("ats");
      } else {
        expect(p.complianceState).toBe("needs_review");
        expect(p.operationalState).toBe("candidate");
        expect(p.kind).toBe("unknown");
      }
      expect(p.enabled).toBe(false);
      expect(p.publishable).toBe(false);
      expect(resolvePolicy(id)).toEqual(p);
      // Adversarial resolver overlay must not promote it when candidate
      const row = {
        sourceId: id,
        providerId: "test",
        complianceState: "needs_review" as const,
        operationalState: "candidate" as const,
        optOut: false,
      };
      const r = resolvePolicy(id, row);
      expect(r.publishable).toBe(false);
      expect(r.enabled).toBe(false);
    });
  }

  for (const id of atsUnknowns) {
    test(`ats unknown "${id}" is blocked/paused and not fetchable`, () => {
      const p = fallbackPolicy(id);
      expect(p.complianceState).toBe("blocked");
      expect(p.operationalState).toBe("paused");
      expect(p.enabled).toBe(false);
      expect(p.publishable).toBe(false);
      expect(p.kind).toBe("ats");
      expect(resolvePolicy(id)).toEqual(p);
      const row = {
        sourceId: id,
        providerId: "test",
        complianceState: "needs_review" as const,
        operationalState: "candidate" as const,
        optOut: false,
      };
      const r = resolvePolicy(id, row);
      expect(r.publishable).toBe(false);
      expect(r.enabled).toBe(false);
    });
  }

  test("unknown ATS platform is paused with explicit note", () => {
    const p = fallbackPolicy("unknownplatform:token123");
    expect(p.enabled).toBe(false);
    expect(p.publishable).toBe(false);
    expect(p.complianceNotes).toContain("unknown ATS platform");
  });

  test("dynamic unknown token on known platform is still paused via platform default", () => {
    // Not in ATS_TOKEN_POLICIES, but platform is known
    const p = fallbackPolicy("greenhouse:brandnewco19823");
    expect(p.enabled).toBe(false);
    expect(p.publishable).toBe(false);
    expect(p.complianceState).toBe("blocked");
    expect(p.operationalState).toBe("paused");
    // Platform note is the fallback reason
    expect(p.complianceNotes).toContain("Greenhouse");
  });
});

// ─── Registry overlay — exact behavior when row exists ──────────────────────

describe("registry overlay is authoritative when present", () => {
  test("allowed+active registry row makes source publishable", () => {
    const row = {
      sourceId: "we-work-remotely",
      providerId: "we-work-remotely",
      complianceState: "allowed" as const,
      operationalState: "active" as const,
      optOut: false,
      displayName: "We Work Remotely",
    };
    const r = resolvePolicy("we-work-remotely", row);
    expect(r.enabled).toBe(true);
    expect(r.publishable).toBe(true);
    expect(r.complianceState).toBe("allowed");
    expect(r.operationalState).toBe("active");
  });

  test("a registry row for another source cannot authorize this source", () => {
    const policy = resolvePolicy("remotive", {
      sourceId: "we-work-remotely",
      providerId: "we-work-remotely",
      complianceState: "allowed",
      operationalState: "active",
      optOut: false,
    });
    expect(policy).toMatchObject({
      sourceId: "remotive",
      complianceState: "needs_review",
      operationalState: "paused",
      enabled: false,
      publishable: false,
    });
    expect(policy.complianceNotes).toContain("identity mismatch");
  });

  test("conditional+active is publishable and enabled by the legacy loop", () => {
    const r = resolvePolicy("test:id", {
      sourceId: "test:id",
      providerId: "test",
      complianceState: "conditional",
      operationalState: "active",
      optOut: false,
    });
    expect(r.publishable).toBe(true);
    expect(r.enabled).toBe(true);
  });

  test("conditional+canary is eligible only through the capped publication gateway", () => {
    const row = {
      sourceId: "test:id",
      providerId: "test",
      complianceState: "conditional" as const,
      operationalState: "canary" as const,
      optOut: false,
      canaryMaxNewItemsPerTick: 3,
    };
    const r = resolvePolicy("test:id", row);

    expect(r.publishable).toBe(true);
    // The legacy hot path only knows a boolean and therefore cannot enforce a
    // per-tick cap. It must not turn an inserted canary row into unlimited
    // publication before the dedicated gateway consumes this envelope.
    expect(r.enabled).toBe(false);
    expect(resolvePublicationEnvelope(r, row)).toEqual({
      mode: "capped",
      maxNewItemsPerTick: 3,
      reason: null,
    });
  });

  test("a canary with a missing or invalid cap fails closed in the resolver", () => {
    const policy = resolvePolicy("test:id", {
      sourceId: "test:id",
      providerId: "test",
      complianceState: "allowed",
      operationalState: "canary",
      optOut: false,
    });

    expect(resolvePublicationEnvelope(policy, { canaryMaxNewItemsPerTick: null })).toEqual({
      mode: "blocked",
      maxNewItemsPerTick: 0,
      reason: "canary requires a positive per-tick publication cap",
    });
    expect(resolvePublicationEnvelope(policy, { canaryMaxNewItemsPerTick: 1.5 })).toEqual({
      mode: "blocked",
      maxNewItemsPerTick: 0,
      reason: "canary requires a positive per-tick publication cap",
    });
    expect(resolvePublicationEnvelope(policy, { canaryMaxNewItemsPerTick: Number.MAX_SAFE_INTEGER + 1 })).toEqual({
      mode: "blocked",
      maxNewItemsPerTick: 0,
      reason: "canary requires a positive per-tick publication cap",
    });
  });

  test("allowed+shadow is NOT publishable (bounded fetch without publish)", () => {
    const r = resolvePolicy("test:id", {
      sourceId: "test:id",
      providerId: "test",
      complianceState: "allowed",
      operationalState: "shadow",
      optOut: false,
    });
    expect(r.publishable).toBe(false);
    expect(r.enabled).toBe(false);
  });

  test("allowed+paused is not publishable", () => {
    const r = resolvePolicy("we-work-remotely", {
      sourceId: "we-work-remotely",
      providerId: "we-work-remotely",
      complianceState: "allowed",
      operationalState: "paused",
      optOut: false,
    });
    expect(r.publishable).toBe(false);
    expect(r.enabled).toBe(false);
  });

  test("optOut=true always blocks even if allowed/active", () => {
    const r = resolvePolicy("we-work-remotely", {
      sourceId: "we-work-remotely",
      providerId: "we-work-remotely",
      complianceState: "allowed",
      operationalState: "active",
      optOut: true,
    });
    expect(r.publishable).toBe(false);
    expect(r.enabled).toBe(false);
    expect(r.optOut).toBe(true);
    expect(r.complianceNotes).toContain("Opt-out");
  });

  test("shadow/canary/active with needs_review is CHECK-violating and coerced to non-publishable", () => {
    const badCompliance = ["needs_review", "blocked", "awaiting_permission", "deprecated"] as const;
    for (const compliance of badCompliance) {
      for (const op of ["shadow", "canary", "active"] as const) {
        const r = resolvePolicy("test:id", {
          sourceId: "test:id",
          providerId: "test",
          complianceState: compliance,
          operationalState: op,
          optOut: false,
        });
        expect(r.publishable).toBe(false);
        expect(r.enabled).toBe(false);
        expect(r.complianceNotes).toContain("CHECK violation");
      }
    }
  });

  test("needs_review+candidate remains non-publishable (correct registry state)", () => {
    const r = resolvePolicy("new:co", {
      sourceId: "new:co",
      providerId: "new",
      complianceState: "needs_review",
      operationalState: "candidate",
      optOut: false,
    });
    expect(r.publishable).toBe(false);
    expect(r.enabled).toBe(false);
  });
});

// ─── Publishability matrix ───────────────────────────────────────────────────

describe("publishability matrix mirrors migration CHECK", () => {
  test("isPublishable is true only for allowed|conditional x canary|active without optOut", () => {
    expect(isPublishable("allowed", "active", false)).toBe(true);
    expect(isPublishable("allowed", "canary", false)).toBe(true);
    expect(isPublishable("conditional", "active", false)).toBe(true);
    expect(isPublishable("conditional", "canary", false)).toBe(true);
    // shadow is not publishable even if allowed
    expect(isPublishable("allowed", "shadow", false)).toBe(false);
    // paused/retired etc not publishable
    expect(isPublishable("allowed", "paused", false)).toBe(false);
    expect(isPublishable("allowed", "candidate", false)).toBe(false);
    expect(isPublishable("allowed", "quarantined", false)).toBe(false);
    // blocked/needs_review never publishable
    expect(isPublishable("blocked", "active", false)).toBe(false);
    expect(isPublishable("needs_review", "active", false)).toBe(false);
    expect(isPublishable("awaiting_permission", "canary", false)).toBe(false);
    // optOut always blocks
    expect(isPublishable("allowed", "active", true)).toBe(false);
    expect(isPublishable("conditional", "canary", true)).toBe(false);
  });
});

describe("SP-23 publication envelopes", () => {
  test("the exact-six fallback remains active and uncapped without changing its resolved object", () => {
    for (const id of allowedStaticIds()) {
      const fallback = fallbackPolicy(id);
      expect(resolvePolicy(id, null)).toEqual(fallback);
      expect(resolvePublicationEnvelope(fallback, null)).toEqual({
        mode: "unlimited",
        maxNewItemsPerTick: null,
        reason: null,
      });
    }
  });

  test("non-publishable states stay blocked regardless of any supplied cap", () => {
    const shadow = resolvePolicy("test:id", {
      sourceId: "test:id",
      providerId: "test",
      complianceState: "allowed",
      operationalState: "shadow",
      optOut: false,
    });
    expect(resolvePublicationEnvelope(shadow, { canaryMaxNewItemsPerTick: 99 })).toEqual({
      mode: "blocked",
      maxNewItemsPerTick: 0,
      reason: "policy is not publishable",
    });
  });

  test("durable opt-out memory overrides an allowed active registry cache row", async () => {
    let selectCall = 0;
    const db = {
      select() {
        selectCall += 1;
        return {
          from() {
            if (selectCall === 1) {
              return [{
                sourceId: "greenhouse:grafanalabs",
                providerId: "greenhouse",
                complianceState: "allowed",
                operationalState: "active",
                optOut: false,
              }];
            }
            return [{ sourceId: "greenhouse:grafanalabs" }];
          },
        };
      },
    };
    const policies = await loadRegistryPolicies(db);
    const row = policies.get("greenhouse:grafanalabs");
    if (!row) throw new Error("expected registry policy row");

    expect(row.optOut).toBe(true);
    expect(resolvePolicy("greenhouse:grafanalabs", row)).toMatchObject({
      optOut: true,
      enabled: false,
      publishable: false,
    });
  });

  test("durable opt-out memory blocks an exact-six fallback after its registry row is removed", async () => {
    let selectCall = 0;
    const db = {
      select() {
        selectCall += 1;
        return {
          from() {
            return selectCall === 1 ? [] : [{ sourceId: "remotive" }];
          },
        };
      },
    };
    const policies = await loadRegistryPolicies(db);
    const row = policies.get("remotive");
    if (!row) throw new Error("expected durable opt-out overlay");

    expect(row).toMatchObject({
      sourceId: "remotive",
      optOut: true,
      operationalState: "paused",
    });
    expect(resolvePolicy("remotive", row)).toMatchObject({
      optOut: true,
      enabled: false,
      publishable: false,
    });
  });

  test("does not convert an unavailable registry or durable ledger into an active fallback", async () => {
    const db = {
      select() {
        return {
          from() {
            throw new Error("typed D1 outage");
          },
        };
      },
      async execute() {
        throw new Error("raw D1 outage");
      },
    };

    await expect(loadRegistryPolicies(db)).rejects.toThrow("registry policy snapshot unavailable");
  });

  test("raw registry fallback retains the canary cap instead of silently discarding it", async () => {
    let query = "";
    const db = {
      select() {
        return {
          from() {
            throw new Error("force raw fallback");
          },
        };
      },
      async execute(sql: string) {
        query = sql;
        return {
          results: [{
            source_id: "greenhouse:grafanalabs",
            provider_id: "greenhouse",
            compliance_state: "allowed",
            operational_state: "canary",
            opt_out: 0,
            canary_max_new_items_per_tick: 3,
          }],
        };
      },
    };
    const policies = await loadRegistryPolicies(db);

    expect(query).toContain("canary_max_new_items_per_tick");
    expect(query).toContain("source_opt_outs");
    expect(policies.get("greenhouse:grafanalabs")?.canaryMaxNewItemsPerTick).toBe(3);
  });
});

// ─── Robots mode parity ──────────────────────────────────────────────────────

describe("robots mode mirrors exact-six literal", () => {
  test("enforce set is exactly six (guardrail literal)", () => {
    expect(ROBOTS_ENFORCE_SOURCE_IDS.size).toBe(6);
    expect([...ROBOTS_ENFORCE_SOURCE_IDS].sort()).toEqual(
      [
        "we-work-remotely",
        "remotive",
        "real-work-from-anywhere",
        "remote-ok",
        "jobicy-admin-support-apac",
        "jobicy-supporting-apac",
      ].sort(),
    );
  });

  test("robots mode is enforce for exact six, observe otherwise", () => {
    for (const id of ROBOTS_ENFORCE_SOURCE_IDS) {
      expect(robotsModeForSourceIdMirror(id)).toBe("enforce");
      expect(fallbackPolicy(id).robotsMode).toBe("enforce");
      expect(resolvePolicy(id).robotsMode).toBe("enforce");
    }
    const observes = [
      "problogger",
      "ashby:supabase",
      "greenhouse:gitlab",
      "breezy:sourcefit",
      "unknown:token",
      "workable:acme",
    ];
    for (const id of observes) {
      expect(robotsModeForSourceIdMirror(id)).toBe("observe");
      expect(fallbackPolicy(id).robotsMode).toBe("observe");
    }
  });
});

// ─── Hard-coded rollback adapter completeness ───────────────────────────────

describe("fallback covers every known id; resolver is reversible", () => {
  test("every KNOWN_SOURCE_ID has a fallbackPolicy without throwing", () => {
    for (const id of KNOWN_SOURCE_IDS) {
      expect(() => fallbackPolicy(id)).not.toThrow();
      const p = fallbackPolicy(id);
      expect(typeof p.complianceNotes).toBe("string");
      expect(typeof p.enabled).toBe("boolean");
      expect(typeof p.publishable).toBe("boolean");
    }
  });

  test("resolvePolicy with empty Map fallback is byte-identical for all 26", () => {
    for (const id of KNOWN_SOURCE_IDS) {
      const a = fallbackPolicy(id);
      const b = resolvePolicy(id, null);
      const c = resolvePolicy(id, undefined);
      expect(b).toEqual(a);
      expect(c).toEqual(a);
    }
  });
});
