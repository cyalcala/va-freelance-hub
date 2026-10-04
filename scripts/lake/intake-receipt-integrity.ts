/**
 * Intake receipt integrity — scripts/lake/intake-receipt-integrity.ts
 *
 * F-DUP-1 (MATH-09 identity/linkage + MATH-05 eligibility/calibration;
 * HRI-02 "classification, normalization, deduplication and uncertain-field
 * handling", HRI-05 fair dispatch).
 *
 * Pure projection over the human-research intake path. No writer, no client,
 * no network, no schema change. Nothing here is imported by a runtime writer;
 * it exists to make three things measurable that the durable intake record
 * currently cannot express:
 *
 *   1. a duplicate submission — `ingestIntakeBatch` initialises
 *      `duplicateItems = 0` and never increments it, so the
 *      `duplicate_count` column it writes is always zero, and a repeat of an
 *      identical batch is upserted and counted as `acceptedItems`;
 *   2. the cause of a rejection — a blank `companyName` and a failed insert
 *      share the single `rejected_count` counter, and neither is recorded;
 *   3. an owner-reported lead's queue class — `classifyFocusGroup` has no
 *      Philippine signal and no service class, so an individually reported
 *      PH/VA lead classifies as `general` / Priority 2 and is dispatched
 *      behind every bulk-directory Priority-1 item.
 *
 * Every threshold used here is either read from the module that owns it or
 * transcribed from `human-intake.ts` and pinned by a source-agreement test, so
 * a change to the writer's own formulas fails this suite instead of silently
 * desynchronising the projection. Authority is unchanged: no new enum, no new
 * column, no gate, no ceiling, no source id.
 */

import { classifyFocusGroup, type IntakeRawItem } from "./human-intake";
import { sha256Hex } from "./lake-shared";

export const INTAKE_RECEIPT_PROJECTION_VERSION = 1;

/**
 * `human-intake.ts:260` stores `rawJson.length > 500_000 ? rawJson.slice(0, 500_000)
 * : rawJson`, while `contentHash = sha256Hex(rawJson)` at line 226 hashes the
 * untruncated payload. Transcribed here so the divergence is measurable;
 * `intake-receipt-integrity.test.ts` pins it against the writer's source text.
 */
export const INTAKE_RAW_PAYLOAD_MAX_CHARS = 500_000;

/** The only four durable per-batch counters `ingestIntakeBatch` writes. */
export const INTAKE_BATCH_COUNTERS = [
  "accepted_count",
  "duplicate_count",
  "rejected_count",
  "item_count",
] as const;

export type IntakeItemOutcome =
  | "ACCEPTED"
  | "UPSERTED_EXISTING_ITEM"
  | "REJECTED_MISSING_COMPANY_NAME"
  | "REJECTED_LAKE_INSERT_FAILED";

export type IntakeRejectionCause = "NONE" | "MISSING_COMPANY_NAME" | "LAKE_INSERT_FAILED";

/**
 * The outcome `ingestIntakeBatch` produces for one item, derived from the same
 * three branch conditions the writer tests, in the writer's order:
 * blank name (line 272) short-circuits before classification; a thrown insert
 * (line 320) is caught and counted as rejected; anything else increments
 * `acceptedItems`, including the upsert of a row that already existed.
 */
export function describeIntakeOutcome(input: {
  companyName: string | null | undefined;
  insertFailed: boolean;
  itemAlreadyExisted: boolean;
}): IntakeItemOutcome {
  const name = (input.companyName || "").trim();
  if (!name) return "REJECTED_MISSING_COMPANY_NAME";
  if (input.insertFailed) return "REJECTED_LAKE_INSERT_FAILED";
  return input.itemAlreadyExisted ? "UPSERTED_EXISTING_ITEM" : "ACCEPTED";
}

export interface IntakeRejectionDescription {
  cause: IntakeRejectionCause;
  /** The durable per-batch counter the writer increments for this outcome. */
  counted_as: "accepted_count" | "rejected_count";
  /**
   * `lake_intake_items` has no reason/cause column (confirmed against the
   * schema in `init-lake.ts`), and the batch row has three counters and no
   * cause text, so the distinction survives only in stdout.
   */
  reason_recorded_durably: boolean;
  /** Observing whether the insert failed is the only way to learn the cause. */
  resolution_requires_write_attempt: boolean;
  missing_evidence: string[];
  next_action: string | null;
}

