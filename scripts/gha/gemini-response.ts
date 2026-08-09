type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

/** Extracts the strictly JSON action-plan payload returned by Gemini REST. */
export function extractActionPlan(response: unknown): string[] {
  const root = asRecord(response);
  const candidates = root?.candidates;
  if (!Array.isArray(candidates)) throw new Error("Gemini response has no text candidate");

  for (const candidate of candidates) {
    const content = asRecord(asRecord(candidate)?.content);
    const parts = content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const text = asRecord(part)?.text;
      if (typeof text !== "string" || text.trim() === "") continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Gemini response did not contain JSON");
      }
      if (!Array.isArray(parsed) || parsed.length > 30) {
        throw new Error("Gemini response must be an array of action strings");
      }
      const plan = parsed.map((step) => typeof step === "string" ? step.trim() : "");
      if (plan.some((step) => step === "" || step.length > 1_000)) {
        throw new Error("Gemini response must be an array of action strings");
      }
      return plan;
    }
  }

  throw new Error("Gemini response has no text candidate");
}
