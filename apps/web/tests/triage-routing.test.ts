import { describe, expect, test } from "bun:test";
import { shouldTriageViaInngest } from "../src/pages/api/cron/scrape";

// Regression guard for the 2026-08-18/19 board freeze.
//
// Root cause: `triageViaInngest` keyed off Boolean(INNGEST_SIGNING_KEY) alone.
// The signing key was present on production but the Inngest triage-drain cloud
// cron was NOT firing, so every gate-passed new listing was parked as a hidden
// `pending-triage` row (is_active=0) and never published. The board froze at
// jobs scraped 2026-08-18 14:00Z for ~30h — with a green heartbeat the whole
// time — while 55 eligible jobs piled up invisibly (a silent success).
//
// Durable triage must now be a DELIBERATE two-part opt-in: the signing key AND
// an explicit TRIAGE_VIA_INNGEST="1". A stray/leftover key can no longer divert
// ingestion into a queue whose external drain may be dead.

describe("shouldTriageViaInngest", () => {
  test("signing key ALONE does not enable durable triage (the freeze bug)", () => {
    expect(shouldTriageViaInngest({ INNGEST_SIGNING_KEY: "signkey-abc" })).toBe(false);
  });

  test("durable triage requires BOTH the key and TRIAGE_VIA_INNGEST=1", () => {
    expect(
      shouldTriageViaInngest({ INNGEST_SIGNING_KEY: "signkey-abc", TRIAGE_VIA_INNGEST: "1" }),
    ).toBe(true);
  });

  test("the opt-in flag without a key stays inline (Inngest cannot verify without it)", () => {
    expect(shouldTriageViaInngest({ TRIAGE_VIA_INNGEST: "1" })).toBe(false);
  });

  test("no key and no flag is inline — the default, proven path", () => {
    expect(shouldTriageViaInngest({})).toBe(false);
    expect(shouldTriageViaInngest(undefined)).toBe(false);
    expect(shouldTriageViaInngest(null)).toBe(false);
  });

  test('flag values other than exactly "1" do not enable it', () => {
    expect(shouldTriageViaInngest({ INNGEST_SIGNING_KEY: "k", TRIAGE_VIA_INNGEST: "true" })).toBe(false);
    expect(shouldTriageViaInngest({ INNGEST_SIGNING_KEY: "k", TRIAGE_VIA_INNGEST: "0" })).toBe(false);
    expect(shouldTriageViaInngest({ INNGEST_SIGNING_KEY: "k", TRIAGE_VIA_INNGEST: "" })).toBe(false);
  });
});
