/**
 * Compensation Normalization & Intelligence (Pillar K / Section 25).
 *
 * Normalizes raw salary/pay strings into structured fields with transparent,
 * disclaimed monthly equivalents. Never guarantees estimated values.
 */

export interface NormalizedCompensation {
  raw: string;
  payMin: number | null;
  payMax: number | null;
  currency: string;
  period: "hourly" | "monthly" | "yearly" | "weekly" | "unknown";
  estimatedMonthlyLow: number | null;
  estimatedMonthlyHigh: number | null;
  disclaimer: string;
}

const HOURLY_TO_MONTHLY_HOURS = 160; // 40h/week * 4 weeks
const WEEKS_PER_MONTH = 4.333;

const COMPENSATION_DISCLAIMER =
  "Estimated monthly figures are normalized reference projections (based on 160 hours/month for hourly roles or annualized base). They do not constitute guaranteed compensation; actual payouts depend on agreed client contracts, working hours, and tax/fee structures.";

/**
 * Normalizes a raw compensation or salary string into structured compensation metadata.
 */
export function normalizeCompensation(rawSalary?: string | null): NormalizedCompensation | null {
  if (!rawSalary) return null;
  const clean = rawSalary.trim();
  if (!clean || clean.length < 2) return null;

  // 1. Detect Currency
  let currency = "USD";
  if (/(\bphp\b|₱)/i.test(clean)) currency = "PHP";
  else if (/(\beur\b|€)/i.test(clean)) currency = "EUR";
  else if (/(\bgbp\b|£)/i.test(clean)) currency = "GBP";
  else if (/\baud\b/i.test(clean)) currency = "AUD";
  else if (/\bcad\b/i.test(clean)) currency = "CAD";
  else if (/\bsgd\b/i.test(clean)) currency = "SGD";
  else if (/\busd\b|\$/i.test(clean)) currency = "USD";

  // 2. Detect Period
  let period: NormalizedCompensation["period"] = "unknown";
  if (/(?:per\s+hour|\/\s*(?:hr|hour|h)\b|\bhourly\b)/i.test(clean)) {
    period = "hourly";
  } else if (/(?:per\s+month|\/\s*(?:mo|month|m)\b|\bmonthly\b)/i.test(clean)) {
    period = "monthly";
  } else if (/(?:per\s+year|\/\s*(?:yr|year|y)\b|\bannually\b|\bannual\b|\bp\.a\.)/i.test(clean)) {
    period = "yearly";
  } else if (/(?:per\s+week|\/\s*(?:wk|week)\b|\bweekly\b)/i.test(clean)) {
    period = "weekly";
  }

  // 3. Extract Numeric Values (handling commas and 'k' suffix)
  // Matches e.g. "50k", "50,000", "50000", "25.50"
  const numberMatches = clean.match(/(\d+(?:,\d{3})*(?:\.\d+)?|\d+)(k)?\b/gi);
  if (!numberMatches || numberMatches.length === 0) {
    return null;
  }

  const parseNumber = (token: string): number => {
    let valStr = token.replace(/,/g, "").toLowerCase();
    let multiplier = 1;
    if (valStr.endsWith("k")) {
      multiplier = 1000;
      valStr = valStr.slice(0, -1);
    }
    const parsed = parseFloat(valStr);
    return isNaN(parsed) ? 0 : parsed * multiplier;
  };

  const parsedNumbers = numberMatches.map(parseNumber).filter((n) => n > 0);
  if (parsedNumbers.length === 0) return null;

  let payMin: number = parsedNumbers[0];
  let payMax: number = parsedNumbers.length > 1 ? parsedNumbers[1] : parsedNumbers[0];

  if (payMin > payMax) {
    const temp = payMin;
    payMin = payMax;
    payMax = temp;
  }

  // Infer period if still unknown based on magnitude (for USD/EUR/GBP)
  if (period === "unknown" && currency !== "PHP") {
    if (payMax <= 200) {
      period = "hourly";
    } else if (payMin >= 20000) {
      period = "yearly";
    } else if (payMin >= 1000 && payMax <= 15000) {
      period = "monthly";
    }
  }

  // 4. Calculate Normalized Monthly Reference Range
  let estimatedMonthlyLow: number | null = null;
  let estimatedMonthlyHigh: number | null = null;

  if (period === "hourly") {
    estimatedMonthlyLow = Math.round(payMin * HOURLY_TO_MONTHLY_HOURS);
    estimatedMonthlyHigh = Math.round(payMax * HOURLY_TO_MONTHLY_HOURS);
  } else if (period === "weekly") {
    estimatedMonthlyLow = Math.round(payMin * WEEKS_PER_MONTH);
    estimatedMonthlyHigh = Math.round(payMax * WEEKS_PER_MONTH);
  } else if (period === "monthly") {
    estimatedMonthlyLow = Math.round(payMin);
    estimatedMonthlyHigh = Math.round(payMax);
  } else if (period === "yearly") {
    estimatedMonthlyLow = Math.round(payMin / 12);
    estimatedMonthlyHigh = Math.round(payMax / 12);
  }

  return {
    raw: clean,
    payMin,
    payMax,
    currency,
    period,
    estimatedMonthlyLow,
    estimatedMonthlyHigh,
    disclaimer: COMPENSATION_DISCLAIMER,
  };
}
