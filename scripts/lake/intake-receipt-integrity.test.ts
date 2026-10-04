import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

import { classifyFocusGroup, type IntakeRawItem } from "./human-intake";
import { sha256Hex } from "./lake-shared";
import {
  INTAKE_RAW_PAYLOAD_MAX_CHARS,
  describeIntakeOutcome,
  describeIntakeRejection,
  describeOwnerLeadClassification,
  describeStoredRawPayload,
  measureOwnerLeadPrecedence,
  summarizeIntakeBatch,
  type IntakeItemOutcome,
} from "./intake-receipt-integrity";

const HUMAN_INTAKE_SOURCE = readFileSync(join(import.meta.dir, "human-intake.ts"), "utf-8");
const PROCESS_INTAKE_SOURCE = readFileSync(join(import.meta.dir, "process-intake.ts"), "utf-8");
const INIT_LAKE_SOURCE = readFileSync(join(import.meta.dir, "init-lake.ts"), "utf-8");

/** The two CREATE TABLE blocks for the durable intake record, and nothing else. */
const INTAKE_SCHEMA = INIT_LAKE_SOURCE.slice(
  INIT_LAKE_SOURCE.indexOf("CREATE TABLE IF NOT EXISTS lake_intake_batches"),
  INIT_LAKE_SOURCE.indexOf("CREATE INDEX IF NOT EXISTS idx_lake_intake_batch")
);

const item = (over: Partial<IntakeRawItem> = {}): IntakeRawItem => ({
  companyName: "Example Co",
  website: "https://example.com",
  niche: "bpo",
  isDayshift: false,
  isVerified: false,
  isRemote: true,
  isMarketplace: false,
  ...over,
});

const outcomesFor = (
  items: IntakeRawItem[],
  decide: (raw: IntakeRawItem, index: number) => { insertFailed?: boolean; itemAlreadyExisted?: boolean }
): IntakeItemOutcome[] =>
  items.map((raw, index) => {
    const { insertFailed = false, itemAlreadyExisted = false } = decide(raw, index);
    return describeIntakeOutcome({ companyName: raw.companyName, insertFailed, itemAlreadyExisted });
  });

describe("F-DUP-1 intake outcome and rejection cause", () => {
  it("routes each item to the outcome the writer's own branch order produces", () => {
    expect(describeIntakeOutcome({ companyName: "A", insertFailed: false, itemAlreadyExisted: false })).toBe(
      "ACCEPTED"
    );
    expect(describeIntakeOutcome({ companyName: "A", insertFailed: false, itemAlreadyExisted: true })).toBe(
      "UPSERTED_EXISTING_ITEM"
    );
    expect(describeIntakeOutcome({ companyName: "A", insertFailed: true, itemAlreadyExisted: false })).toBe(
      "REJECTED_LAKE_INSERT_FAILED"
    );
  });

  it("short-circuits a blank name before the insert, exactly as the writer does at line 272", () => {
    // The writer `continue`s on a blank name, so an insert can never be
    // attempted for it and the two rejection causes cannot both apply.
    expect(
      describeIntakeOutcome({ companyName: "   ", insertFailed: true, itemAlreadyExisted: true })
    ).toBe("REJECTED_MISSING_COMPANY_NAME");
    expect(describeIntakeOutcome({ companyName: "", insertFailed: false, itemAlreadyExisted: false })).toBe(
      "REJECTED_MISSING_COMPANY_NAME"
    );
    expect(describeIntakeOutcome({ companyName: null, insertFailed: false, itemAlreadyExisted: false })).toBe(
      "REJECTED_MISSING_COMPANY_NAME"
    );
    expect(describeIntakeOutcome({ companyName: undefined, insertFailed: false, itemAlreadyExisted: false })).toBe(
      "REJECTED_MISSING_COMPANY_NAME"
    );
  });

  it("names two rejection causes the single rejected_count counter cannot separate", () => {
    const blank = describeIntakeRejection("REJECTED_MISSING_COMPANY_NAME");
    const failed = describeIntakeRejection("REJECTED_LAKE_INSERT_FAILED");

    expect(blank.cause).toBe("MISSING_COMPANY_NAME");
    expect(failed.cause).toBe("LAKE_INSERT_FAILED");
    expect(blank.cause).not.toBe(failed.cause);
    // Same durable counter, different causes, and neither is stored anywhere.
    expect(blank.counted_as).toBe("rejected_count");
    expect(failed.counted_as).toBe("rejected_count");
    expect(blank.reason_recorded_durably).toBe(false);
    expect(failed.reason_recorded_durably).toBe(false);
    expect(blank.missing_evidence).toEqual(["item.company_name"]);
    expect(failed.missing_evidence).toEqual(["lake_insert_error_message"]);
    // Only the insert failure needs another write attempt to become visible.
    expect(blank.resolution_requires_write_attempt).toBe(false);
    expect(failed.resolution_requires_write_attempt).toBe(true);
  });

  it("reports no evidence or next action for an accepted item", () => {
    for (const outcome of ["ACCEPTED", "UPSERTED_EXISTING_ITEM"] as const) {
      const described = describeIntakeRejection(outcome);
      expect(described.cause).toBe("NONE");
      expect(described.counted_as).toBe("accepted_count");
      expect(described.missing_evidence).toEqual([]);
      expect(described.next_action).toBeNull();
    }
  });
});

