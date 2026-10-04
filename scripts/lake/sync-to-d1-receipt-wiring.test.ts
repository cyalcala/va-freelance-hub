/**
 * INCIDENT-0410(w) — structural guard on the publisher's receipt write.
 *
 * The behavioural proof lives in `d1-batch-confirmation.test.ts`, which drives the real exported
 * parser and selector. This file exists because the *wiring* in `scripts/lake/sync-to-d1.ts` cannot be
 * executed from a test without a live lake client and a live remote D1 execution,
 * which a test must never make. These assertions therefore read the module source and are explicitly
 * STRUCTURAL, not behavioural: they fail if the blanket receipt loop is ever restored, and they fail if
 * the confirmation is computed and then ignored.
 *
 * The defect being guarded (measured 2026-10-04): 920 `SYNCED_TO_D1` lake rows with
 * `d1_opportunity_id IS NULL` on 920/920, and four `lever:glass-health-inc` receipts in the newest
 * sync window with no counterpart in prod D1 under any URL form.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const SOURCE = fs.readFileSync(path.join(import.meta.dir, "sync-to-d1.ts"), "utf-8");

describe("sync-to-d1 receipt write is conditional on a confirmed D1 landing", () => {
  it("no longer iterates the whole syncedIds list when writing the receipt", () => {
    expect(SOURCE).not.toContain("for (const id of syncedIds) {");
  });

  it("receipts exactly the ids the confirmation selected", () => {
    expect(SOURCE).toContain("const confirmedIds = selectConfirmedCandidateIds(syncedIds, confirmation);");
    expect(SOURCE).toContain("for (const id of confirmedIds) {");
  });

  it("derives the confirmation from the wrangler output, not from a successful exit", () => {
    expect(SOURCE).toContain("parseD1BatchConfirmation(output, syncedIds.length)");
    const execCall = SOURCE.indexOf("execSync(cmd, { encoding: \"utf-8\" })");
    const parseCall = SOURCE.indexOf("parseD1BatchConfirmation(output, syncedIds.length)");
    expect(execCall).toBeGreaterThan(-1);
    expect(parseCall).toBeGreaterThan(execCall);
  });

  it("warns when the receipt is withheld instead of reporting a clean tick", () => {
    expect(SOURCE).toContain("if (confirmedIds.length < syncedIds.length) {");
    expect(SOURCE).toContain("formatUnconfirmedPublishNotice(confirmation, sqlStatements.length)");
  });

  it("returns the confirmed count, so a starved or half-applied tick reports zero or less", () => {
    expect(SOURCE).toContain("return { syncedCount: confirmedIds.length };");
  });

  it("invents no D1 row identity, because no read-back exists on this path", () => {
    expect(SOURCE).not.toContain("d1_opportunity_id");
  });

  it("still writes the pre-existing lake receipt columns", () => {
    expect(SOURCE).toContain("status = 'SYNCED_TO_D1'");
    expect(SOURCE).toContain("synced_to_d1_at = datetime('now')");
  });
});