export function describeIntakeRejection(outcome: IntakeItemOutcome): IntakeRejectionDescription {
  if (outcome === "ACCEPTED" || outcome === "UPSERTED_EXISTING_ITEM") {
    return {
      cause: "NONE",
      counted_as: "accepted_count",
      reason_recorded_durably: false,
      resolution_requires_write_attempt: false,
      missing_evidence: [],
      next_action: null,
    };
  }
  if (outcome === "REJECTED_MISSING_COMPANY_NAME") {
    return {
      cause: "MISSING_COMPANY_NAME",
      counted_as: "rejected_count",
      reason_recorded_durably: false,
      // The item is never classified or inserted, so nothing downstream can
      // name the cause; only the pre-insert source payload retains it.
      resolution_requires_write_attempt: false,
      missing_evidence: ["item.company_name"],
      next_action: "resubmit the lead with a company name",
    };
  }
  return {
    cause: "LAKE_INSERT_FAILED",
    counted_as: "rejected_count",
    reason_recorded_durably: false,
    // A lake constraint violation or transport failure is only observable by
    // attempting the write again; the error text is logged and dropped.
    resolution_requires_write_attempt: true,
    missing_evidence: ["lake_insert_error_message"],
    next_action: "re-attempt the insert and retain the error message with the item",
  };
}

export interface IntakeBatchSummary {
  totalItems: number;
  /** ACCEPTED + UPSERTED_EXISTING_ITEM — the writer's `acceptedItems`. */
  acceptedItems: number;
  /** Always 0: the writer initialises `duplicateItems = 0` and never increments it. */
  duplicateItems: number;
  rejectedItems: number;
  /** Counted at classification time, before the insert, so rejected items are included. */
  byFocusGroup: Record<string, number>;
  /** Sum of `byFocusGroup`. */
  focusGroupTotal: number;
  priority1Count: number;
  /** `items.length - priority1Count` in the writer, so it includes rejected items. */
  priority2Count: number;
  outcomes: Record<IntakeItemOutcome, number>;
  rejections: Record<IntakeRejectionCause, number>;
  /** `focusGroupTotal` minus `acceptedItems` — classified but never stored. */
  classifiedButNotAccepted: number;
  /** `priority1Count + priority2Count` minus `acceptedItems`. */
  countedButNotAccepted: number;
  /** No fixture can make this true; present so the claim is measured, not asserted. */
  duplicateCountDerivable: boolean;
  /** A repeat of an identical batch is reported exactly like a first submission. */
  repeatSubmissionDistinguishable: boolean;
  receiptTotalsAgree: boolean;
  inconsistencies: string[];
}

const PRIORITY_1_FOCUS_GROUPS = ["australian_dayshift", "global_va", "job_boards"] as const;

/**
 * The batch receipt exactly as `ingestIntakeBatch` computes it, with the three
 * inconsistencies the counters cannot express made explicit instead of hidden
 * inside the totals.
 */
