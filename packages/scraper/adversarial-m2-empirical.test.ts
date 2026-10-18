import { describe, expect, test } from "bun:test";
import { geoGate } from "./geoGate";
import { assessPostingFreshness } from "./publication-freshness";
import { findTrustedEmployer, TRUSTED_PH_EMPLOYERS } from "./trustedEmployers";
import { classifyShift } from "./shiftClassifier";

const OBSERVED_NOW = "2026-10-16T00:00:00.000Z";

describe("Milestone 2 Empirical Challenger Adversarial Suite", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Challenge 1: Constitutional Zero Counterexamples
  // ───────────────────────────────────────────────────────────────────────────
  describe("Constitutional Zero Counterexamples: Strictly 0% Publication", () => {
    test("Pineapple Staffing: Stale dates + US location pin yields strictly 0 published", () => {
      const pineappleVariants = [
        // Exact historical payloads
        { company: "Pineapple Staffing", sourceId: "workable:pineapple-staffing", title: "Executive Virtual Assistant", locationRaw: "United States", locationType: "remote" as const, postedAt: "2020-01-14T00:00:00.000Z" },
        { company: "Pineapple Staffing", sourceId: "workable:pineapple-staffing", title: "Marketing Virtual Assistant", locationRaw: "United States", locationType: "remote" as const, postedAt: "2021-06-20T00:00:00.000Z" },
        { company: "Pineapple Staffing", sourceId: "workable:pineapple-staffing", title: "Business Virtual Assistant", locationRaw: "Orlando, FL", locationType: "remote" as const, postedAt: "2022-11-05T00:00:00.000Z" },
        // Adversarial spoofing: what if attacker fakes a fresh date? Location pin still blocks!
        { company: "Pineapple Staffing", sourceId: "workable:pineapple-staffing", title: "Virtual Assistant (US)", locationRaw: "United States", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Adversarial spoofing: what if locationRaw is stripped but title has US state/pin?
        { company: "Pineapple Staffing", sourceId: "workable:pineapple-staffing", title: "Executive Assistant - Austin, TX", locationRaw: "", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
      ];

      for (const job of pineappleVariants) {
        const geo = geoGate(job);
        const freshness = assessPostingFreshness(job.postedAt, OBSERVED_NOW);

        const published = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
        expect(published).toBe(false);

        // Verify failure reason: either geo ineligible (country_locked) or freshness stale
        if (job.locationRaw === "United States" || job.locationRaw === "Orlando, FL" || job.title.includes("Austin, TX")) {
          expect(geo.phEligibility).toBe("ineligible");
          expect(geo.geoScope).toBe("country_locked");
        }
        if (job.postedAt.startsWith("2020") || job.postedAt.startsWith("2021") || job.postedAt.startsWith("2022")) {
          expect(freshness.state).toBe("STALE");
        }
      }
    });

    test("Affordable Staff: Bacolod office onsite / hybrid yields strictly 0 published", () => {
      const affordableVariants = [
        // Onsite workplace type in Bacolod, Philippines
        { company: "Affordable Staff", title: "Virtual Assistant", locationRaw: "Bacolod, Philippines", locationType: "onsite" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Hybrid workplace type in Bacolod, Philippines
        { company: "Affordable Staff", title: "AU Accountant", locationRaw: "Bacolod, Philippines", locationType: "hybrid" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Title onsite marker
        { company: "Affordable Staff", title: "Admin Assistant (onsite)", locationRaw: "Bacolod, Philippines", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Location string onsite marker
        { company: "Affordable Staff", title: "Medical VA", locationRaw: "Bacolod Office (onsite)", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Title in-office marker
        { company: "Affordable Staff", title: "CSR - in-office Bacolod", locationRaw: "Bacolod", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Hybrid in locationRaw
        { company: "Affordable Staff", title: "Bookkeeper", locationRaw: "Bacolod (Hybrid)", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
      ];

      for (const job of affordableVariants) {
        const geo = geoGate(job);
        const freshness = assessPostingFreshness(job.postedAt, OBSERVED_NOW);

        const published = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
        expect(published).toBe(false);

        // Step 0 must immediately reject non-remote / onsite / hybrid
        expect(geo.phEligibility).toBe("ineligible");
        expect(geo.geoScope).toBe("country_locked");
        expect(geo.evidence).toContain("Not fully remote");
      }
    });

    test("UpGuard Australia: Australia location pin yields strictly 0 published", () => {
      const upguardVariants = [
        // Standard UpGuard APAC role with Australia country pin
        { company: "UpGuard", title: "Director of Customer Success, APAC", locationRaw: "Australia", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Australian city: Sydney
        { company: "UpGuard", title: "Customer Success Manager - APAC", locationRaw: "Sydney, Australia", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Australian city: Melbourne
        { company: "UpGuard", title: "Sales Director (APAC)", locationRaw: "Melbourne", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
        // Australian city: Brisbane
        { company: "UpGuard", title: "Enterprise Account Executive - APAC", locationRaw: "Brisbane", locationType: "remote" as const, postedAt: "2026-10-15T00:00:00.000Z" },
      ];

      for (const job of upguardVariants) {
        const geo = geoGate(job);
        const freshness = assessPostingFreshness(job.postedAt, OBSERVED_NOW);

        const published = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
        expect(published).toBe(false);

        // Structured location pin must dominate title APAC token
        expect(geo.phEligibility).toBe("ineligible");
        expect(geo.geoScope).toBe("country_locked");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Challenge 2: Stress-Test Employer Confidence Bypass Resistance
  // ───────────────────────────────────────────────────────────────────────────
  describe("Employer Confidence Bypass Resistance: High Confidence CANNOT Bypass Negative Gates", () => {
    // Every single trusted employer in catalog
    const allTrustedEmployers = Object.values(TRUSTED_PH_EMPLOYERS);

    test("Every trusted employer profile has valid tier_a_vetted confidence", () => {
      expect(allTrustedEmployers.length).toBeGreaterThanOrEqual(10);
      for (const emp of allTrustedEmployers) {
        expect(emp.confidenceTier).toBe("tier_a_vetted");
      }
    });

    test("IMPOSSIBLE for high-confidence employer to bypass explicit foreign country lock in locationRaw", () => {
      const foreignLocations = [
        "United States",
        "London, United Kingdom",
        "Toronto, Canada",
        "Sydney, Australia",
        "Berlin, Germany",
        "Tokyo, Japan",
        "Paris, France",
        "Auckland, New Zealand",
        "Singapore",
        "Austin, TX",
        "San Francisco, CA",
        "Seattle, WA",
      ];

      for (const emp of allTrustedEmployers) {
        for (const loc of foreignLocations) {
          const res = geoGate({
            company: emp.companyName,
            sourceId: `workable:${emp.id}`,
            title: "Senior Executive Assistant",
            description: "High performance assistant role for executive leadership.",
            locationRaw: loc,
            locationType: "remote",
          });

          // Must be strictly ineligible and country_locked
          expect(res.phEligibility).toBe("ineligible");
          expect(res.geoScope).toBe("country_locked");
        }
      }
    });

    test("IMPOSSIBLE for high-confidence employer to bypass onsite / hybrid locationType", () => {
      const nonRemoteTypes = ["onsite", "hybrid"] as const;

      for (const emp of allTrustedEmployers) {
        for (const locType of nonRemoteTypes) {
          const res = geoGate({
            company: emp.companyName,
            sourceId: `workable:${emp.id}`,
            title: "Administrative Assistant",
            description: "Office administration and support.",
            locationRaw: "Manila, Philippines", // Even when location is in the Philippines!
            locationType: locType,
          });

          // Step 0 must strictly reject
          expect(res.phEligibility).toBe("ineligible");
          expect(res.geoScope).toBe("country_locked");
          expect(res.evidence).toContain("Not fully remote");
        }
      }
    });

    test("IMPOSSIBLE for high-confidence employer to bypass title country / state restrictions", () => {
      const titleLocks = [
        "Virtual Assistant (US Only)",
        "Executive Assistant (UK Remote)",
        "Bookkeeper - Canada Candidates Only",
        "Operations Specialist (Austin, TX)",
        "Customer Success Lead | New York, NY | Remote",
        "Support Representative - London",
      ];

      for (const emp of allTrustedEmployers) {
        for (const title of titleLocks) {
          const res = geoGate({
            company: emp.companyName,
            sourceId: `workable:${emp.id}`,
            title,
            description: "Remote administrative role.",
            locationRaw: "Remote",
            locationType: "remote",
          });

          expect(res.phEligibility).toBe("ineligible");
          expect(res.geoScope).toBe("country_locked");
        }
      }
    });

    test("IMPOSSIBLE for high-confidence employer to bypass hard residence and work-authorization locks", () => {
      const residenceLocks = [
        "Must be a US citizen and currently reside in the United States.",
        "Applicants must possess valid US work authorization.",
        "Candidates must be based in Australia with full working rights.",
        "W-2 only; no 1099 or C2C candidates.",
        "Active Top Secret security clearance required. Must reside in USA.",
      ];

      for (const emp of allTrustedEmployers) {
        for (const desc of residenceLocks) {
          const res = geoGate({
            company: emp.companyName,
            sourceId: `workable:${emp.id}`,
            title: "Virtual Assistant",
            description: desc,
            locationRaw: "Remote",
            locationType: "remote",
          });

          expect(res.phEligibility).toBe("ineligible");
          expect(res.geoScope).toBe("region_excl_ph");
          expect(res.evidence).toContain("Residence/authorization lock");
        }
      }
    });

    test("IMPOSSIBLE for high-confidence employer to bypass stale posting dates (>30 days)", () => {
      const staleDates = [
        "2020-01-01T00:00:00.000Z",
        "2022-06-15T00:00:00.000Z",
        "2025-12-31T00:00:00.000Z",
        "2026-08-01T00:00:00.000Z",
        "2026-09-10T00:00:00.000Z", // >30 days before 2026-10-16
      ];

      for (const date of staleDates) {
        const freshness = assessPostingFreshness(date, OBSERVED_NOW);
        expect(freshness.state).toBe("STALE");

        // Even with explicit per-opening Philippines metadata:
        const geo = geoGate({
          company: "Hunt St",
          title: "Bookkeeper",
          locationRaw: "Philippines",
          locationType: "remote",
        });
        expect(geo.phEligibility).toBe("eligible_verified");

        // Publication predicate: geoGate eligible AND freshness WITHIN_WINDOW
        const isPublishable = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
        expect(isPublishable).toBe(false);
      }
    });

    test("IMPOSSIBLE for high-confidence employer to bypass non-English / European domestic markers", () => {
      const localizedRoles = [
        { title: "Frontend Developer (m/w/d)", desc: "Entwicklung moderner Webanwendungen." },
        { title: "Werkstudent Recruiting", desc: "Unterstützung im Bereich Human Resources." },
        { title: "Assistant Administratif en Alternance", desc: "Poste en contrat d'apprentissage." },
      ];

      for (const emp of allTrustedEmployers) {
        for (const role of localizedRoles) {
          const res = geoGate({
            company: emp.companyName,
            sourceId: `workable:${emp.id}`,
            title: role.title,
            description: role.desc,
            locationRaw: "Remote",
            locationType: "remote",
          });

          expect(res.phEligibility).toBe("ineligible");
          expect(res.geoScope).toBe("country_locked");
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Challenge 3: Dayshift Schedule Invariant Stress-Testing
  // ───────────────────────────────────────────────────────────────────────────
  describe("Dayshift Classification: Precision and Anti-Fabrication Safeguards", () => {
    test("Correctly extracts explicit PHT daytime spans into phWorkingHours", () => {
      const validSpans = [
        { text: "Hours: 8:00 AM - 5:00 PM Manila Time", expectedSpan: "8:00 AM - 5:00 PM Manila Time" },
        { text: "Shift: 7:00 am - 4:00 pm PHT Monday to Friday", expectedSpan: "7:00 am - 4:00 pm PHT" },
        { text: "Working hours are 9:00 am – 6:00 pm (PHT)", expectedSpan: "9:00 am – 6:00 pm (PHT)" },
        { text: "Daily schedule: 8am - 5pm Philippine time", expectedSpan: "8am - 5pm Philippine time" },
      ];

      for (const sample of validSpans) {
        const result = classifyShift({ description: sample.text });
        expect(result.isDayshift).toBe(true);
        expect(result.category).toBe("day_shift");
        expect(result.phWorkingHours).not.toBeNull();
      }
    });

    test("Does NOT fabricate dayshift when only timezone is given without schedule markers", () => {
      const unstatedSchedules = [
        { title: "Software Engineer", desc: "Working with clients in US and AU.", clientTimezone: "AEST" },
        { title: "Bookkeeper", desc: "Apply before 5:00 PM PST. Immediate start.", clientTimezone: "GMT" },
        { title: "Medical Virtual Assistant", desc: "Coordinate CT scans and patient charts.", clientTimezone: null },
      ];

      for (const sample of unstatedSchedules) {
        const result = classifyShift({
          title: sample.title,
          description: sample.desc,
          clientTimezone: sample.clientTimezone,
        });

        // Must NOT falsely label as day_shift
        expect(result.isDayshift).toBe(false);
        expect(result.category).toBe("unknown");
        expect(result.phWorkingHours).toBeNull();
      }
    });

    test("Negated schedule requirements are classified as unknown, not day_shift", () => {
      const negated = [
        "This is NOT a day shift position. Must work US night hours.",
        "Without fixed hours; flexible project-based deliverables.",
        "No day shift available currently.",
      ];

      for (const desc of negated) {
        const result = classifyShift({ description: desc });
        expect(result.isDayshift).toBe(false);
        expect(result.category).toBe("unknown");
      }
    });
  });
});
