/** Source-stated schedule hints. A client timezone alone is not a work schedule. */
export type ShiftCategory = "day_shift" | "mid_shift" | "night_shift" | "flexible" | "unknown";

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

const FLEXIBLE = /\b(async(?:hronous)?|work whenever|flexible (?:hours|schedule|working hours)|any timezone|set your own hours|work on your own time)\b/i;
const SHIFT_MARKERS: Array<[ShiftCategory, RegExp]> = [
  ["day_shift", /\b(day[- ]?shift|australian (?:business )?hours|philippine (?:business )?hours)\b/i],
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
  const matches = SHIFT_MARKERS.filter(([, pattern]) => pattern.test(text));
  const category: ShiftCategory = negated || matches.length > 1
    ? "unknown"
    : matches[0]?.[0] ?? (flexible ? "flexible" : "unknown");
  return {
    category,
    clientTimezone: timezone,
    // A region or shift category specifies no start/end times. Keep this null
    // until a separately verified explicit-hours parser exists.
    phWorkingHours: null,
    isAsyncOrFlexible: !negated && flexible,
    evidence: category === "unknown"
      ? "Working schedule is unstated, negated, or conflicting"
      : `Source states ${category.replaceAll("_", " ")}; exact Philippine hours are not established`,
  };
}