describe("F-DUP-1 batch receipt arithmetic", () => {
  it("agrees with the writer on a batch where every item is accepted", () => {
    const items = [
      item({ companyName: "Affinity VA", niche: "global-va" }),
      item({ companyName: "Hunt St", niche: "bpo", isDayshift: true }),
      item({ companyName: "Some Board", isMarketplace: true }),
      item({ companyName: "BPO One", niche: "bpo" }),
      item({ companyName: "Tech One", niche: "tech" }),
    ];
    const summary = summarizeIntakeBatch(items, outcomesFor(items, () => ({})));

    expect(summary.acceptedItems).toBe(5);
    expect(summary.rejectedItems).toBe(0);
    expect(summary.focusGroupTotal).toBe(5);
    expect(summary.byFocusGroup).toEqual({
      global_va: 1,
      australian_dayshift: 1,
      job_boards: 1,
      bpo: 1,
      tech: 1,
    });
    expect(summary.priority1Count).toBe(3);
    expect(summary.priority2Count).toBe(2);
    expect(summary.classifiedButNotAccepted).toBe(0);
    expect(summary.countedButNotAccepted).toBe(0);
    // The two remaining inconsistencies are structural, not fixture-dependent.
    expect(summary.duplicateCountDerivable).toBe(false);
    expect(summary.repeatSubmissionDistinguishable).toBe(false);
    expect(summary.receiptTotalsAgree).toBe(false);
    expect(summary.inconsistencies).toEqual([
      "duplicate_count_is_structurally_zero",
      "repeat_submission_is_reported_as_accepted",
    ]);
  });

  it("counts a classified-but-failed insert in the focus group and never in accepted", () => {
    const items = [
      item({ companyName: "Kept", niche: "tech" }),
      item({ companyName: "Failed", niche: "tech" }),
    ];
    const summary = summarizeIntakeBatch(
      items,
      outcomesFor(items, (raw) => ({ insertFailed: raw.companyName === "Failed" }))
    );

    expect(summary.acceptedItems).toBe(1);
    expect(summary.rejectedItems).toBe(1);
    // Both items were classified before the insert, so the receipt reports two
    // tech leads while the lake holds one.
    expect(summary.byFocusGroup.tech).toBe(2);
    expect(summary.focusGroupTotal).toBe(2);
    expect(summary.classifiedButNotAccepted).toBe(1);
    expect(summary.rejections.LAKE_INSERT_FAILED).toBe(1);
    expect(summary.outcomes.REJECTED_LAKE_INSERT_FAILED).toBe(1);
    expect(summary.receiptTotalsAgree).toBe(false);
    expect(summary.inconsistencies).toContain(
      "focus_group_counts_include_items_that_were_never_stored"
    );
  });

  it("counts a blank-name rejection in priority 2 but in no focus group", () => {
    const items = [
      item({ companyName: "Kept", niche: "tech" }),
      item({ companyName: "   ", niche: "tech" }),
    ];
    const summary = summarizeIntakeBatch(items, outcomesFor(items, () => ({})));

    expect(summary.totalItems).toBe(2);
    expect(summary.acceptedItems).toBe(1);
    expect(summary.rejectedItems).toBe(1);
    expect(summary.rejections.MISSING_COMPANY_NAME).toBe(1);
    // The writer `continue`s before classification, so it is in no focus group...
    expect(summary.byFocusGroup.tech).toBe(1);
    expect(summary.focusGroupTotal).toBe(1);
    // ...but priority2Count is `items.length - priority1Count`, so it is counted.
    expect(summary.priority1Count).toBe(0);
    expect(summary.priority2Count).toBe(2);
    expect(summary.countedButNotAccepted).toBe(1);
    expect(summary.inconsistencies).toContain("priority_counts_include_items_that_were_never_stored");
    expect(summary.inconsistencies).not.toContain(
      "focus_group_counts_include_items_that_were_never_stored"
    );
  });

  it("reports a repeat of an identical batch exactly like the first submission", () => {
    const items = [item({ companyName: "Affinity VA", niche: "global-va" }), item({ companyName: "BPO One" })];
    const first = summarizeIntakeBatch(
      items,
      outcomesFor(items, () => ({ itemAlreadyExisted: false }))
    );
    const repeat = summarizeIntakeBatch(
      items,
      outcomesFor(items, () => ({ itemAlreadyExisted: true }))
    );

    // The durable counters differ in no field the writer persists.
    expect(repeat.duplicateItems).toBe(0);
    expect(repeat.acceptedItems).toBe(first.acceptedItems);
    expect(repeat.rejectedItems).toBe(first.rejectedItems);
    expect(repeat.byFocusGroup).toEqual(first.byFocusGroup);
    expect(repeat.priority1Count).toBe(first.priority1Count);
    expect(repeat.priority2Count).toBe(first.priority2Count);
    // Only the in-memory outcome tally distinguishes them, and it is never written.
    expect(repeat.outcomes.UPSERTED_EXISTING_ITEM).toBe(2);
    expect(first.outcomes.ACCEPTED).toBe(2);
    expect(repeat.duplicateCountDerivable).toBe(false);
    expect(repeat.repeatSubmissionDistinguishable).toBe(false);
  });

  it("can never produce a non-zero duplicate count", () => {
    const items = Array.from({ length: 25 }, (_, i) => item({ companyName: `Repeat ${i}` }));
    const summary = summarizeIntakeBatch(
      items,
      outcomesFor(items, () => ({ itemAlreadyExisted: true }))
    );
    expect(summary.duplicateItems).toBe(0);
    expect(summary.acceptedItems).toBe(25);
    expect(summary.outcomes.UPSERTED_EXISTING_ITEM).toBe(25);
  });

  it("refuses a summary whose outcome list does not match the item list", () => {
    const items = [item()];
    expect(() => summarizeIntakeBatch(items, [])).toThrow(/one outcome per item/);
  });
});

