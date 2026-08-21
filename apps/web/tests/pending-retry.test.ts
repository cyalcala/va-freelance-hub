import { expect, test } from "bun:test";
import {
  buildPendingTriageItem,
  shouldDrainPendingTriage,
} from "../src/pages/api/cron/scrape";

test("AI-deferred candidates become durable pending-triage rows", async () => {
  const observedAt = "2026-08-21T10:00:00.000Z";
  const row = await buildPendingTriageItem({
    title: "Remote Support Specialist",
    company: "Acme",
    description: "Open worldwide",
    sourceUrl: "https://jobs.example.com/42",
    sourcePlatform: "Example ATS",
    contentHash: "fixture-content-hash",
    postedAt: "2026-08-21T09:55:00Z",
    applicationUrl: null,
    tags: ["support"],
  }, {
    geoScope: "worldwide",
    phEligibility: "eligible_verified",
    evidence: "Explicitly open worldwide",
  }, observedAt, "AI providers unavailable");

  expect(row.isActive).toBe(false);
  expect(row.inactiveReason).toBe("pending-triage");
  expect(row.geoScope).toBe("worldwide");
  expect(row.phEligibility).toBe("unclear");
  expect(row.geoEvidence).toContain("AI providers unavailable");
  expect(row.applicationUrl).toBe("https://jobs.example.com/42");
  expect(row.scrapedAt).toBe(observedAt);
  expect(row.descriptionHash).toHaveLength(64);
});

test("free HTTP providers enable the existing inline pending drain", () => {
  expect(shouldDrainPendingTriage({}, false)).toBe(false);
  expect(shouldDrainPendingTriage({ DRAIN_PENDING_TRIAGE: "1" }, false)).toBe(true);
  expect(shouldDrainPendingTriage({ GEMINI_API_KEY: "configured" }, false)).toBe(true);
  expect(shouldDrainPendingTriage({ GROQ_API_KEY: "configured" }, false)).toBe(true);
  expect(shouldDrainPendingTriage({ GEMINI_API_KEY: "configured" }, true)).toBe(false);
});
