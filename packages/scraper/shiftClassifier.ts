/** Source-stated schedule hints. A client timezone alone is not a work schedule. */
export type ShiftCategory = "day_shift" | "mid_shift" | "night_shift" | "flexible" | "unknown";

export interface ShiftInfo {
  category: ShiftCategory;
  clientTimezone: string | null;
  phWorkingHours: string | null;
  isAsyncOrFlexible: boolean;
  isDayshift: boolean;
  evidence: string;
}

export interface ShiftClassifierInput {
  clientTimezone?: string | null;
  title?: string | null;
  description?: string | null;
}

const FLEXIBLE = /\b(async(?:hronous)?|work whenever|flexible (?:hours|schedule|working hours)|any timezone|set your own hours|work on your own time)\b/i;
const PHT_DAYTIME_SPAN = /\b((?:(?:0?[6-9]|10)(?::[0-5][0-9])?\s*(?:am|a\.m\.)?)\s*[-–—to]+\s*(?:(?:0?[2-6]|1[4-8])(?::[0-5][0-9])?\s*(?:pm|p\.m\.)?)\s*(?:pht\b|manila(?:\s*time)?|philippine(?:\s*time)?|\(pht\)))/i;

const SHIFT_MARKERS: Array<[ShiftCategory, RegExp]> = [
  ["day_shift", /\b(day[- ]?shift|daytime (?:shift|hours)|morning shift|australian (?:business )?hours|philippine (?:business )?hours|new zealand (?:business )?hours|apac (?:business )?hours|au (?:business )?hours|nz (?:business )?hours|aest (?:business )?hours|awst (?:business )?hours)\b/i],
  ["mid_shift", /\b(mid[- ]?shift|uk (?:business )?hours|european (?:business )?hours)\b/i],
  ["night_shift", /\b(night[- ]?shift|graveyard(?: shift)?|us (?:eastern |pacific )?(?:business )?hours)\b/i],
];

export function classifyShift(input: ShiftClassifierInput): ShiftInfo {
  const timezone = input.clientTimezone?.trim() || null;
  const text = `${input.title || ""}. ${input.description || ""}`;
  const flexible = FLEXIBLE.test(text);
  // Only explicit schedule phrases qualify. EST in an address, PST in a
  // deadline, and CT in a clinical role prove no shift.
  const negated = /\b(?:no|not|without)\b[^.!?\n]{0,40}\b(?:shift|hours|async|flexible)\b/i.test(text);
  const phtSpanMatch = PHT_DAYTIME_SPAN.exec(text);
  const matches = SHIFT_MARKERS.filter(([, pattern]) => pattern.test(text));

  const hasDayShiftSpan = Boolean(phtSpanMatch);
  const hasDayShiftMarker = matches.some(([cat]) => cat === "day_shift");

  let effectiveMatches = matches;
  if (hasDayShiftSpan && !hasDayShiftMarker) {
    effectiveMatches = [["day_shift", PHT_DAYTIME_SPAN], ...matches];
  }

  const category: ShiftCategory = negated || effectiveMatches.length > 1
    ? "unknown"
    : effectiveMatches[0]?.[0] ?? (flexible ? "flexible" : "unknown");

  const phWorkingHours = (!negated && category === "day_shift" && phtSpanMatch)
    ? phtSpanMatch[1].trim()
    : null;

  return {
    category,
    clientTimezone: timezone,
    phWorkingHours,
    isAsyncOrFlexible: !negated && flexible,
    isDayshift: category === "day_shift",
    evidence: category === "unknown"
      ? "Working schedule is unstated, negated, or conflicting"
      : phWorkingHours
        ? `Source states day shift (${phWorkingHours})`
        : `Source states ${category.replaceAll("_", " ")}; exact Philippine hours are not established`,
  };
}