export function summarizeIntakeBatch(
  items: IntakeRawItem[],
  outcomes: IntakeItemOutcome[]
): IntakeBatchSummary {
  if (items.length !== outcomes.length) {
    throw new Error(
      `intake summary requires one outcome per item: ${items.length} items, ${outcomes.length} outcomes`
    );
  }

  const byFocusGroup: Record<string, number> = {};
  const outcomeCounts: Record<IntakeItemOutcome, number> = {
    ACCEPTED: 0,
    UPSERTED_EXISTING_ITEM: 0,
    REJECTED_MISSING_COMPANY_NAME: 0,
    REJECTED_LAKE_INSERT_FAILED: 0,
  };
  const rejectionCounts: Record<IntakeRejectionCause, number> = {
    NONE: 0,
    MISSING_COMPANY_NAME: 0,
    LAKE_INSERT_FAILED: 0,
  };

  let acceptedItems = 0;
  let rejectedItems = 0;

  for (let i = 0; i < items.length; i++) {
    const outcome = outcomes[i];
    outcomeCounts[outcome]++;

    const rejection = describeIntakeRejection(outcome);
    rejectionCounts[rejection.cause]++;
    if (outcome === "ACCEPTED" || outcome === "UPSERTED_EXISTING_ITEM") acceptedItems++;
    else rejectedItems++;

    // The writer classifies only after the blank-name short-circuit, so a
    // rejected-for-blank-name item contributes to no focus group.
    if (outcome !== "REJECTED_MISSING_COMPANY_NAME") {
      const { focusGroup } = classifyFocusGroup(items[i]);
      byFocusGroup[focusGroup] = (byFocusGroup[focusGroup] || 0) + 1;
    }
  }

  const focusGroupTotal = Object.values(byFocusGroup).reduce((sum, n) => sum + n, 0);
  const priority1Count = PRIORITY_1_FOCUS_GROUPS.reduce(
    (sum, group) => sum + (byFocusGroup[group] || 0),
    0
  );
  const priority2Count = items.length - priority1Count;
  const classifiedButNotAccepted = focusGroupTotal - acceptedItems;
  const countedButNotAccepted = priority1Count + priority2Count - acceptedItems;

  const inconsistencies: string[] = [];
  if (classifiedButNotAccepted > 0) {
    inconsistencies.push(
      "focus_group_counts_include_items_that_were_never_stored"
    );
  }
  if (countedButNotAccepted > 0) {
    inconsistencies.push("priority_counts_include_items_that_were_never_stored");
  }
  inconsistencies.push("duplicate_count_is_structurally_zero");
  inconsistencies.push("repeat_submission_is_reported_as_accepted");

  return {
    totalItems: items.length,
    acceptedItems,
    duplicateItems: 0,
    rejectedItems,
    byFocusGroup,
    focusGroupTotal,
    priority1Count,
    priority2Count,
    outcomes: outcomeCounts,
    rejections: rejectionCounts,
    classifiedButNotAccepted,
    countedButNotAccepted,
    duplicateCountDerivable: false,
    repeatSubmissionDistinguishable: false,
    receiptTotalsAgree: inconsistencies.length === 0,
    inconsistencies,
  };
}

export interface StoredRawPayload {
  /** The value written to `lake_intake_batches.raw_payload`. */
  stored: string;
  truncated: boolean;
  /** Characters fed to `sha256Hex` by the writer. */
  hashInputChars: number;
  storedChars: number;
  /** False once truncation occurs: the stored payload is not the hashed payload. */
  hashCoversStoredPayload: boolean;
  contentHash: string;
  storedPayloadHash: string;
  missing_evidence: string[];
  next_action: string | null;
}

/**
 * `contentHash` is computed over the full raw JSON; `raw_payload` is truncated.
 * This makes the two divergence points measurable on one payload.
 */
export function describeStoredRawPayload(fullRawJson: string): StoredRawPayload {
  const contentHash = sha256Hex(fullRawJson);
  const truncated = fullRawJson.length > INTAKE_RAW_PAYLOAD_MAX_CHARS;
  const stored = truncated ? fullRawJson.slice(0, INTAKE_RAW_PAYLOAD_MAX_CHARS) : fullRawJson;
  const storedPayloadHash = sha256Hex(stored);
  const hashCoversStoredPayload = contentHash === storedPayloadHash;

  return {
    stored,
    truncated,
    hashInputChars: fullRawJson.length,
    storedChars: stored.length,
    hashCoversStoredPayload,
    contentHash,
    storedPayloadHash,
    missing_evidence: hashCoversStoredPayload ? [] : ["lake_intake_batches.raw_payload"],
    next_action: hashCoversStoredPayload
      ? null
      : "store the payload the hash was taken over, or hash the stored payload",
  };
}