describe("F-DUP-1 stored raw payload versus content hash", () => {
  it("keeps hash and payload identical below the truncation limit", () => {
    const payload = JSON.stringify([item({ companyName: "Small batch" })]);
    const described = describeStoredRawPayload(payload);

    expect(described.truncated).toBe(false);
    expect(described.stored).toBe(payload);
    expect(described.hashCoversStoredPayload).toBe(true);
    expect(described.missing_evidence).toEqual([]);
    expect(described.next_action).toBeNull();
    // Independent re-derivation with the writer's own hashing helper.
    expect(described.contentHash).toBe(sha256Hex(payload));
    expect(described.storedPayloadHash).toBe(sha256Hex(described.stored));
  });

  it("treats exactly the limit as untruncated", () => {
    const payload = "a".repeat(INTAKE_RAW_PAYLOAD_MAX_CHARS);
    const described = describeStoredRawPayload(payload);
    expect(described.truncated).toBe(false);
    expect(described.hashCoversStoredPayload).toBe(true);
    expect(described.storedChars).toBe(INTAKE_RAW_PAYLOAD_MAX_CHARS);
  });

  it("hashes the full payload while storing a truncated one past the limit", () => {
    const payload = "a".repeat(INTAKE_RAW_PAYLOAD_MAX_CHARS + 1);
    const described = describeStoredRawPayload(payload);

    expect(described.truncated).toBe(true);
    expect(described.storedChars).toBe(INTAKE_RAW_PAYLOAD_MAX_CHARS);
    expect(described.hashInputChars).toBe(INTAKE_RAW_PAYLOAD_MAX_CHARS + 1);
    expect(described.hashCoversStoredPayload).toBe(false);
    expect(described.contentHash).toBe(sha256Hex(payload));
    expect(described.storedPayloadHash).not.toBe(described.contentHash);
    expect(described.missing_evidence).toEqual(["lake_intake_batches.raw_payload"]);
    expect(described.next_action).not.toBeNull();
  });
});

