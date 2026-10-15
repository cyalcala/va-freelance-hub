import { describe, expect, test } from "bun:test";
import { geoGate } from "./geoGate";
import { assessPostingFreshness } from "./publication-freshness";
import { classifyShift } from "./shiftClassifier";
import { decideTriage } from "./triage-decision";
import { isRelevantForHub } from "./json";
import { selectIntakeBatch } from "../../apps/web/src/lib/conditional-state";
import { selectWorkableRotation } from "../../apps/web/src/lib/workable-rotation";
import { atsFetchCadenceSkip } from "../../apps/web/src/pages/api/cron/scrape";

const OBSERVED_NOW = "2026-10-14T15:00:00.000Z";

describe("Adversarial Invariant & Counterexample Verification", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Invariant 1: Intake Fairness & Multi-Source Allocation
  // ─────────────────────────────────────────────────────────────────────────
  describe("Invariant 1: Multi-Source Intake Fairness (selectIntakeBatch)", () => {
    test("selectIntakeBatch prevents RSS head-of-line starvation of ATS feeds", () => {
      const rssItems = Array.from({ length: 50 }, (_, i) => ({
        sourceUrl: `https://rss.feed/job-${i}`,
        sourceId: "rss:wwr",
        title: `RSS Job ${i}`,
      }));
      const huntItem = {
        sourceUrl: "https://apply.workable.com/hunt-st/j/025-1379/",
        sourceId: "workable:hunt-st",
        title: "Bookkeeper",
      };
      const coconutItem = {
        sourceUrl: "https://apply.workable.com/coconutva/j/1791837787287/",
        sourceId: "workable:coconutva",
        title: "Recruiter",
      };

      const combined = [...rssItems, huntItem, coconutItem];
      const batch = selectIntakeBatch(combined, 50);

      // Both ATS items must be selected despite being at the tail of 50 RSS items
      expect(batch.selected.some((item) => item.sourceUrl === huntItem.sourceUrl)).toBe(true);
      expect(batch.selected.some((item) => item.sourceUrl === coconutItem.sourceUrl)).toBe(true);
      expect(batch.selected.length).toBe(50);
      expect(batch.deferred.length).toBe(2);
    });

    test("deferred ATS URLs are not dropped and are selected on subsequent pass", () => {
      const rssItems = Array.from({ length: 50 }, (_, i) => ({
        sourceUrl: `https://rss.feed/job-${i}`,
        sourceId: "rss:wwr",
        title: `RSS Job ${i}`,
      }));
      const huntItems = Array.from({ length: 27 }, (_, i) => ({
        sourceUrl: `https://apply.workable.com/hunt-st/j/deferred-${i}/`,
        sourceId: "workable:hunt-st",
        title: `Hunt Deferred Job ${i}`,
      }));

      // Pass 1: 50 RSS + 27 Hunt under cap 50
      const pass1 = selectIntakeBatch([...rssItems, ...huntItems], 50);
      expect(pass1.selected.length).toBe(50);
      const deferredHunt = pass1.deferred.filter((item) => item.sourceId === "workable:hunt-st");
      expect(deferredHunt.length).toBeGreaterThan(0);

      // Pass 2: New 50 RSS + deferred Hunt items
      const newRssItems = Array.from({ length: 50 }, (_, i) => ({
        sourceUrl: `https://rss.feed/new-job-${i}`,
        sourceId: "rss:wwr",
        title: `New RSS Job ${i}`,
      }));
      const pass2 = selectIntakeBatch([...newRssItems, ...deferredHunt], 50);

      // Every deferred Hunt item must be selected
      for (const item of deferredHunt) {
        expect(pass2.selected.some((s) => s.sourceUrl === item.sourceUrl)).toBe(true);
      }
    });

    test("selectIntakeBatch handles boundary and invalid caps safely without dropping items", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        sourceUrl: `https://test.feed/job-${i}`,
        sourceId: i % 2 === 0 ? "src-a" : "src-b",
        title: `Job ${i}`,
      }));

      expect(selectIntakeBatch(items, 0).selected.length).toBe(0);
      expect(selectIntakeBatch(items, 0).deferred.length).toBe(10);
      expect(selectIntakeBatch(items, -5).selected.length).toBe(0);
      expect(selectIntakeBatch(items, -5).deferred.length).toBe(10);
      expect(selectIntakeBatch(items, NaN).selected.length).toBe(0);
      expect(selectIntakeBatch(items, 100).selected.length).toBe(10);
      expect(selectIntakeBatch(items, 100).deferred.length).toBe(0);
      expect(selectIntakeBatch([], 50).selected.length).toBe(0);
      expect(selectIntakeBatch([], 50).deferred.length).toBe(0);
    });

    test("selectIntakeBatch safely handles empty and degenerate source identities", () => {
      const items = [
        { sourceUrl: "https://test.feed/job-1", sourceId: "", title: "Empty" },
        { sourceUrl: "https://test.feed/job-2", sourceId: "   ", title: "Spaces" },
        { sourceUrl: "https://test.feed/job-3", sourceId: "src-valid", title: "Valid" },
      ];
      const batch = selectIntakeBatch(items, 10);
      expect(batch.selected.length).toBe(3);
      expect(batch.deferred.length).toBe(0);
    });

    test("selectIntakeBatch resists massive single-source flood (1,000 RSS vs 3 ATS)", () => {
      const floodRss = Array.from({ length: 1000 }, (_, i) => ({
        sourceUrl: `https://rss.flood/job-${i}`,
        sourceId: "rss:flood",
        title: `Flood Job ${i}`,
      }));
      const ats1 = { sourceUrl: "https://ats.feed/hunt-1", sourceId: "workable:hunt-st", title: "Hunt 1" };
      const ats2 = { sourceUrl: "https://ats.feed/coconut-1", sourceId: "workable:coconutva", title: "Coconut 1" };
      const ats3 = { sourceUrl: "https://ats.feed/pearl-1", sourceId: "workable:pearl-talent", title: "Pearl 1" };

      const batch = selectIntakeBatch([...floodRss, ats1, ats2, ats3], 50);

      // All 3 ATS items must be selected
      expect(batch.selected.some((item) => item.sourceUrl === ats1.sourceUrl)).toBe(true);
      expect(batch.selected.some((item) => item.sourceUrl === ats2.sourceUrl)).toBe(true);
      expect(batch.selected.some((item) => item.sourceUrl === ats3.sourceUrl)).toBe(true);
      expect(batch.selected.length).toBe(50);
      expect(batch.deferred.length).toBe(953);
      expect(batch.selected.length + batch.deferred.length).toBe(1003);
    });

    test("selectIntakeBatch guarantees referential immutability and metadata preservation", () => {
      const item1 = Object.freeze({ sourceUrl: "https://test/1", sourceId: "src-1", clientTimezone: "EST" });
      const item2 = Object.freeze({ sourceUrl: "https://test/2", sourceId: "src-2", clientTimezone: "AEST" });
      const input = [item1, item2];
      const batch = selectIntakeBatch(input, 50);

      expect(batch.selected[0]).toBe(item1);
      expect(batch.selected[1]).toBe(item2);
      expect(input.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant 2: Workable Rotation Decoupling
  // ─────────────────────────────────────────────────────────────────────────
  describe("Invariant 2: Workable Rotation Decoupling (selectWorkableRotation)", () => {
    test("workable tenants respect 2-slot cap and durable 60m cooldown", () => {
      const agencies = [
        { companyName: "Coconut VA", atsPlatform: "workable", atsToken: "coconutva" },
        { companyName: "CrewBloom", atsPlatform: "workable", atsToken: "crewbloom" },
        { companyName: "Hunt St", atsPlatform: "workable", atsToken: "hunt-st" },
      ];
      const states = new Map<string, { lastAttemptAt: unknown }>([
        ["workable:coconutva", { lastAttemptAt: "2026-10-14T13:00:00.000Z" }], // 2 hours ago (DUE)
        ["workable:crewbloom", { lastAttemptAt: "2026-10-14T14:40:00.000Z" }], // 20 mins ago (COOLDOWN)
        ["workable:hunt-st", { lastAttemptAt: "2026-10-14T12:00:00.000Z" }],   // 3 hours ago (DUE)
      ]);

      const rotation = selectWorkableRotation({
        agencies,
        sourceKey: (row) => `${row.atsPlatform}:${row.atsToken}`,
        isPolicyEnabled: () => true,
        states,
        statesAvailable: true,
        observedAt: OBSERVED_NOW,
      });
      expect(rotation.selectedSourceIds.has("workable:coconutva")).toBe(true);
      expect(rotation.selectedSourceIds.has("workable:hunt-st")).toBe(true);
      expect(rotation.selectedSourceIds.has("workable:crewbloom")).toBe(false);
      expect(rotation.selectedSourceIds.size).toBe(2);

      // atsFetchCadenceSkip returns null for workable
      expect(atsFetchCadenceSkip("workable", "2026-10-14T14:40:00.000Z", OBSERVED_NOW, 3600000)).toBeNull();
    });

    test("atsFetchCadenceSkip is unconditionally neutralized for Workable platform", () => {
      const timestamps = [
        OBSERVED_NOW,
        new Date(Date.parse(OBSERVED_NOW) - 1).toISOString(),
        new Date(Date.parse(OBSERVED_NOW) + 3600000).toISOString(),
        "corrupt-non-iso-date",
        "",
        null,
        undefined,
      ];
      for (const ts of timestamps) {
        expect(atsFetchCadenceSkip("workable", ts as any, OBSERVED_NOW, 3600000)).toBeNull();
      }
    });

    test("selectWorkableRotation enforces millisecond boundary precision on 60-minute interval", () => {
      const nowMs = Date.parse(OBSERVED_NOW);
      const tenantCooldown = { companyName: "Tenant Cooldown", atsPlatform: "workable", atsToken: "cooldown" };
      const tenantDue = { companyName: "Tenant Due", atsPlatform: "workable", atsToken: "due" };

      const states = new Map<string, { lastAttemptAt: unknown }>([
        ["workable:cooldown", { lastAttemptAt: new Date(nowMs - 3599999).toISOString() }], // 59m 59.999s (COOLDOWN)
        ["workable:due", { lastAttemptAt: new Date(nowMs - 3600000).toISOString() }],      // exactly 60m 00.000s (DUE)
      ]);

      const rotation = selectWorkableRotation({
        agencies: [tenantCooldown, tenantDue],
        sourceKey: (row) => `${row.atsPlatform}:${row.atsToken}`,
        isPolicyEnabled: () => true,
        states,
        statesAvailable: true,
        observedAt: OBSERVED_NOW,
      });

      expect(rotation.selectedSourceIds.has("workable:due")).toBe(true);
      expect(rotation.selectedSourceIds.has("workable:cooldown")).toBe(false);
      const diagCooldown = rotation.diagnostics.find(d => d.sourceId === "workable:cooldown");
      expect(diagCooldown?.reason).toBe("COOLDOWN");
    });

    test("selectWorkableRotation rejects malformed, impossible calendar, and future attempt timestamps", () => {
      const agencies = [
        { companyName: "Non Leap", atsPlatform: "workable", atsToken: "non-leap" },
        { companyName: "Impossible Calendar", atsPlatform: "workable", atsToken: "impossible" },
        { companyName: "Future Tenant", atsPlatform: "workable", atsToken: "future" },
      ];
      const nowMs = Date.parse(OBSERVED_NOW);
      const states = new Map<string, { lastAttemptAt: unknown }>([
        ["workable:non-leap", { lastAttemptAt: "2026-02-29T12:00:00.000Z" }], // non-leap year
        ["workable:impossible", { lastAttemptAt: "2026-09-31T12:00:00.000Z" }], // Sept 31 does not exist
        ["workable:future", { lastAttemptAt: new Date(nowMs + 10000).toISOString() }], // 10s in future
      ]);

      const rotation = selectWorkableRotation({
        agencies,
        sourceKey: (row) => `${row.atsPlatform}:${row.atsToken}`,
        isPolicyEnabled: () => true,
        states,
        statesAvailable: true,
        observedAt: OBSERVED_NOW,
      });

      expect(rotation.selected.length).toBe(0);
      expect(rotation.diagnostics.find(d => d.sourceId === "workable:non-leap")?.reason).toBe("INVALID_ATTEMPT_TIME");
      expect(rotation.diagnostics.find(d => d.sourceId === "workable:impossible")?.reason).toBe("INVALID_ATTEMPT_TIME");
      expect(rotation.diagnostics.find(d => d.sourceId === "workable:future")?.reason).toBe("FUTURE_ATTEMPT_TIME");
    });

    test("selectWorkableRotation fails closed when states or observed clock are unavailable", () => {
      const agencies = [{ companyName: "Tenant A", atsPlatform: "workable", atsToken: "a" }];

      const stateUnavail = selectWorkableRotation({
        agencies,
        sourceKey: (row) => `${row.atsPlatform}:${row.atsToken}`,
        isPolicyEnabled: () => true,
        states: new Map(),
        statesAvailable: false,
        observedAt: OBSERVED_NOW,
      });
      expect(stateUnavail.unavailableReason).toBe("STATE_UNAVAILABLE");
      expect(stateUnavail.selected.length).toBe(0);

      const invalidClock = selectWorkableRotation({
        agencies,
        sourceKey: (row) => `${row.atsPlatform}:${row.atsToken}`,
        isPolicyEnabled: () => true,
        states: new Map(),
        statesAvailable: true,
        observedAt: "invalid-timestamp",
      });
      expect(invalidClock.unavailableReason).toBe("INVALID_OBSERVED_AT");
      expect(invalidClock.selected.length).toBe(0);
    });

    test("selectWorkableRotation strictly limits selection to exactly 2 when 20 due tenants exist", () => {
      const agencies = Array.from({ length: 20 }, (_, i) => ({
        companyName: `Agency ${i.toString().padStart(2, "0")}`,
        atsPlatform: "workable",
        atsToken: `token-${i}`,
      }));
      const states = new Map<string, { lastAttemptAt: unknown }>();
      for (const a of agencies) {
        states.set(`workable:${a.atsToken}`, { lastAttemptAt: "2026-10-14T10:00:00.000Z" });
      }

      const rotation = selectWorkableRotation({
        agencies,
        sourceKey: (row) => `${row.atsPlatform}:${row.atsToken}`,
        isPolicyEnabled: () => true,
        states,
        statesAvailable: true,
        observedAt: OBSERVED_NOW,
      });

      expect(rotation.selected.length).toBe(2);
      expect(rotation.selectedSourceIds.size).toBe(2);
      const deferredCount = rotation.diagnostics.filter(d => d.reason === "ROTATION_DEFERRED").length;
      expect(deferredCount).toBe(18);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant 3: Geo-Scope Sovereignty (decideTriage & geoGate)
  // ─────────────────────────────────────────────────────────────────────────
  describe("Invariant 3: Geo-Scope Sovereignty over AI Triage", () => {
    test("model rejection cannot override structured ph_only, apac_incl_ph, or worldwide scope", async () => {
      const mockEnv = {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              eligibleForFilipinos: false, // Model attempts to reject
              reason: "Model false negative hallucination",
              category: "tech",
              tags: ["typescript"],
            }),
          }),
        },
      };

      const scopes = ["ph_only", "apac_incl_ph", "worldwide"] as const;
      for (const scope of scopes) {
        const decision = await decideTriage(
          { title: "Software Engineer", description: "Remote role open worldwide", tags: [] },
          { geoScope: scope },
          mockEnv,
        );
        expect(decision.kind).toBe("eligible");
        if (decision.kind === "eligible") {
          expect(decision.triage.eligibleForFilipinos).toBe(true);
        }
      }
    });

    test("structured geo scopes publish even during complete AI outage", async () => {
      const emptyEnv = {}; // Complete AI outage (no Workers AI, no API keys)
      const scopes = ["ph_only", "apac_incl_ph", "worldwide"] as const;

      for (const scope of scopes) {
        const decision = await decideTriage(
          { title: "Virtual Assistant", description: "Global remote opportunity", tags: [] },
          { geoScope: scope },
          emptyEnv,
        );
        expect(decision.kind).toBe("eligible");
        if (decision.kind === "eligible") {
          expect(decision.triage.eligibleForFilipinos).toBe(true);
          expect(decision.triage.reason).toContain("AI unavailable");
        }
      }
    });

    test("deterministic phrase (US citizens only) overrides structured PH scope and rejects", async () => {
      const mockEnv = {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              eligibleForFilipinos: true,
              reason: "Model says ok",
              category: "tech",
              tags: [],
            }),
          }),
        },
      };

      const decision = await decideTriage(
        { title: "Virtual Assistant", description: "Hiring in the Philippines, but US citizens only required", tags: [] },
        { geoScope: "ph_only" },
        mockEnv,
      );
      expect(decision.kind).toBe("ineligible");
    });

    test("deterministic phrases override structured geo across all three positive scopes", async () => {
      const mockEnv = {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              eligibleForFilipinos: true,
              category: "tech",
              tags: [],
            }),
          }),
        },
      };

      const phSecurity = await decideTriage(
        { title: "DevOps Engineer", description: "Must possess active Top Secret clearance", tags: [] },
        { geoScope: "ph_only" },
        mockEnv,
      );
      expect(phSecurity.kind).toBe("ineligible");

      const apacW2 = await decideTriage(
        { title: "Support Lead", description: "W2 only; no C2C candidates allowed", tags: [] },
        { geoScope: "apac_incl_ph" },
        mockEnv,
      );
      expect(apacW2.kind).toBe("ineligible");

      const worldwideUsRes = await decideTriage(
        { title: "Backend Engineer", description: "Must reside in the US", tags: [] },
        { geoScope: "worldwide" },
        mockEnv,
      );
      expect(worldwideUsRes.kind).toBe("ineligible");
    });

    test("decideTriage catches unexpected triageJob exceptions and returns error kind", async () => {
      const throwingEnv = {
        AI: {
          run: async () => {
            throw new Error("Cloudflare worker CPU limit exceeded");
          },
        },
      };

      const decision = await decideTriage(
        { title: "Role", description: "Description", tags: [] },
        { geoScope: "unknown" },
        throwingEnv,
      );
      // In decideTriage, throwing AI inside triageJob falls through to cascade/error handling
      expect(decision.kind === "error" || decision.kind === "ai-unavailable").toBe(true);
    });

    test("US timezone requirement (EST only / PST only) does NOT reject", () => {
      const geo = geoGate({
        title: "Executive Assistant - EST hours overlap",
        description: "Must overlap with EST business hours. Philippines remote team.",
        locationRaw: "Philippines",
        locationType: "remote",
      });
      expect(geo.phEligibility).toBe("eligible_verified");
      expect(geo.geoScope).toBe("ph_only");
    });

    test("German / French localized terms (m/w/d, werkstudent, alternance) are rejected by geoGate before AI", () => {
      const mwd = geoGate({
        title: "Frontend Developer (m/w/d)",
        description: "Wir suchen Verstärkung für unser Team.",
        locationRaw: "Remote",
        locationType: "remote",
      });
      expect(mwd.phEligibility).toBe("ineligible");
      expect(mwd.geoScope).toBe("country_locked");

      const student = geoGate({
        title: "Werkstudent Software Engineering",
        description: "Flexible working hours for university students.",
        locationRaw: "Remote",
        locationType: "remote",
      });
      expect(student.phEligibility).toBe("ineligible");
      expect(student.geoScope).toBe("country_locked");

      const alternance = geoGate({
        title: "Développeur Web en Alternance",
        description: "Poste ouvert aux étudiants en contrat d'apprentissage.",
        locationRaw: "Remote",
        locationType: "remote",
      });
      expect(alternance.phEligibility).toBe("ineligible");
      expect(alternance.geoScope).toBe("country_locked");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant 4: Structured Country Pin Dominance over Title APAC Token
  // ─────────────────────────────────────────────────────────────────────────
  describe("Invariant 4: Structured Location Pin Dominance over Title APAC", () => {
    test("structured location Australia dominates title APAC token", () => {
      const upguard = geoGate({
        title: "Director of Customer Success, APAC",
        description: "Lead customer success operations across the region.",
        locationRaw: "Australia",
        locationType: "remote",
      });
      expect(upguard.phEligibility).toBe("ineligible");
      expect(upguard.geoScope).toBe("country_locked");
      expect(upguard.evidence).toContain("Australia");
    });

    test("title APAC token is suppressed by all authoritative country pins", () => {
      const nonPhCountries = [
        "United States", "Canada", "United Kingdom", "Germany", "Japan", "Singapore", "New Zealand",
      ];
      for (const country of nonPhCountries) {
        const res = geoGate({
          title: "Director of Operations (APAC)",
          description: "Regional director position.",
          locationRaw: country,
          locationType: "remote",
        });
        expect(res.phEligibility).toBe("ineligible");
        expect(res.geoScope).toBe("country_locked");
      }
    });

    test("title APAC token is suppressed by US state abbreviations and major foreign cities", () => {
      const placePins = ["Austin, TX", "San Francisco, CA", "London", "Sydney", "Berlin"];
      for (const pin of placePins) {
        const res = geoGate({
          title: "Customer Support Lead - APAC",
          description: "Lead support operations.",
          locationRaw: pin,
          locationType: "remote",
        });
        expect(res.phEligibility).toBe("ineligible");
        expect(res.geoScope).toBe("country_locked");
      }
    });

    test("title APAC token is suppressed by excluded regions", () => {
      const regions = ["EMEA", "North America"];
      for (const region of regions) {
        const res = geoGate({
          title: "Regional Marketing Manager (APAC)",
          description: "Marketing lead.",
          locationRaw: region,
          locationType: "remote",
        });
        expect(res.phEligibility).toBe("ineligible");
        expect(res.geoScope).toBe("region_excl_ph");
      }
    });

    test("legitimate Philippine locations retain ph_only eligibility when title contains APAC", () => {
      const phLocations = ["Philippines", "Manila, PH", "Cebu"];
      for (const loc of phLocations) {
        const res = geoGate({
          title: "Support Engineer (APAC)",
          description: "Technical support for APAC clients.",
          locationRaw: loc,
          locationType: "remote",
        });
        expect(res.phEligibility).toBe("eligible_verified");
        expect(res.geoScope).toBe("ph_only");
      }
    });

    test("title APAC token without structured non-PH country pin remains eligible", () => {
      const apacRemote = geoGate({
        title: "Customer Support Specialist - APAC",
        description: "Support customers across the Asia-Pacific region.",
        locationRaw: "APAC",
        locationType: "remote",
      });
      expect(apacRemote.phEligibility).toBe("eligible_verified");
      expect(apacRemote.geoScope).toBe("apac_incl_ph");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant 5: 0% Publication Proof for Known Counterexamples
  // ─────────────────────────────────────────────────────────────────────────
  describe("Invariant 5: 0% Publication Counterexamples (Pineapple, Affordable Staff, UpGuard)", () => {
    test("Pineapple Staffing (US-pinned & stale) remains 0% publishable", () => {
      const roles = [
        { title: "Business Virtual Assistant", locationRaw: "United States", locationType: "remote", postedAt: "2020-01-14T00:00:00.000Z" },
        { title: "Marketing Virtual Assistant", locationRaw: "United States", locationType: "remote", postedAt: "2021-06-20T00:00:00.000Z" },
        { title: "Executive Virtual Assistant", locationRaw: "United States", locationType: "remote", postedAt: "2022-11-05T00:00:00.000Z" },
      ];

      for (const role of roles) {
        const geo = geoGate(role);
        expect(geo.phEligibility).toBe("ineligible");
        expect(geo.geoScope).toBe("country_locked");

        const freshness = assessPostingFreshness(role.postedAt, OBSERVED_NOW);
        expect(freshness.state).toBe("STALE");

        const isPublishable = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
        expect(isPublishable).toBe(false);
      }
    });

    test("Affordable Staff (office-only Bacolod / hybrid) remains 0% publishable", () => {
      const roles = [
        { title: "Virtual Assistant (Dayshift)", locationRaw: "Bacolod, Philippines", locationType: "onsite", postedAt: "2026-10-14T08:00:00.000Z" },
        { title: "Administrative Assistant - Bacolod Office", locationRaw: "Bacolod, Philippines (onsite)", locationType: "remote", postedAt: "2026-10-14T08:00:00.000Z" },
        { title: "AU Accounting Specialist", locationRaw: "Bacolod, Philippines", locationType: "hybrid", postedAt: "2026-10-14T08:00:00.000Z" },
      ];

      for (const role of roles) {
        const geo = geoGate(role);
        expect(geo.phEligibility).toBe("ineligible");
        expect(geo.geoScope).toBe("country_locked");

        const shift = classifyShift({ title: role.title });
        // Even if shift is recognized, workplace ineligibility prevents publication
        const isPublishable = geo.phEligibility !== "ineligible";
        expect(isPublishable).toBe(false);
      }
    });

    test("UpGuard Australia role remains 0% publishable despite APAC title", () => {
      const upguard = {
        title: "Director of Customer Success, APAC",
        locationRaw: "Australia",
        locationType: "remote",
        postedAt: "2026-10-14T10:00:00.000Z",
      };

      const geo = geoGate(upguard);
      expect(geo.phEligibility).toBe("ineligible");
      expect(geo.geoScope).toBe("country_locked");

      const freshness = assessPostingFreshness(upguard.postedAt, OBSERVED_NOW);
      expect(freshness.state).toBe("WITHIN_WINDOW");

      const isPublishable = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
      expect(isPublishable).toBe(false);
    });

    test("4-way separation matrix: Employer trust cannot override geoGate or freshness", () => {
      // High-trust employer identity (e.g. registered PH entity), but role is in US and stale
      const highTrustWrongJob = {
        employerConfidence: "tier_a_verified",
        title: "Virtual Assistant",
        locationRaw: "United States",
        locationType: "remote",
        postedAt: "2020-01-01T00:00:00.000Z",
      };

      const geo = geoGate(highTrustWrongJob);
      const freshness = assessPostingFreshness(highTrustWrongJob.postedAt, OBSERVED_NOW);

      // Invariant: Employer trust != Job validity != PH eligibility != Role relevance
      const isPublishable = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
      expect(isPublishable).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Regex Precision: Service Delivery Manager not dropped by logistics regex
  // ─────────────────────────────────────────────────────────────────────────
  describe("Regex Precision: Tech Service Delivery Roles", () => {
    test("Service Delivery Manager is not dropped as physical logistics", () => {
      const relevant = isRelevantForHub("Service Delivery Manager", "Lead technical service delivery for remote SaaS clients.");
      expect(relevant).toBe(true);

      const driver = isRelevantForHub("Delivery Driver", "Deliver parcels locally using personal vehicle.");
      expect(driver).toBe(false);
    });
  });
});