export interface OwnerLeadClassification {
  company_name: string;
  focus_group: string;
  priority: number;
  entity_type: string;
  /** `classifyFocusGroup` has no Philippine input of any kind. */
  ph_signal_present: boolean;
  /** No field on `IntakeRawItem` carries owner/VA service intent beyond the free-text niche. */
  service_class_expressible: boolean;
  /**
   * True when `global_va` / Priority 1 was reached only because the free-text
   * niche contains the substring "va" or "virtual-assistant" — e.g.
   * `innovation`, `private`, `nova` — rather than an exact VA token.
   */
  promoted_by_niche_substring: boolean;
  matched_niche_substring: string | null;
  niche: string;
  /** Priority-1 items ahead of this lead under `ORDER BY priority ASC, id ASC`. */
  dispatch_position: "PRIORITY_1" | "PRIORITY_2";
  missing_evidence: string[];
  next_action: string | null;
}

const EXACT_VA_NICHE_TOKENS = ["global-va"];

/**
 * Projects what the durable intake record can say about one submitted lead.
 * The v6.5 service classes (OWNER_PH_VA, PH_CONFIDENT, ...) are conceptual and
 * have no repository authority, so this reports `UNKNOWN` as a class and names
 * the absent inputs instead of inventing an enum or a column.
 */
export function describeOwnerLeadClassification(item: IntakeRawItem): OwnerLeadClassification {
  const classification = classifyFocusGroup(item);
  const niche = (item.niche || "").toLowerCase().trim();
  const reachedGlobalVa =
    classification.focusGroup === "global_va" &&
    !EXACT_VA_NICHE_TOKENS.includes(niche);
  const matchedNicheSubstring = reachedGlobalVa
    ? niche.includes("va")
      ? "va"
      : niche.includes("virtual-assistant")
        ? "virtual-assistant"
        : null
    : null;

  const missingEvidence: string[] = [];
  if (!item.isMarketplace && !item.isDayshift) {
    // No PH field exists on IntakeRawItem or on lake_intake_items, so a lead
    // reported as Philippine cannot be distinguished from any other lead.
    missingEvidence.push("ph_eligibility_signal");
  }
  missingEvidence.push("owner_submitted_at_per_item");
  missingEvidence.push("service_class");

  return {
    company_name: (item.companyName || "").trim(),
    focus_group: classification.focusGroup,
    priority: classification.priority,
    entity_type: classification.entityType,
    ph_signal_present: false,
    service_class_expressible: false,
    promoted_by_niche_substring: reachedGlobalVa && matchedNicheSubstring !== null,
    matched_niche_substring: matchedNicheSubstring,
    niche,
    dispatch_position: classification.priority === 1 ? "PRIORITY_1" : "PRIORITY_2",
    missing_evidence: missingEvidence,
    next_action: missingEvidence.length === 0 ? null : "classify the lead's service class from owner evidence before bulk discovery is dispatched",
  };
}

export interface OwnerLeadPrecedence {
  owner_lead_priority: number;
  owner_lead_focus_group: string;
  bulk_priority_1_items: number;
  owner_lead_precedes_bulk: boolean;
  /** True when a single bounded run can consume every Priority-1 bulk item first. */
  owner_lead_deferred_behind_bulk: boolean;
  ordering_expression: string;
  note: string;
}

/**
 * `process-intake.ts:216` orders strictly `priority ASC, id ASC`. Given the
 * directory bulk scrape documented in HRI-01/HRI-02 evidence, this measures how
 * many bulk Priority-1 items an individually owner-reported lead waits behind.
 */
export function measureOwnerLeadPrecedence(
  ownerLead: IntakeRawItem,
  bulkItems: IntakeRawItem[]
): OwnerLeadPrecedence {
  const lead = describeOwnerLeadClassification(ownerLead);
  const bulkPriority1 = bulkItems.filter(
    (item) => classifyFocusGroup(item).priority === 1
  ).length;

  return {
    owner_lead_priority: lead.priority,
    owner_lead_focus_group: lead.focus_group,
    bulk_priority_1_items: bulkPriority1,
    owner_lead_precedes_bulk: lead.priority === 1,
    owner_lead_deferred_behind_bulk: lead.priority === 2 && bulkPriority1 > 0,
    ordering_expression: "priority ASC, id ASC",
    note:
      "Priority is the only ordering key; there is no owner/origin key, no queue position and no fair-share field on lake_intake_items, so a bulk scrape outranks an individual report whenever the two differ in priority.",
  };
}