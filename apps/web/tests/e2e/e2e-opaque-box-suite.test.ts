import { describe, expect, test } from "bun:test";
import {
  geoGate,
  assessPostingFreshness,
  classifyShift,
  decideTriage,
  findTrustedEmployer,
  isTrustedPhEmployer,
  TRUSTED_PH_EMPLOYERS,
  PipelineLossTracker,
  PIPELINE_STAGES,
  chunkArray,
  maxRowsPerD1Batch,
  D1_MAX_BOUND_PARAMETERS,
  hasExplicitNonRemoteLocationType,
  resolvePublicationOutboundUrl,
  sha256Hex,
} from "@va-hub/scraper";
import { isRelevantForHub } from "@va-hub/scraper/json";
import {
  selectIntakeBatch,
  buildSourceIdsByUrl,
  mergeSourceIdsByUrl,
  sourceIdsForUrls,
} from "../../src/lib/conditional-state";
import {
  selectWorkableRotation,
  WORKABLE_MIN_INTERVAL_MS,
} from "../../src/lib/workable-rotation";
import {
  omitKnownSourceUrls,
  atsFetchCadenceSkip,
} from "../../src/pages/api/cron/scrape";
import {
  slicePublicJobs,
  type PublicJob,
} from "../../src/lib/public-board";

const OBSERVED_NOW = "2026-10-15T12:00:00.000Z";
const OBSERVED_NOW_MS = Date.parse(OBSERVED_NOW);

