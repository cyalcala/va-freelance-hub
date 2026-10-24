import { describe, expect, test } from "bun:test";
import { newerAdmissionPostedAt, normalizeWorkablePublishedDate } from "./source-posting-date";

const OBSERVED = "2026-10-24T02:53:29.871Z";

describe("newerAdmissionPostedAt", () => {
  test("keeps a newer Workable published_on for the CrewBloom Senior EA clock", () => {
    const source = normalizeWorkablePublishedDate("2026-10-23");
    expect(newerAdmissionPostedAt("2026-03-24T00:00:00.000Z", source, OBSERVED)).toBe("2026-10-23T00:00:00.000Z");
  });

  test("does not move the clock backward, forward into the future, or onto an invalid date", () => {
    expect(newerAdmissionPostedAt("2026-10-23T00:00:00.000Z", "2026-03-24T00:00:00.000Z", OBSERVED)).toBeNull();
    expect(newerAdmissionPostedAt("2026-10-23T00:00:00.000Z", "2026-10-23T00:00:00.000Z", OBSERVED)).toBeNull();
    expect(newerAdmissionPostedAt("2026-10-23T00:00:00.000Z", "2026-10-25T00:00:00.000Z", OBSERVED)).toBeNull();
    expect(newerAdmissionPostedAt("2026-10-23T00:00:00.000Z", "2026-02-31", OBSERVED)).toBeNull();
    expect(newerAdmissionPostedAt(null, "2026-10-23T00:00:00.000Z", OBSERVED)).toBeNull();
    expect(newerAdmissionPostedAt("2026-03-24T00:00:00.000Z", "2026-10-23T00:00:00.000Z", "not-a-clock")).toBeNull();
    expect(newerAdmissionPostedAt("2026-03-24T00:00:00.000Z", "", OBSERVED)).toBeNull();
  });

  test("records a newer source date even when both dates are outside the publication window", () => {
    expect(newerAdmissionPostedAt("2025-01-01T00:00:00.000Z", "2025-06-01T00:00:00.000Z", OBSERVED)).toBe("2025-06-01T00:00:00.000Z");
  });

  test("an unchanged published_on does not replace the stored clock", () => {
    const published = normalizeWorkablePublishedDate("2026-03-24");
    expect(newerAdmissionPostedAt("2026-03-24T00:00:00.000Z", published, OBSERVED)).toBeNull();
  });
});