describe("F-DUP-1 owner lead classification and bulk precedence", () => {
  it("demotes an owner-reported PH/VA lead to general Priority 2", () => {
    // No isDayshift, no isMarketplace, free-text niche only. There is no
    // Philippine input anywhere on IntakeRawItem, so the lead cannot be told
    // apart from any other company lead.
    const lead = item({ companyName: "Reported PH VA Agency", niche: "virtual assistant", isRemote: true });
    const described = describeOwnerLeadClassification(lead);

    expect(classifyFocusGroup(lead).focusGroup).toBe("general");
    expect(described.focus_group).toBe("general");
    expect(described.priority).toBe(2);
    expect(described.entity_type).toBe("company_lead");
    expect(described.dispatch_position).toBe("PRIORITY_2");
    expect(described.ph_signal_present).toBe(false);
    expect(described.service_class_expressible).toBe(false);
    expect(described.missing_evidence).toContain("ph_eligibility_signal");
    expect(described.missing_evidence).toContain("service_class");
    expect(described.next_action).not.toBeNull();
  });

  it("demotes the same lead when the niche is absent entirely", () => {
    const withNiche = describeOwnerLeadClassification(item({ companyName: "A", niche: "bpo" }));
    const withoutNiche = describeOwnerLeadClassification(item({ companyName: "A", niche: undefined }));
    expect(withoutNiche.focus_group).toBe("general");
    expect(withoutNiche.priority).toBe(2);
    expect(withNiche.focus_group).toBe("bpo");
    expect(withoutNiche.ph_signal_present).toBe(false);
  });

  it("promotes an unintended item to global_va Priority 1 on the substring 'va'", () => {
    for (const niche of ["innovation", "private", "nova", "vantage"]) {
      const raw = item({ companyName: `Unintended ${niche}`, niche });
      const described = describeOwnerLeadClassification(raw);
      expect(classifyFocusGroup(raw).focusGroup).toBe("global_va");
      expect(described.focus_group).toBe("global_va");
      expect(described.priority).toBe(1);
      expect(described.promoted_by_niche_substring).toBe(true);
      expect(described.matched_niche_substring).toBe("va");
    }
  });

  it("promotes on 'virtual-assistant' too, which is a separate substring", () => {
    const described = describeOwnerLeadClassification(
      item({ companyName: "Hyphenated", niche: "virtual-assistant" })
    );
    expect(described.focus_group).toBe("global_va");
    expect(described.priority).toBe(1);
    expect(described.promoted_by_niche_substring).toBe(true);
    expect(described.matched_niche_substring).toBe("virtual-assistant");
  });

  it("does not call an exact VA token a substring promotion", () => {
    const described = describeOwnerLeadClassification(
      item({ companyName: "Affinity VA", niche: "global-va" })
    );
    expect(described.focus_group).toBe("global_va");
    expect(described.priority).toBe(1);
    expect(described.promoted_by_niche_substring).toBe(false);
    expect(described.matched_niche_substring).toBeNull();
  });

  it("does not flag a marketplace or dayshift lead as a substring promotion", () => {
    const board = describeOwnerLeadClassification(item({ companyName: "Board", isMarketplace: true, niche: "job-boards" }));
    expect(board.focus_group).toBe("job_boards");
    expect(board.promoted_by_niche_substring).toBe(false);

    const dayshift = describeOwnerLeadClassification(item({ companyName: "AU Co", isDayshift: true, niche: "bpo" }));
    expect(dayshift.focus_group).toBe("australian_dayshift");
    expect(dayshift.promoted_by_niche_substring).toBe(false);
  });

  it("puts an owner lead behind every bulk Priority-1 item", () => {
    const bulk = [
      item({ companyName: "Bulk VA 1", niche: "global-va" }),
      item({ companyName: "Bulk Dayshift", isDayshift: true, niche: "bpo" }),
      item({ companyName: "Bulk Board", isMarketplace: true }),
      item({ companyName: "Bulk BPO", niche: "bpo" }),
    ];
    const ownerLead = item({ companyName: "Reported PH VA Agency", niche: "virtual assistant" });

    const precedence = measureOwnerLeadPrecedence(ownerLead, bulk);
    expect(precedence.bulk_priority_1_items).toBe(3);
    expect(precedence.owner_lead_priority).toBe(2);
    expect(precedence.owner_lead_focus_group).toBe("general");
    expect(precedence.owner_lead_precedes_bulk).toBe(false);
    expect(precedence.owner_lead_deferred_behind_bulk).toBe(true);
    expect(precedence.ordering_expression).toBe("priority ASC, id ASC");
  });

  it("reports no deferral when the lead is itself Priority 1 or no bulk Priority 1 exists", () => {
    const ownerLead = item({ companyName: "Reported PH VA Agency", niche: "virtual assistant" });

    const ownerIsP1 = measureOwnerLeadPrecedence(
      item({ companyName: "Affinity VA", niche: "global-va" }),
      [item({ companyName: "Bulk VA 1", niche: "global-va" })]
    );
    expect(ownerIsP1.owner_lead_priority).toBe(1);
    expect(ownerIsP1.owner_lead_precedes_bulk).toBe(true);
    expect(ownerIsP1.owner_lead_deferred_behind_bulk).toBe(false);

    const noBulkP1 = measureOwnerLeadPrecedence(ownerLead, [item({ companyName: "Bulk BPO", niche: "bpo" })]);
    expect(noBulkP1.bulk_priority_1_items).toBe(0);
    expect(noBulkP1.owner_lead_deferred_behind_bulk).toBe(false);
  });
});