describe("E2E Opaque-Box Test Suite — Generation 13 Pipeline Architecture", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: FEATURE COVERAGE (>=5 tests per Feature = 30 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Tier 1: Feature Coverage", () => {
    // ─── Feature 1: Baseline Survey & Code Verification ──────────────────────
    describe("Feature 1: Baseline Survey & Code Verification", () => {
      test("F01-T1-01: Geo-scope sovereignty preserves ph_only against downstream model rejection", async () => {
        const fakeModelEnv = {
          AI: {
            run: async () => ({
              response: JSON.stringify({
                eligibleForFilipinos: false,
                reason: "Model denies eligibility",
                confidence: 0.9,
              }),
            }),
          },
        };
        const decision = await decideTriage(
          { title: "Virtual Assistant", description: "Remote assistant for PH team" },
          { geoScope: "ph_only" },
          fakeModelEnv,
        );
        expect(decision.kind).toBe("eligible");
        if (decision.kind === "eligible") {
          expect(decision.triage.eligibleForFilipinos).toBe(true);
          expect(decision.triage.reason).toContain("Structured ph_only stands over model");
        }
      });

      test("F01-T1-02: Clean URL normalization and outbound apply resolution", () => {
        const sourceUrl = "https://boards.greenhouse.io/agency/jobs/98765";
        const applicationUrl = "https://boards.greenhouse.io/agency/jobs/98765?gh_jid=98765";
        const resolved = resolvePublicationOutboundUrl(sourceUrl, applicationUrl);
        expect(resolved).toBe(applicationUrl);

        const invalidAppUrl = "javascript:alert(1)";
        const fallback = resolvePublicationOutboundUrl("https://weworkremotely.com/jobs/12345?ref=test", invalidAppUrl);
        expect(fallback).toBe("https://weworkremotely.com/jobs/12345?ref=test");
      });

      test("F01-T1-03: Hash consistency ensures deterministic content deduplication", async () => {
        const text = "Remote Executive Assistant Philippines";
        const hash1 = await sha256Hex(text);
        const hash2 = await sha256Hex(text);
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);
        expect(hash1).not.toBe(await sha256Hex("Remote Executive Assistant Australia"));
      });

      test("F01-T1-04: Publication freshness assessment accepts fresh (<30d) posting dates", () => {
        const freshDate = "2026-10-01T12:00:00.000Z"; // 14 days old
        const assessment = assessPostingFreshness(freshDate, OBSERVED_NOW);
        expect(assessment.state).toBe("WITHIN_WINDOW");
        expect(assessment.postedAt).toBe(freshDate);
      });

      test("F01-T1-05: Publication remote evaluation accepts remote and rejects non-remote", () => {
        expect(hasExplicitNonRemoteLocationType("onsite")).toBe(true);
        expect(hasExplicitNonRemoteLocationType("hybrid")).toBe(true);
        expect(hasExplicitNonRemoteLocationType("remote")).toBe(false);
        expect(hasExplicitNonRemoteLocationType(null)).toBe(false);
        expect(hasExplicitNonRemoteLocationType(undefined)).toBe(false);
      });
    });

    // ─── Feature 2: Behavioral Bloat Elimination & Gate Invariants ───────────
    describe("Feature 2: Behavioral Bloat Elimination & Gate Invariants", () => {
      test("F02-T1-01: Consolidated geoGate returns authoritative verdict for clean Philippine remote vacancy", () => {
        const verdict = geoGate({
          title: "Senior Bookkeeper",
          description: "Full-time remote role for Filipino accountants.",
          locationRaw: "Philippines",
        });
        expect(verdict.phEligibility).toBe("eligible_verified");
        expect(verdict.geoScope).toBe("ph_only");
        expect(verdict.evidence).toContain("Philippines");
      });

      test("F02-T1-02: Step 2b early rejection halts European localized non-remote vacancy (m/w/d) before AI triage", () => {
        const verdict = geoGate({
          title: "Sachbearbeiter (m/w/d)",
          description: "Vollzeitstelle vor Ort in Berlin.",
          locationRaw: "Berlin, Germany",
        });
        expect(verdict.phEligibility).toBe("ineligible");
        expect(verdict.geoScope).toBe("country_locked");
        expect(verdict.evidence).toContain("Domestic localized non-English or student role");
      });

      test("F02-T1-03: Title token APAC does not override structured country location pin (Australia)", () => {
        const verdict = geoGate({
          title: "Director of Customer Success, APAC",
          description: "Leading sales and customer retention across the region.",
          locationRaw: "Sydney, Australia",
        });
        expect(verdict.phEligibility).toBe("ineligible");
        expect(verdict.geoScope).toBe("country_locked");
      });

      test("F02-T1-04: Absence of timezone exclusions in geo regex allows legitimate US-hours VA roles", () => {
        const verdict = geoGate({
          title: "Virtual Executive Assistant (EST Hours)",
          description: "Remote assistant in the Philippines to support US East Coast executives.",
          locationRaw: "Philippines",
        });
        expect(verdict.phEligibility).toBe("eligible_verified");
        expect(verdict.geoScope).toBe("ph_only");
      });

      test("F02-T1-05: Physical logistics role filter does not drop tech management roles like Service Delivery Manager", () => {
        const isSdmRelevant = isRelevantForHub(
          "Service Delivery Manager",
          "Overseeing SaaS client delivery, escalation protocols, and infrastructure operations.",
        );
        expect(isSdmRelevant).toBe(true);

        const isDriverRelevant = isRelevantForHub(
          "Delivery Driver",
          "Deliver packages locally using warehouse vans.",
        );
        expect(isDriverRelevant).toBe(false);
      });
    });

    // ─── Feature 3: Trusted Employer Evidence & Dayshift Recognition ─────────
    describe("Feature 3: Trusted Employer Evidence & Dayshift Recognition", () => {
      test("F03-T1-01: Employer discovery metadata leaves missing opening geography unknown", () => {
        const verdict = geoGate({
          title: "General Virtual Assistant",
          description: "Support client communications and scheduling.",
          company: "Hunt St",
          sourceId: "workable:hunt-st",
        });
        expect(verdict.phEligibility).toBe("unclear");
        expect(verdict.geoScope).toBe("unknown");
        expect(verdict.evidence).toBe("No deterministic geo signal");
      });

      test("F03-T1-02: 4-way separation matrix blocks trusted employer openings when country lock is present", () => {
        const verdict = geoGate({
          title: "Client Success Specialist",
          description: "Must reside permanently in the United States.",
          locationRaw: "United States",
          company: "Hunt St",
          sourceId: "workable:hunt-st",
        });
        expect(verdict.phEligibility).toBe("ineligible");
        expect(verdict.geoScope).toBe("country_locked");
      });

      test("F03-T1-03: Shift classifier extracts explicit PHT daytime span", () => {
        const shift = classifyShift({
          title: "Administrative Assistant",
          description: "Working schedule is 8:00 AM - 5:00 PM Manila Time Monday through Friday.",
        });
        expect(shift.isDayshift).toBe(true);
        expect(shift.category).toBe("day_shift");
        expect(shift.phWorkingHours).toBe("8:00 AM - 5:00 PM Manila Time");
      });

      test("F03-T1-04: Shift classifier recognizes Australian/APAC business hours as day_shift", () => {
        const shift = classifyShift({
          title: "AU Tax Accountant",
          description: "Client operates on Australian business hours (AEST).",
        });
        expect(shift.isDayshift).toBe(true);
        expect(shift.category).toBe("day_shift");
      });

      test("F03-T1-05: Shift classifier leaves unstated hours as unknown without schedule fabrication", () => {
        const shift = classifyShift({
          title: "Social Media Manager",
          description: "Manage content calendar and community engagement for remote brands.",
        });
        expect(shift.isDayshift).toBe(false);
        expect(shift.category).toBe("unknown");
        expect(shift.phWorkingHours).toBeNull();
      });
    });

    // ─── Feature 4: 13-Stage Loss Tracking & Systematic Reconciliation ───────
    describe("Feature 4: 13-Stage Loss Tracking & Systematic Reconciliation", () => {
      test("F04-T1-01: PipelineLossTracker records stage entry and pass counts across all 13 canonical stages", () => {
        const tracker = new PipelineLossTracker();
        for (const stage of PIPELINE_STAGES) {
          tracker.recordPass(stage, 1);
        }
        const summary = tracker.getStageSummary();
        for (const stage of PIPELINE_STAGES) {
          expect(summary[stage].entered).toBe(1);
          expect(summary[stage].passed).toBe(1);
          expect(summary[stage].dropped).toBe(0);
        }
      });

      test("F04-T1-02: Granular loss recording attributes dropped items with explicit stage and machine-readable reason code", () => {
        const tracker = new PipelineLossTracker();
        tracker.recordLoss("ph_eligibility", {
          id: "job-001",
          sourceId: "workable:hunt-st",
          company: "Hunt St",
          title: "Onsite Assistant",
          reasonCode: "GEO_ONSITE_REQUIRED",
          reasonDetail: "Requires physical attendance",
        });
        const summary = tracker.getStageSummary();
        expect(summary.ph_eligibility.dropped).toBe(1);
        expect(summary.ph_eligibility.reasons["GEO_ONSITE_REQUIRED"]).toBe(1);
        expect(tracker.getLosses()).toHaveLength(1);
        expect(tracker.getLosses()[0].reasonCode).toBe("GEO_ONSITE_REQUIRED");
      });

      test("F04-T1-03: Employer reconciliation correctly calculates recall rate and stage dropoffs", () => {
        const tracker = new PipelineLossTracker();
        tracker.recordLoss("ph_eligibility", {
          id: "job-001",
          sourceId: "workable:hunt-st",
          company: "Hunt St",
          reasonCode: "GEO_COUNTRY_LOCKED",
          reasonDetail: "US locked",
        });
        tracker.recordLoss("scoring", {
          id: "job-002",
          sourceId: "workable:hunt-st",
          company: "Hunt St",
          reasonCode: "FRESHNESS_STALE",
          reasonDetail: "Exceeded 30 days",
        });

        const recon = tracker.reconcileEmployer("hunt-st", "Hunt St", 10);
        expect(recon.authoritativeOpenings).toBe(10);
        expect(recon.published).toBe(8);
        expect(recon.recallRate).toBeCloseTo(0.8, 2);
        expect(recon.dropoffsByStage.ph_eligibility).toBe(1);
        expect(recon.dropoffsByStage.scoring).toBe(1);
      });

      test("F04-T1-04: Reconciliation marks high-performing employer (>=50% recall) as HEALTHY", () => {
        const tracker = new PipelineLossTracker();
        const recon = tracker.reconcileEmployer("coconutva", "Coconut VA", 10);
        expect(recon.status).toBe("HEALTHY");
      });

      test("F04-T1-05: Reconciliation marks low-performing employer (<50% recall or 0 published) as COVERAGE_DEFECT", () => {
        const tracker = new PipelineLossTracker();
        for (let i = 0; i < 8; i++) {
          tracker.recordLoss("fetch", {
            id: `job-missing-${i}`,
            sourceId: "workable:low-recall",
            company: "Low Recall",
            reasonCode: "HTTP_500",
            reasonDetail: "Server error",
          });
        }
        const recon = tracker.reconcileEmployer("low-recall", "Low Recall", 10);
        expect(recon.status).toBe("COVERAGE_DEFECT");
        expect(recon.recallRate).toBe(0.2);
      });
    });

    // ─── Feature 5: Multi-Source Intake Fairness & Throughput Scaling ────────
    describe("Feature 5: Multi-Source Intake Fairness & Throughput Scaling", () => {
      test("F05-T1-01: selectIntakeBatch allocates slots round-robin across distinct source identifiers", () => {
        const items = [
          { sourceId: "source-a", sourceUrl: "https://a.com/1" },
          { sourceId: "source-a", sourceUrl: "https://a.com/2" },
          { sourceId: "source-b", sourceUrl: "https://b.com/1" },
          { sourceId: "source-b", sourceUrl: "https://b.com/2" },
        ];
        const batch = selectIntakeBatch(items, 3);
        expect(batch.selected).toHaveLength(3);
        const sourceACount = batch.selected.filter(item => item.sourceId === "source-a").length;
        const sourceBCount = batch.selected.filter(item => item.sourceId === "source-b").length;
        expect(sourceACount).toBeGreaterThanOrEqual(1);
        expect(sourceBCount).toBeGreaterThanOrEqual(1);
        expect(batch.deferred).toHaveLength(1);
      });

      test("F05-T1-02: Tail ATS items are selected even when preceded by full head of RSS items", () => {
        const rss = Array.from({ length: 50 }, (_, i) => ({
          sourceId: "we-work-remotely",
          sourceUrl: `https://wwr.com/job-${i}`,
        }));
        const ats = {
          sourceId: "workable:hunt-st",
          sourceUrl: "https://apply.workable.com/hunt-st/j/025-1379",
        };
        const batch = selectIntakeBatch([...rss, ats], 50);
        expect(batch.selected).toHaveLength(50);
        expect(batch.selected.some(item => item.sourceUrl === ats.sourceUrl)).toBe(true);
        expect(batch.deferred).toHaveLength(1);
      });

      test("F05-T1-03: Subsequent pass admits deferred ATS items alongside new RSS stream", () => {
        const deferredHunt = [
          { sourceId: "workable:hunt-st", sourceUrl: "https://apply.workable.com/hunt-st/j/hunt-def-1" },
          { sourceId: "workable:hunt-st", sourceUrl: "https://apply.workable.com/hunt-st/j/hunt-def-2" },
        ];
        const newRss = Array.from({ length: 50 }, (_, i) => ({
          sourceId: "we-work-remotely",
          sourceUrl: `https://wwr.com/new-${i}`,
        }));
        const pass2 = selectIntakeBatch([...newRss, ...deferredHunt], 50);
        expect(pass2.selected.some(item => item.sourceUrl === deferredHunt[0].sourceUrl)).toBe(true);
        expect(pass2.selected.some(item => item.sourceUrl === deferredHunt[1].sourceUrl)).toBe(true);
      });

      test("F05-T1-04: omitKnownSourceUrls strictly filters out URLs already present in repository storage", () => {
        const known = new Set(["https://already.seen/job-1"]);
        const candidates = [
          { sourceUrl: "https://already.seen/job-1" },
          { sourceUrl: "https://fresh.new/job-2" },
        ];
        const filtered = omitKnownSourceUrls(candidates, known);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].sourceUrl).toBe("https://fresh.new/job-2");
      });

      test("F05-T1-05: Workable rotation enforces 2-slot cap and durable 60-minute interval", () => {
        const agencies = [
          { companyName: "Agency 1", atsPlatform: "workable", atsToken: "token-1" },
          { companyName: "Agency 2", atsPlatform: "workable", atsToken: "token-2" },
          { companyName: "Agency 3", atsPlatform: "workable", atsToken: "token-3" },
        ];
        const rotation = selectWorkableRotation({
          agencies,
          sourceKey: a => `workable:${a.atsToken}`,
          isPolicyEnabled: () => true,
          states: new Map(),
          statesAvailable: true,
          observedAt: OBSERVED_NOW,
        });
        expect(rotation.selected).toHaveLength(2);
        expect(rotation.diagnostics.filter(d => d.reason === "ROTATION_DEFERRED")).toHaveLength(1);
      });
    });

    // ─── Feature 6: Full Pipeline & D1 Parameter Budget ──────────────────────
    describe("Feature 6: Full Pipeline & D1 Parameter Budget", () => {
      test("F06-T1-01: D1 batch chunker ensures statement parameter count <= 100", () => {
        const columnsPerRow = 28;
        const maxRows = maxRowsPerD1Batch(columnsPerRow);
        expect(maxRows).toBe(3);
        expect(maxRows * columnsPerRow).toBe(84);
        expect(maxRows * columnsPerRow).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMETERS);

        const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
        const chunks = chunkArray(items, maxRows);
        expect(chunks).toHaveLength(4);
        for (const chunk of chunks) {
          expect(chunk.length * columnsPerRow).toBeLessThanOrEqual(100);
        }
      });

      test("F06-T1-02: slicePublicJobs queries public snapshot with pagination", () => {
        const mockJobs: PublicJob[] = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          title: `Job ${i + 1}`,
          company: "Company",
          type: "VA",
          sourceUrl: `https://job.url/${i + 1}`,
          sourcePlatform: "Workable",
          sourceId: "workable:test",
          tags: ["va"],
          category: "VA",
          experienceLevel: "mid",
          postedAt: OBSERVED_NOW,
          scrapedAt: OBSERVED_NOW,
          geoScope: "ph_only",
          phEligibility: "eligible_verified",
          geoEvidence: "PH",
          description: "Description",
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
        }));
        const page1 = slicePublicJobs(mockJobs, { offset: 0, limit: 3 });
        expect(page1.total).toBe(10);
        expect(page1.jobs).toHaveLength(3);
        // byEffectiveDesc orders by effectivePostedMs then by id DESC
        expect(page1.jobs[0].id).toBe(10);
        expect(page1.jobs[1].id).toBe(9);
        expect(page1.jobs[2].id).toBe(8);

        const page2 = slicePublicJobs(mockJobs, { offset: 3, limit: 3 });
        expect(page2.jobs).toHaveLength(3);
        expect(page2.jobs[0].id).toBe(7);
      });

      test("F06-T1-03: slicePublicJobs accurately filters public jobs by shift: day_shift", () => {
        const dayJob: PublicJob = {
          id: 1,
          title: "Day Shift Assistant",
          company: "PH Agency",
          type: "VA",
          sourceUrl: "https://job/1",
          sourcePlatform: "Workable",
          sourceId: "workable:ph",
          tags: [],
          category: "VA",
          experienceLevel: "mid",
          postedAt: OBSERVED_NOW,
          scrapedAt: OBSERVED_NOW,
          geoScope: "ph_only",
          phEligibility: "eligible_verified",
          geoEvidence: "PH",
          description: "8am - 5pm Manila time",
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
          isDayshift: true,
          shiftCategory: "day_shift",
        };
        const nightJob: PublicJob = {
          ...dayJob,
          id: 2,
          title: "Night Shift VA",
          description: "Graveyard shift",
          isDayshift: false,
          shiftCategory: "night_shift",
        };

        const result = slicePublicJobs([dayJob, nightJob], {
          shift: "day_shift",
          offset: 0,
          limit: 10,
        });
        expect(result.total).toBe(1);
        expect(result.jobs[0].id).toBe(1);
      });

      test("F06-T1-04: slicePublicJobs filters by category (VA)", () => {
        const vaJob: PublicJob = {
          id: 1,
          title: "Virtual Assistant",
          company: "PH Agency",
          type: "VA",
          sourceUrl: "https://job/1",
          sourcePlatform: "Workable",
          sourceId: "workable:ph",
          tags: [],
          category: "VA",
          experienceLevel: "mid",
          postedAt: OBSERVED_NOW,
          scrapedAt: OBSERVED_NOW,
          geoScope: "ph_only",
          phEligibility: "eligible_verified",
          geoEvidence: "PH",
          description: "VA role",
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
        };
        const devJob: PublicJob = {
          ...vaJob,
          id: 2,
          title: "Full Stack Engineer",
          category: "Development",
        };

        const result = slicePublicJobs([vaJob, devJob], {
          category: "VA",
          offset: 0,
          limit: 10,
        });
        expect(result.total).toBe(1);
        expect(result.jobs[0].id).toBe(1);
      });

      test("F06-T1-05: Freshness filter (fresh: 24h) restricts results to jobs scraped within 24 hours", () => {
        const recentJob: PublicJob = {
          id: 1,
          title: "Recent Job",
          company: "Agency",
          type: "VA",
          sourceUrl: "https://job/1",
          sourcePlatform: "Workable",
          sourceId: "workable:ph",
          tags: [],
          category: "VA",
          experienceLevel: "mid",
          postedAt: OBSERVED_NOW,
          scrapedAt: new Date(OBSERVED_NOW_MS - 2 * 3600_000).toISOString(), // 2h ago
          geoScope: "ph_only",
          phEligibility: "eligible_verified",
          geoEvidence: "PH",
          description: "Recent",
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
        };
        const oldJob: PublicJob = {
          ...recentJob,
          id: 2,
          title: "Old Job",
          scrapedAt: new Date(OBSERVED_NOW_MS - 48 * 3600_000).toISOString(), // 48h ago
        };

        const result = slicePublicJobs([recentJob, oldJob], {
          fresh: "24h",
          offset: 0,
          limit: 10,
          now: OBSERVED_NOW_MS,
        });
        expect(result.total).toBe(1);
        expect(result.jobs[0].id).toBe(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests per Feature = 30 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Tier 2: Boundary & Corner Cases", () => {
    // ─── Feature 1 Boundaries ────────────────────────────────────────────────
    describe("Feature 1 Boundaries: Freshness & Timestamps", () => {
      test("F01-T2-01: Posting date at exact 30-day boundary (720h) accepted, 720h + 1s rejected", () => {
        const exact30DaysMs = OBSERVED_NOW_MS - 30 * 86_400_000;
        const exactDate = new Date(exact30DaysMs).toISOString();
        const staleDate = new Date(exact30DaysMs - 1000).toISOString();

        expect(assessPostingFreshness(exactDate, OBSERVED_NOW).state).toBe("WITHIN_WINDOW");
        expect(assessPostingFreshness(staleDate, OBSERVED_NOW).state).toBe("STALE");
      });

      test("F01-T2-02: Future dates (timestamp > reference now) are rejected as FUTURE", () => {
        const futureDate = new Date(OBSERVED_NOW_MS + 5000).toISOString();
        expect(assessPostingFreshness(futureDate, OBSERVED_NOW).state).toBe("FUTURE");
      });

      test("F01-T2-03: Malformed, impossible calendar dates (2026-09-31) rejected as INVALID", () => {
        expect(assessPostingFreshness("2026-09-31T12:00:00.000Z", OBSERVED_NOW).state).toBe("INVALID");
        expect(assessPostingFreshness("2026-02-30T12:00:00.000Z", OBSERVED_NOW).state).toBe("INVALID");
        expect(assessPostingFreshness("not-a-date", OBSERVED_NOW).state).toBe("INVALID");
      });

      test("F01-T2-04: Null, undefined, empty, or whitespace-only posting dates return UNKNOWN", () => {
        expect(assessPostingFreshness(null, OBSERVED_NOW).state).toBe("UNKNOWN");
        expect(assessPostingFreshness(undefined, OBSERVED_NOW).state).toBe("UNKNOWN");
        expect(assessPostingFreshness("", OBSERVED_NOW).state).toBe("UNKNOWN");
        expect(assessPostingFreshness("   ", OBSERVED_NOW).state).toBe("UNKNOWN");
      });

      test("F01-T2-05: Leap day (2024-02-29) evaluates accurately within valid window", () => {
        const leapDay = "2024-02-29T12:00:00.000Z";
        const leapObserved = "2024-03-10T12:00:00.000Z"; // 10 days later
        const result = assessPostingFreshness(leapDay, leapObserved);
        expect(result.state).toBe("WITHIN_WINDOW");
      });
    });

    // ─── Feature 2 Boundaries ────────────────────────────────────────────────
    describe("Feature 2 Boundaries: Gate Text & Regex Robustness", () => {
      test("F02-T2-01: Empty, whitespace-only, or null title and description return unknown/unclear", () => {
        const verdict = geoGate({ title: "", description: null });
        expect(verdict.phEligibility).toBe("unclear");
        expect(verdict.geoScope).toBe("unknown");
      });

      test("F02-T2-02: Massive input text (25,000+ characters) processes within bounded execution time", () => {
        const massiveText = "Philippines remote job opportunity ".repeat(700);
        const start = performance.now();
        const verdict = geoGate({
          title: "Virtual Assistant",
          description: massiveText,
        });
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(150); // Under 150ms execution
        expect(verdict.phEligibility).toBe("eligible_verified");
      });

      test("F02-T2-03: Unicode emojis and international characters in vacancy title preserve word boundaries", () => {
        const verdict = geoGate({
          title: "✨ Virtual Assistant ✨ (Philippines) 🌟 100% Remote",
          description: "Administrative support for global clients.",
          locationRaw: "Philippines",
        });
        expect(verdict.phEligibility).toBe("eligible_verified");
        expect(verdict.geoScope).toBe("ph_only");
      });

      test("F02-T2-04: Embedded HTML tags and script injections are handled cleanly without false positives", () => {
        const verdict = geoGate({
          title: "<script>alert('xss')</script> Virtual Assistant",
          description: "<p>Work from home anywhere in the <strong>Philippines</strong>.</p>",
          locationRaw: "Philippines",
        });
        expect(verdict.phEligibility).toBe("eligible_verified");
        expect(verdict.geoScope).toBe("ph_only");
      });

      test("F02-T2-05: Multiline and case-insensitive boundary matching for country exclusions", () => {
        const verdict = geoGate({
          title: "Software Engineer",
          description: "Requirements:\nMust be a\nUnited States\nResident Only.",
          locationRaw: "United States",
        });
        expect(verdict.phEligibility).toBe("ineligible");
        expect(verdict.geoScope).toBe("country_locked");
      });
    });

    // ─── Feature 3 Boundaries ────────────────────────────────────────────────
    describe("Feature 3 Boundaries: Employer Matching & Schedule Formats", () => {
      test("F03-T2-01: Punctuation, dashes, and casing variants resolve in trusted employer lookup", () => {
        expect(findTrustedEmployer("20 Four 7 VA")?.id).toBe("20four7va");
        expect(findTrustedEmployer("crew-bloom")?.id).toBe("crewbloom");
        expect(findTrustedEmployer("HELLORACHE")?.id).toBe("hello-rache");
        expect(findTrustedEmployer("workable:coconutva")?.id).toBe("coconutva");
      });

      test("F03-T2-02: Negated schedule phrases (no day shift) strictly resolve to unknown or non-dayshift", () => {
        const shift = classifyShift({
          title: "Customer Support Rep",
          description: "Strictly no day shift available; fixed night shift only.",
        });
        expect(shift.isDayshift).toBe(false);
      });

      test("F03-T2-03: Conflicting schedule markers (morning shift and night shift) resolve to unknown", () => {
        const shift = classifyShift({
          title: "Operations Associate",
          description: "Rotational assignments: morning shift and night shift required depending on project.",
        });
        expect(shift.category).toBe("unknown");
        expect(shift.isDayshift).toBe(false);
      });

      test("F03-T2-04: Non-standard PHT span formats (7am to 4pm Manila Time) extract span", () => {
        const shift1 = classifyShift({
          title: "Bookkeeper",
          description: "Shift is 7am to 4pm Manila Time.",
        });
        expect(shift1.isDayshift).toBe(true);
        expect(shift1.phWorkingHours).toBe("7am to 4pm Manila Time");

        const shift2 = classifyShift({
          title: "Data Analyst",
          description: "Working hours: 9:00 am - 6:00 pm (PHT).",
        });
        expect(shift2.isDayshift).toBe(true);
        expect(shift2.phWorkingHours).toBe("9:00 am - 6:00 pm (PHT)");
      });

      test("F03-T2-05: US client timezone (EST/PST) in contact details does not falsely classify job as night shift", () => {
        const shift = classifyShift({
          clientTimezone: "EST",
          title: "Executive Assistant",
          description: "Headquartered in New York, inquiries can reference EST. Flexible asynchronous work.",
        });
        expect(shift.category).toBe("flexible");
        expect(shift.isDayshift).toBe(false);
      });
    });

    // ─── Feature 4 Boundaries ────────────────────────────────────────────────
    describe("Feature 4 Boundaries: Loss Tracker & Reconciliation Limits", () => {
      test("F04-T2-01: Empty loss tracker returns valid zeroed summary across all 13 stages", () => {
        const tracker = new PipelineLossTracker();
        const summary = tracker.getStageSummary();
        for (const stage of PIPELINE_STAGES) {
          expect(summary[stage].entered).toBe(0);
          expect(summary[stage].passed).toBe(0);
          expect(summary[stage].dropped).toBe(0);
          expect(Object.keys(summary[stage].reasons)).toHaveLength(0);
        }
      });

      test("F04-T2-02: Single opening rejected at Stage 1 leaves remaining 12 stages with 0 entered", () => {
        const tracker = new PipelineLossTracker();
        tracker.recordLoss("source", {
          id: "job-src-err",
          sourceId: "workable:failed",
          reasonCode: "ROBOTS_DISALLOWED",
          reasonDetail: "Blocked by robots.txt",
        });
        const summary = tracker.getStageSummary();
        expect(summary.source.dropped).toBe(1);
        for (const stage of PIPELINE_STAGES.slice(1)) {
          expect(summary[stage].entered).toBe(0);
        }
      });

      test("F04-T2-03: Complete loss scenario (100% dropped at ph_eligibility) reconciles with 0% recall", () => {
        const tracker = new PipelineLossTracker();
        for (let i = 0; i < 5; i++) {
          tracker.recordLoss("ph_eligibility", {
            id: `job-lock-${i}`,
            sourceId: "workable:test",
            reasonCode: "GEO_COUNTRY_LOCKED",
            reasonDetail: "US locked",
          });
        }
        const recon = tracker.reconcileEmployer("test", "Test", 5);
        expect(recon.recallRate).toBe(0);
        expect(recon.published).toBe(0);
        expect(recon.status).toBe("COVERAGE_DEFECT");
      });

      test("F04-T2-04: Employer with 0 authoritative openings reconciles cleanly without division-by-zero", () => {
        const tracker = new PipelineLossTracker();
        const recon = tracker.reconcileEmployer("empty", "Empty Agency", 0);
        expect(recon.recallRate).toBe(1);
        expect(Number.isFinite(recon.recallRate)).toBe(true);
        expect(recon.published).toBe(0);
      });

      test("F04-T2-05: Multiple duplicate drops for same vacancy identity correctly increment stage tallies", () => {
        const tracker = new PipelineLossTracker();
        for (let i = 0; i < 5; i++) {
          tracker.recordLoss("dedup", {
            id: "dup-job-1",
            sourceId: "rss:wwr",
            reasonCode: "DEDUP_URL_EXISTS",
            reasonDetail: "Duplicate URL in lake",
          });
        }
        expect(tracker.getStageSummary().dedup.dropped).toBe(5);
        expect(tracker.getStageSummary().dedup.reasons["DEDUP_URL_EXISTS"]).toBe(5);
      });
    });

    // ─── Feature 5 Boundaries ────────────────────────────────────────────────
    describe("Feature 5 Boundaries: Intake Batching Limits & Zero-State", () => {
      test("F05-T2-01: Intake batching with limit = 0 selects 0 items and defers all input items", () => {
        const items = [{ sourceId: "a", sourceUrl: "https://a.com/1" }];
        const batch = selectIntakeBatch(items, 0);
        expect(batch.selected).toHaveLength(0);
        expect(batch.deferred).toHaveLength(1);
      });

      test("F05-T2-02: Intake batching with negative or NaN limit defaults safely to 0 selected items", () => {
        const items = [{ sourceId: "a", sourceUrl: "https://a.com/1" }];
        expect(selectIntakeBatch(items, -5).selected).toHaveLength(0);
        expect(selectIntakeBatch(items, NaN).selected).toHaveLength(0);
      });

      test("F05-T2-03: Intake batching with limit >= items.length selects all items and defers 0", () => {
        const items = [
          { sourceId: "a", sourceUrl: "https://a.com/1" },
          { sourceId: "b", sourceUrl: "https://b.com/1" },
        ];
        const batch = selectIntakeBatch(items, 10);
        expect(batch.selected).toHaveLength(2);
        expect(batch.deferred).toHaveLength(0);
      });

      test("F05-T2-04: Single-source homogeneous array under partial cap splits cleanly", () => {
        const items = Array.from({ length: 10 }, (_, i) => ({
          sourceId: "homogeneous",
          sourceUrl: `https://test.com/${i}`,
        }));
        const batch = selectIntakeBatch(items, 4);
        expect(batch.selected).toHaveLength(4);
        expect(batch.deferred).toHaveLength(6);
      });

      test("F05-T2-05: Empty item array input to selectIntakeBatch returns empty selected and deferred", () => {
        const batch = selectIntakeBatch([], 50);
        expect(batch.selected).toHaveLength(0);
        expect(batch.deferred).toHaveLength(0);
      });
    });

    // ─── Feature 6 Boundaries ────────────────────────────────────────────────
    describe("Feature 6 Boundaries: D1 Math & Snapshot Query Limits", () => {
      test("F06-T2-01: D1 batch calculation with 28 columns yields exactly 3 rows per batch", () => {
        expect(maxRowsPerD1Batch(28)).toBe(3);
      });

      test("F06-T2-02: Boundary calculation where columnsPerRow = 100 yields exactly 1 row per batch", () => {
        expect(maxRowsPerD1Batch(100)).toBe(1);
        expect(maxRowsPerD1Batch(150)).toBe(1);
      });

      test("F06-T2-03: slicePublicJobs with offset > total returns empty jobs array and accurate total", () => {
        const mockJobs: PublicJob[] = [
          {
            id: 1,
            title: "VA",
            company: "Co",
            type: "VA",
            sourceUrl: "https://job/1",
            sourcePlatform: "WWR",
            sourceId: "wwr",
            tags: [],
            category: "VA",
            experienceLevel: "mid",
            postedAt: OBSERVED_NOW,
            scrapedAt: OBSERVED_NOW,
            geoScope: "ph_only",
            phEligibility: "eligible_verified",
            geoEvidence: "PH",
            description: "Desc",
            clientTimezone: null,
            locationType: "remote",
            payRange: null,
            updatedAt: null,
          },
        ];
        const result = slicePublicJobs(mockJobs, { offset: 10, limit: 10 });
        expect(result.total).toBe(1);
        expect(result.jobs).toHaveLength(0);
      });

      test("F06-T2-04: Public job search query with special regex characters escapes safely", () => {
        const mockJobs: PublicJob[] = [
          {
            id: 1,
            title: "C++ (Senior) Developer [Remote]*",
            company: "Tech Co",
            type: "full-time",
            sourceUrl: "https://job/1",
            sourcePlatform: "WWR",
            sourceId: "wwr",
            tags: ["c++"],
            category: "Development",
            experienceLevel: "senior",
            postedAt: OBSERVED_NOW,
            scrapedAt: OBSERVED_NOW,
            geoScope: "ph_only",
            phEligibility: "eligible_verified",
            geoEvidence: "PH",
            description: "C++ systems",
            clientTimezone: null,
            locationType: "remote",
            payRange: null,
            updatedAt: null,
          },
        ];
        const result = slicePublicJobs(mockJobs, {
          query: "C++ (Senior)",
          offset: 0,
          limit: 10,
        });
        expect(result.total).toBe(1);
      });

      test("F06-T2-05: Public job search query with excessive whitespace behaves deterministically", () => {
        const mockJobs: PublicJob[] = [
          {
            id: 1,
            title: "Accountant",
            company: "Co",
            type: "full-time",
            sourceUrl: "https://job/1",
            sourcePlatform: "WWR",
            sourceId: "wwr",
            tags: [],
            category: "Finance",
            experienceLevel: "mid",
            postedAt: OBSERVED_NOW,
            scrapedAt: OBSERVED_NOW,
            geoScope: "ph_only",
            phEligibility: "eligible_verified",
            geoEvidence: "PH",
            description: "Financials",
            clientTimezone: null,
            locationType: "remote",
            payRange: null,
            updatedAt: null,
          },
        ];
        const result = slicePublicJobs(mockJobs, {
          query: "   \t\n  Accountant  \n ",
          offset: 0,
          limit: 10,
        });
        expect(result.total).toBe(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Coverage)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Tier 3: Cross-Feature Combinations", () => {
    test("C-01: Bloat Consolidation + Multi-Source Fairness (dedup + round-robin intake)", () => {
      const knownStoredUrls = new Set(["https://weworkremotely.com/jobs/stored-1"]);
      const rawCandidates = [
        { sourceId: "rss:wwr", sourceUrl: "https://weworkremotely.com/jobs/stored-1" }, // Duplicate
        { sourceId: "rss:wwr", sourceUrl: "https://weworkremotely.com/jobs/fresh-1" },
        { sourceId: "workable:hunt-st", sourceUrl: "https://apply.workable.com/hunt-st/j/fresh-2" },
      ];
      const deduped = omitKnownSourceUrls(rawCandidates, knownStoredUrls);
      expect(deduped).toHaveLength(2);

      const intake = selectIntakeBatch(deduped, 50);
      expect(intake.selected).toHaveLength(2);
      expect(intake.selected.some(i => i.sourceId === "workable:hunt-st")).toBe(true);
      expect(intake.selected.some(i => i.sourceId === "rss:wwr")).toBe(true);
    });

    test("C-02: Trusted Employer + Dayshift Classification + GeoGate", () => {
      // Opening 1: Hunt St with explicit PHT daytime span
      const remoteHunt = geoGate({
        title: "AU Bookkeeper (8:00 AM - 5:00 PM Manila Time)",
        description: "Offshore accounting for Sydney firm.",
        company: "Hunt St",
        sourceId: "workable:hunt-st",
      });
      const shiftHunt = classifyShift({
        title: "AU Bookkeeper (8:00 AM - 5:00 PM Manila Time)",
        description: "Offshore accounting for Sydney firm.",
      });
      expect(remoteHunt.phEligibility).toBe("eligible_verified");
      expect(shiftHunt.isDayshift).toBe(true);
      expect(shiftHunt.phWorkingHours).toBe("8:00 AM - 5:00 PM Manila Time");

      // Opening 2: Same employer, but explicit US location lock
      const usHunt = geoGate({
        title: "AU Bookkeeper - Day Shift",
        description: "Must reside permanently in the United States.",
        locationRaw: "United States",
        company: "Hunt St",
        sourceId: "workable:hunt-st",
      });
      const usShift = classifyShift({ title: "AU Bookkeeper - Day Shift" });
      expect(usShift.isDayshift).toBe(true);
      expect(usHunt.phEligibility).toBe("ineligible");
      expect(usHunt.geoScope).toBe("country_locked");
    });

    test("C-03: Trusted Employer + 13-Stage Loss Tracking", () => {
      const tracker = new PipelineLossTracker();

      // Legitimate opening advances to publication
      tracker.recordPass("source");
      tracker.recordPass("discovery");
      tracker.recordPass("fetch");
      tracker.recordPass("parse");
      tracker.recordPass("normalize");
      tracker.recordPass("dedup");
      tracker.recordPass("ph_eligibility");
      tracker.recordPass("policy");
      tracker.recordPass("role_gates");
      tracker.recordPass("triage");
      tracker.recordPass("scoring");
      tracker.recordPass("qualification");
      tracker.recordPass("publication");

      // Negative counterexample drops at ph_eligibility
      tracker.recordLoss("ph_eligibility", {
        id: "pineapple-01",
        sourceId: "workable:pineapple-staffing",
        company: "Pineapple Staffing",
        title: "Medical Receptionist",
        reasonCode: "GEO_COUNTRY_LOCKED_US",
        reasonDetail: "US locked vacancy",
      });

      const huntRecon = tracker.reconcileEmployer("hunt-st", "Hunt St", 1);
      expect(huntRecon.status).toBe("HEALTHY");

      const pineappleRecon = tracker.reconcileEmployer("pineapple-staffing", "Pineapple Staffing", 1, true);
      expect(pineappleRecon.status).toBe("CONSTITUTIONAL_ZERO");
      expect(pineappleRecon.published).toBe(0);
    });

    test("C-04: Multi-Source Intake + D1 Parameter Budget + Freshness", () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        sourceId: i % 2 === 0 ? "workable:hunt-st" : "rss:wwr",
        sourceUrl: `https://test.com/job-${i}`,
        postedAt: i % 3 === 0 ? "2026-08-01T12:00:00.000Z" : "2026-10-10T12:00:00.000Z", // mix fresh & stale
      }));

      const batch = selectIntakeBatch(items, 10);
      const freshItems = batch.selected.filter(
        item => assessPostingFreshness(item.postedAt, OBSERVED_NOW).state === "WITHIN_WINDOW",
      );

      const d1Chunks = chunkArray(freshItems, maxRowsPerD1Batch(28));
      for (const chunk of d1Chunks) {
        expect(chunk.length * 28).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMETERS);
      }
    });

    test("C-05: Dayshift Classification + Public Snapshot Querying", () => {
      const jobs: PublicJob[] = [
        {
          id: 1,
          title: "Senior Bookkeeper",
          company: "Hunt St",
          type: "VA",
          sourceUrl: "https://job/1",
          sourcePlatform: "Workable",
          sourceId: "workable:hunt-st",
          tags: ["accounting"],
          category: "Finance",
          experienceLevel: "senior",
          postedAt: OBSERVED_NOW,
          scrapedAt: OBSERVED_NOW,
          geoScope: "ph_only",
          phEligibility: "eligible_verified",
          geoEvidence: "PH",
          description: "8am - 5pm Manila time",
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
          isDayshift: true,
          shiftCategory: "day_shift",
        },
        {
          id: 2,
          title: "Night Shift Support",
          company: "20Four7VA",
          type: "VA",
          sourceUrl: "https://job/2",
          sourcePlatform: "Breezy",
          sourceId: "breezy:20four7va",
          tags: [],
          category: "Customer Support",
          experienceLevel: "mid",
          postedAt: OBSERVED_NOW,
          scrapedAt: OBSERVED_NOW,
          geoScope: "ph_only",
          phEligibility: "eligible_verified",
          geoEvidence: "PH",
          description: "Graveyard shift",
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
          isDayshift: false,
          shiftCategory: "night_shift",
        },
      ];

      const queryResult = slicePublicJobs(jobs, {
        shift: "day_shift",
        geoScope: "ph_only",
        offset: 0,
        limit: 10,
      });
      expect(queryResult.total).toBe(1);
      expect(queryResult.jobs[0].id).toBe(1);
    });

    test("C-06: Constitutional Zeros + Loss Tracker + Public Board Defense", () => {
      const tracker = new PipelineLossTracker();

      // Ingest the 3 constitutional zero counterexamples
      const zeros = [
        {
          name: "Pineapple Staffing",
          input: { title: "Medical Receptionist", locationRaw: "United States", company: "Pineapple Staffing" },
          reason: "GEO_COUNTRY_LOCKED_US",
        },
        {
          name: "Affordable Staff",
          input: { title: "Administrative Assistant", locationType: "onsite", locationRaw: "Bacolod", company: "Affordable Staff" },
          reason: "GEO_ONSITE_REQUIRED",
        },
        {
          name: "UpGuard Australia",
          input: { title: "Security Analyst, APAC", locationRaw: "Sydney, Australia", company: "UpGuard" },
          reason: "GEO_COUNTRY_LOCKED_AU",
        },
      ];

      const publicJobs: PublicJob[] = [];
      for (const zero of zeros) {
        const verdict = geoGate(zero.input);
        expect(verdict.phEligibility).toBe("ineligible");

        tracker.recordLoss("ph_eligibility", {
          id: `cz-${zero.name}`,
          sourceId: `ats:${zero.name.toLowerCase().replace(/\s+/g, "-")}`,
          company: zero.name,
          title: zero.input.title,
          reasonCode: zero.reason,
          reasonDetail: "Constitutional zero rejected",
        });
      }

      // Query public board: 0 rows can appear
      const board = slicePublicJobs(publicJobs, { offset: 0, limit: 10 });
      expect(board.total).toBe(0);
      expect(tracker.getLosses()).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 Scenarios)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Tier 4: Real-World Application Scenarios", () => {
    test("Scenario S-01: Complete Daily Ingestion & Public Board Publication Pipeline", () => {
      const tracker = new PipelineLossTracker();
      const existingStoredUrls = new Set(["https://weworkremotely.com/jobs/already-stored"]);

      // 60 raw candidates across multi-source providers
      const rawCandidates = [
        // 50 RSS items
        ...Array.from({ length: 50 }, (_, i) => ({
          sourceId: "we-work-remotely",
          sourceUrl: i === 0 ? "https://weworkremotely.com/jobs/already-stored" : `https://weworkremotely.com/jobs/wwr-${i}`,
          title: `Remote Assistant ${i}`,
          description: "General virtual support for international clients.",
          locationRaw: "Worldwide",
          postedAt: OBSERVED_NOW,
        })),
        // 5 Hunt St ATS items
        ...Array.from({ length: 5 }, (_, i) => ({
          sourceId: "workable:hunt-st",
          sourceUrl: `https://apply.workable.com/hunt-st/j/hunt-${i}`,
          title: `Executive Bookkeeper ${i}`,
          description: "8:00 AM - 5:00 PM Manila Time supporting Australian clients.",
          locationRaw: null,
          postedAt: OBSERVED_NOW,
          company: "Hunt St",
        })),
        // 5 Breezy 20Four7VA items
        ...Array.from({ length: 5 }, (_, i) => ({
          sourceId: "breezy:20four7va",
          sourceUrl: `https://20four7va.breezy.hr/p/breezy-${i}`,
          title: `E-commerce Specialist ${i}`,
          description: "Remote specialist for PH professionals.",
          locationRaw: "Philippines",
          postedAt: OBSERVED_NOW,
          company: "20Four7VA",
        })),
      ];

      // Stage 1: In-memory URL dedup
      const deduped = omitKnownSourceUrls(rawCandidates, existingStoredUrls);
      expect(deduped).toHaveLength(59);

      // Stage 2: Fair intake selection under limit 50
      const intake = selectIntakeBatch(deduped, 50);
      expect(intake.selected).toHaveLength(50);
      expect(intake.deferred).toHaveLength(9);

      // Verify no starvation: Hunt St and 20Four7VA items are selected
      expect(intake.selected.some(i => i.sourceId === "workable:hunt-st")).toBe(true);
      expect(intake.selected.some(i => i.sourceId === "breezy:20four7va")).toBe(true);

      // Stage 3-5: Gate evaluation, freshness, and shift classification
      const publishedJobs: PublicJob[] = [];
      let nextId = 1;

      for (const item of intake.selected) {
        tracker.recordPass("source");
        tracker.recordPass("discovery");
        tracker.recordPass("fetch");
        tracker.recordPass("parse");
        tracker.recordPass("normalize");
        tracker.recordPass("dedup");

        const gate = geoGate({
          title: item.title,
          description: item.description,
          locationRaw: item.locationRaw,
          company: (item as any).company,
          sourceId: item.sourceId,
        });

        if (gate.phEligibility === "ineligible") {
          tracker.recordLoss("ph_eligibility", {
            id: item.sourceUrl,
            sourceId: item.sourceId,
            reasonCode: "GEO_INELIGIBLE",
            reasonDetail: gate.evidence,
          });
          continue;
        }
        tracker.recordPass("ph_eligibility");
        tracker.recordPass("policy");
        tracker.recordPass("role_gates");
        tracker.recordPass("triage");

        const freshness = assessPostingFreshness(item.postedAt, OBSERVED_NOW);
        if (freshness.state !== "WITHIN_WINDOW") {
          tracker.recordLoss("scoring", {
            id: item.sourceUrl,
            sourceId: item.sourceId,
            reasonCode: "FRESHNESS_STALE",
            reasonDetail: freshness.state,
          });
          continue;
        }
        tracker.recordPass("scoring");
        tracker.recordPass("qualification");

        const shift = classifyShift({
          title: item.title,
          description: item.description,
        });

        publishedJobs.push({
          id: nextId++,
          title: item.title,
          company: (item as any).company ?? "Remote Co",
          type: "VA",
          sourceUrl: item.sourceUrl,
          sourcePlatform: item.sourceId.includes("hunt-st") ? "Workable" : item.sourceId.includes("20four7va") ? "Breezy" : "WWR",
          sourceId: item.sourceId,
          tags: ["va"],
          category: "VA",
          experienceLevel: "mid",
          postedAt: item.postedAt,
          scrapedAt: OBSERVED_NOW,
          geoScope: gate.geoScope,
          phEligibility: gate.phEligibility,
          geoEvidence: gate.evidence,
          description: item.description,
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
          isDayshift: shift.isDayshift,
          shiftCategory: shift.category,
        });
        tracker.recordPass("publication");
      }

      // Stage 6: D1 Chunking
      const d1Batches = chunkArray(publishedJobs, maxRowsPerD1Batch(28));
      for (const batch of d1Batches) {
        expect(batch.length * 28).toBeLessThanOrEqual(100);
      }

      // Stage 7: Query public board
      const publicSlice = slicePublicJobs(publishedJobs, { offset: 0, limit: 10 });
      expect(publicSlice.total).toBe(publishedJobs.length);
      expect(publicSlice.jobs.length).toBeLessThanOrEqual(10);

      // Verify dayshift filter on public board returns Hunt St dayshift jobs
      const dayshiftSlice = slicePublicJobs(publishedJobs, { shift: "day_shift", offset: 0, limit: 10 });
      expect(dayshiftSlice.total).toBeGreaterThan(0);
      expect(dayshiftSlice.jobs.every(j => j.isDayshift === true)).toBe(true);
    });

    test("Scenario S-02: High-Volume RSS Flood vs Multi-Tenant ATS Intake (Anti-Starvation)", () => {
      const rssItems = Array.from({ length: 1000 }, (_, i) => ({
        sourceId: "rss:wwr",
        sourceUrl: `https://weworkremotely.com/jobs/flood-${i}`,
      }));
      const atsItems = [
        { sourceId: "workable:hunt-st", sourceUrl: "https://apply.workable.com/hunt-st/j/001" },
        { sourceId: "workable:coconutva", sourceUrl: "https://apply.workable.com/coconutva/j/002" },
        { sourceId: "workable:pearltalent", sourceUrl: "https://apply.workable.com/pearltalent/j/003" },
      ];

      // Competing under limit 50
      const pass1 = selectIntakeBatch([...rssItems, ...atsItems], 50);
      expect(pass1.selected).toHaveLength(50);

      // Every single ATS item must be selected on Pass 1 despite 1000 RSS items
      for (const ats of atsItems) {
        expect(pass1.selected.some(s => s.sourceUrl === ats.sourceUrl)).toBe(true);
      }
    });

    test("Scenario S-03: Constitutional Zero Defense & Negative Infiltration Attack", () => {
      const tracker = new PipelineLossTracker();
      const maliciousCohort = [
        {
          name: "Pineapple Staffing (stale US)",
          sourceId: "workable:pineapple-staffing",
          title: "Medical Biller",
          locationRaw: "Florida, United States",
          postedAt: "2020-01-01T00:00:00.000Z",
          company: "Pineapple Staffing",
        },
        {
          name: "Affordable Staff (Bacolod onsite)",
          sourceId: "workable:affordable-staff",
          title: "General Clerk (Onsite Only)",
          locationType: "onsite",
          locationRaw: "Bacolod City Office",
          postedAt: OBSERVED_NOW,
          company: "Affordable Staff",
        },
        {
          name: "UpGuard Australia (AU pin)",
          sourceId: "workable:upguard",
          title: "Threat Researcher, APAC",
          locationRaw: "Sydney, Australia",
          postedAt: OBSERVED_NOW,
          company: "UpGuard",
        },
        {
          name: "Expired Stale Role (45d)",
          sourceId: "rss:wwr",
          title: "Customer Support",
          locationRaw: "Philippines",
          postedAt: new Date(OBSERVED_NOW_MS - 45 * 86_400_000).toISOString(),
          company: "WWR",
        },
      ];

      const qualified = [];
      for (const item of maliciousCohort) {
        const gate = geoGate({
          title: item.title,
          locationRaw: item.locationRaw,
          locationType: item.locationType,
          company: item.company,
          sourceId: item.sourceId,
        });

        if (gate.phEligibility === "ineligible") {
          tracker.recordLoss("ph_eligibility", {
            id: item.sourceId,
            sourceId: item.sourceId,
            company: item.company,
            title: item.title,
            reasonCode: "GEO_INELIGIBLE",
            reasonDetail: gate.evidence,
          });
          continue;
        }

        const freshness = assessPostingFreshness(item.postedAt, OBSERVED_NOW);
        if (freshness.state !== "WITHIN_WINDOW") {
          tracker.recordLoss("scoring", {
            id: item.sourceId,
            sourceId: item.sourceId,
            company: item.company,
            title: item.title,
            reasonCode: "FRESHNESS_STALE",
            reasonDetail: freshness.state,
          });
          continue;
        }
        qualified.push(item);
      }

      // Strict invariant: 0% published
      expect(qualified).toHaveLength(0);
      expect(tracker.getLosses()).toHaveLength(4);

      // Verify exact reason codes
      expect(tracker.getLosses().some(l => l.company === "Pineapple Staffing" && l.droppedAtStage === "ph_eligibility")).toBe(true);
      expect(tracker.getLosses().some(l => l.company === "Affordable Staff" && l.droppedAtStage === "ph_eligibility")).toBe(true);
      expect(tracker.getLosses().some(l => l.company === "UpGuard" && l.droppedAtStage === "ph_eligibility")).toBe(true);
      expect(tracker.getLosses().some(l => l.reasonCode === "FRESHNESS_STALE")).toBe(true);
    });

    test("Scenario S-04: Australian / APAC Agency Dayshift Ingestion & Filter Journey", () => {
      const auJobs = [
        {
          id: 101,
          title: "AU Intermediate Bookkeeper - Day Shift",
          description: "Supporting Australian accounting practice. Work hours are 8:00 AM - 5:00 PM Manila Time.",
          company: "Hammerjack",
          sourceId: "hammerjack",
        },
        {
          id: 102,
          title: "AU Senior Tax Accountant",
          description: "AEST business hours. Remote Philippines.",
          company: "Hammerjack",
          sourceId: "hammerjack",
        },
      ];

      const publicJobs: PublicJob[] = auJobs.map(job => {
        const shift = classifyShift({
          title: job.title,
          description: job.description,
        });
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          type: "full-time",
          sourceUrl: `https://careers.hammerjack.com.au/jobs/${job.id}`,
          sourcePlatform: "Teamtailor",
          sourceId: job.sourceId,
          tags: ["accounting"],
          category: "Finance",
          experienceLevel: "senior",
          postedAt: OBSERVED_NOW,
          scrapedAt: OBSERVED_NOW,
          geoScope: "apac_incl_ph",
          phEligibility: "eligible_verified",
          geoEvidence: "Hammerjack trusted agency",
          description: job.description,
          clientTimezone: null,
          locationType: "remote",
          payRange: null,
          updatedAt: null,
          isDayshift: shift.isDayshift,
          shiftCategory: shift.category,
        };
      });

      // Verify all jobs classified as day_shift
      expect(publicJobs.every(j => j.isDayshift === true)).toBe(true);
      expect(publicJobs.every(j => j.shiftCategory === "day_shift")).toBe(true);

      // Verify query on /opportunities shift filter
      const dayResult = slicePublicJobs(publicJobs, { shift: "day_shift", offset: 0, limit: 10 });
      expect(dayResult.total).toBe(2);

      const nightResult = slicePublicJobs(publicJobs, { shift: "night_shift", offset: 0, limit: 10 });
      expect(nightResult.total).toBe(0);
    });

    test("Scenario S-05: Systematic Employer Reconciliation Audit Across 8 Major Agencies", () => {
      const tracker = new PipelineLossTracker();
      const agencyAudits = [
        { id: "hunt-st", name: "Hunt St", authoritative: 79, isCz: false },
        { id: "coconutva", name: "Coconut VA", authoritative: 10, isCz: false },
        { id: "20four7va", name: "20Four7VA", authoritative: 87, isCz: false },
        { id: "crewbloom", name: "CrewBloom", authoritative: 7, isCz: false },
        { id: "pearltalent", name: "Pearl Talent", authoritative: 25, isCz: false },
        { id: "hammerjack", name: "Hammerjack", authoritative: 5, isCz: false },
        { id: "multiplymii", name: "MultiplyMii", authoritative: 15, isCz: false },
        { id: "pineapple-staffing", name: "Pineapple Staffing", authoritative: 3, isCz: true },
      ];

      // Simulate tracked drops
      // 1 drop for Hunt St (onsite)
      tracker.recordLoss("ph_eligibility", {
        id: "hunt-onsite",
        sourceId: "workable:hunt-st",
        company: "Hunt St",
        reasonCode: "GEO_ONSITE_REQUIRED",
        reasonDetail: "Onsite required",
      });

      // 3 drops for Pineapple Staffing (Constitutional Zero)
      for (let i = 0; i < 3; i++) {
        tracker.recordLoss("ph_eligibility", {
          id: `pineapple-${i}`,
          sourceId: "workable:pineapple-staffing",
          company: "Pineapple Staffing",
          reasonCode: "GEO_COUNTRY_LOCKED_US",
          reasonDetail: "US locked",
        });
      }

      for (const agency of agencyAudits) {
        const recon = tracker.reconcileEmployer(agency.id, agency.name, agency.authoritative, agency.isCz);
        if (agency.isCz) {
          expect(recon.status).toBe("CONSTITUTIONAL_ZERO");
          expect(recon.published).toBe(0);
        } else {
          expect(recon.status).toBe("HEALTHY");
          expect(recon.recallRate).toBeGreaterThanOrEqual(0.5);
        }
      }
    });
  });
});
