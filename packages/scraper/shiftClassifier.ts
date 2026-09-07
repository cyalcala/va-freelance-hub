/**
 * Timezone and Shift Intelligence for Filipino Freelancers (Pillar K / Section 24).
 *
 * Derives client timezone, shift classification (Day/Mid/Night/Flexible),
 * and approximate Philippine working hours (UTC+8 / PHT) with zero fabrication:
 * returns "unknown" when signals are unstated.
 */

export type ShiftCategory =
  | "day_shift"
  | "mid_shift"
  | "night_shift"
  | "flexible"
  | "unknown";

export interface ShiftInfo {
  category: ShiftCategory;
  clientTimezone: string | null;
  phWorkingHours: string | null;
  isAsyncOrFlexible: boolean;
  evidence: string;
}

export interface ShiftClassifierInput {
  clientTimezone?: string | null;
  title?: string | null;
  description?: string | null;
}

// ─── Regex Patterns ──────────────────────────────────────────────────────────

const ASYNC_FLEXIBLE_REGEX =
  /\b(async(?:hronous)?|work whenever|flexible (?:hours|schedule|working hours)|any timezone|results[- ]oriented|set your own hours|work on your own time)\b/i;

const DAY_SHIFT_REGEX =
  /\b(day[- ]?shift|australian (?:hours|dayshift)|aest|acst|awst|philippine (?:business )?hours|pht|sgt|jst|hkt|gmt\+8|utc\+8)\b/i;

const MID_SHIFT_REGEX =
  /\b(mid[- ]?shift|uk (?:hours|time)|european (?:hours|business hours)|gmt|bst|cet|cest|eet|eest|utc\+[0-3]|gmt\+[0-3])\b/i;

const NIGHT_SHIFT_REGEX =
  /\b(night[- ]?shift|graveyard(?: shift)?|us (?:hours|time|business hours)|est|edt|cst|cdt|pst|pdt|mst|mdt|\bet\b|\bpt\b|\bct\b|utc\-[4-8]|gmt\-[4-8])\b/i;

// Match standard timezone tokens from clientTimezone string
const TIMEZONE_TOKEN_REGEX =
  /\b(AEST|ACST|AWST|PHT|SGT|JST|HKT|GMT|BST|CET|CEST|EET|EEST|EST|EDT|CST|CDT|PST|PDT|MST|MDT|UTC\s*[+-]\s*\d{1,2})\b/i;

/**
 * Classifies the shift and calculates approximate Philippine working window (PHT / UTC+8).
 */
export function classifyShift(input: ShiftClassifierInput): ShiftInfo {
  const tzRaw = (input.clientTimezone || "").trim();
  const text = `${input.title || ""} ${input.description || ""}`.toLowerCase();
  const isAsync = ASYNC_FLEXIBLE_REGEX.test(text) || ASYNC_FLEXIBLE_REGEX.test(tzRaw);

  // 1. Extract clean client timezone token if present
  let extractedTz: string | null = null;
  const tzMatch = tzRaw.match(TIMEZONE_TOKEN_REGEX);
  if (tzMatch) {
    extractedTz = tzMatch[0].toUpperCase();
  } else if (tzRaw.length > 0 && tzRaw.length <= 30) {
    extractedTz = tzRaw;
  }

  // 2. Evaluate shift markers with priority: Explicit Day/Mid/Night > Timezone Token > Flexible > Unknown
  const isDaySignal = DAY_SHIFT_REGEX.test(tzRaw) || DAY_SHIFT_REGEX.test(text);
  const isMidSignal = MID_SHIFT_REGEX.test(tzRaw) || MID_SHIFT_REGEX.test(text);
  const isNightSignal = NIGHT_SHIFT_REGEX.test(tzRaw) || NIGHT_SHIFT_REGEX.test(text);

  if (isDaySignal) {
    return {
      category: "day_shift",
      clientTimezone: extractedTz || "AEST / APAC",
      phWorkingHours: "6:00 AM - 3:00 PM PHT",
      isAsyncOrFlexible: isAsync,
      evidence: "APAC / Australian / Day shift signal detected",
    };
  }

  if (isMidSignal) {
    return {
      category: "mid_shift",
      clientTimezone: extractedTz || "UK / CET",
      phWorkingHours: "2:00 PM - 11:00 PM PHT",
      isAsyncOrFlexible: isAsync,
      evidence: "European / UK / Mid shift signal detected",
    };
  }

  if (isNightSignal) {
    return {
      category: "night_shift",
      clientTimezone: extractedTz || "US (EST/PST)",
      phWorkingHours: "9:00 PM - 6:00 AM PHT",
      isAsyncOrFlexible: isAsync,
      evidence: "North American / Night shift signal detected",
    };
  }

  if (isAsync) {
    return {
      category: "flexible",
      clientTimezone: extractedTz,
      phWorkingHours: "Flexible / Async schedule",
      isAsyncOrFlexible: true,
      evidence: "Async or flexible working hours explicitly indicated",
    };
  }

  // Fail-safe: No invented certainty
  return {
    category: "unknown",
    clientTimezone: extractedTz,
    phWorkingHours: null,
    isAsyncOrFlexible: false,
    evidence: "No explicit timezone or shift requirements stated",
  };
}