describe("F-DUP-1 source agreement with the intake writers", () => {
  it("pins the structurally-zero duplicate counter to the writer", () => {
    expect(HUMAN_INTAKE_SOURCE).toContain("let duplicateItems = 0;");
    expect(HUMAN_INTAKE_SOURCE).toContain("[acceptedItems, duplicateItems, rejectedItems, batchId]");
    // No incrementing path exists anywhere in the file.
    expect(HUMAN_INTAKE_SOURCE).not.toMatch(/duplicateItems\s*(\+\+|\+=|\+\s|=\s*[^0\s])/);
  });

  it("pins the priority arithmetic and the pre-insert classification order", () => {
    expect(HUMAN_INTAKE_SOURCE).toContain("const priority2Count = items.length - priority1Count;");
    expect(HUMAN_INTAKE_SOURCE).toContain("byFocusGroup[classification.focusGroup]");
    // byFocusGroup is incremented before the insert try/catch.
    const classifyAt = HUMAN_INTAKE_SOURCE.indexOf("byFocusGroup[classification.focusGroup]");
    const insertAt = HUMAN_INTAKE_SOURCE.indexOf("INSERT INTO lake_intake_items");
    const acceptedAt = HUMAN_INTAKE_SOURCE.indexOf("acceptedItems++");
    expect(classifyAt).toBeGreaterThan(-1);
    expect(classifyAt).toBeLessThan(insertAt);
    expect(insertAt).toBeLessThan(acceptedAt);
  });

  it("pins the three Priority-1 focus groups used by the receipt", () => {
    for (const group of ["australian_dayshift", "global_va", "job_boards"]) {
      expect(HUMAN_INTAKE_SOURCE).toContain(`byFocusGroup.${group}`);
    }
  });

  it("pins the truncation limit and the full-payload hash", () => {
    expect(HUMAN_INTAKE_SOURCE).toContain("const contentHash = sha256Hex(rawJson);");
    expect(HUMAN_INTAKE_SOURCE).toContain(`rawJson.length > 500_000`);
    expect(INTAKE_RAW_PAYLOAD_MAX_CHARS).toBe(500_000);
  });

  it("pins the dispatch ordering to priority then id", () => {
    expect(PROCESS_INTAKE_SOURCE).toContain('query += " ORDER BY priority ASC, id ASC";');
  });

  it("confirms the durable schema can hold a duplicate count but no cause and no PH field", () => {
    expect(INTAKE_SCHEMA).toContain("duplicate_count INTEGER NOT NULL DEFAULT 0");
    expect(INTAKE_SCHEMA).toContain("rejected_count INTEGER NOT NULL DEFAULT 0");
    // No reason/cause column anywhere in the two intake tables.
    expect(INTAKE_SCHEMA).not.toMatch(/^\s*(reason|cause|reject_reason)\s/m);
    // No Philippine column, so ph_eligibility_signal is genuinely absent here.
    expect(INTAKE_SCHEMA).not.toMatch(/ph_|philippin/i);
    // The unique key is (batch_id, item_index): identity within one batch only,
    // so the same company in a second batch is a different row.
    expect(INTAKE_SCHEMA).toContain("UNIQUE(batch_id, item_index)");
  });
});