/**
 * Queue instrumentation for Master Operating Constitution v3.0 Parts XXVI–XXVII.
 *
 * Q_next = max(0, Q_current + arrivals - completions)
 * L = lambda * W only when interarrival variation is known and not bursty.
 * LITTLE_LAW_CV_MAX is a provisional engineering bound, not an accepted parameter.
 */

export const LITTLE_LAW_CV_MAX = 1;

export type QueueStability = "STABLE" | "UNSTABLE" | "UNKNOWN";

export interface ResidenceSummary {
  n: number;
  oldest: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  status: "MEASURED" | "UNKNOWN";
}

export interface LittlesLawResult {
  applicable: boolean;
  L: number | null;
  reason: string;
}

export interface QueueAuditResult {
  errors: string[];
  warnings: string[];
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function nextQueueDepth(current: number, arrivals: number, completions: number): number {
  if (![current, arrivals, completions].every(finiteNonNegative)) {
    throw new Error("queue depth inputs must be finite and non-negative");
  }
  return Math.max(0, current + arrivals - completions);
}

export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance) / mean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function residencePercentiles(hours: number[]): ResidenceSummary {
  if (hours.length === 0 || hours.some((value) => !Number.isFinite(value) || value < 0)) {
    return { n: hours.length, oldest: null, p50: null, p95: null, p99: null, status: "UNKNOWN" };
  }
  const sorted = [...hours].sort((a, b) => a - b);
  return {
    n: sorted.length,
    oldest: sorted[sorted.length - 1],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    status: "MEASURED",
  };
}

export function littlesLaw(input: {
  arrivalRatePerHour: number;
  meanResidenceHours: number;
  interarrivalCv: number | null;
  cvSteadyStateMax?: number;
}): LittlesLawResult {
  const cvMax = input.cvSteadyStateMax ?? LITTLE_LAW_CV_MAX;
  if (!(input.arrivalRatePerHour > 0) || !(input.meanResidenceHours >= 0) || !Number.isFinite(input.meanResidenceHours)) {
    return {
      applicable: false,
      L: null,
      reason: "arrival rate or residence time is not a usable measurement",
    };
  }
  if (input.interarrivalCv === null || !Number.isFinite(input.interarrivalCv)) {
    return {
      applicable: false,
      L: null,
      reason: "interarrival coefficient of variation is unknown; steady-state Little's law is not assumed",
    };
  }
  if (input.interarrivalCv > cvMax) {
    return {
      applicable: false,
      L: null,
      reason: `interarrival CV ${input.interarrivalCv} exceeds provisional steady-state bound ${cvMax}`,
    };
  }
  return {
    applicable: true,
    L: input.arrivalRatePerHour * input.meanResidenceHours,
    reason: "CV is within the provisional bound; L = lambda * W",
  };
}

export function queueStability(arrivalRate: number, serviceRate: number): QueueStability {
  if (!finiteNonNegative(arrivalRate) || !finiteNonNegative(serviceRate)) return "UNKNOWN";
  if (arrivalRate === 0 && serviceRate === 0) return "UNKNOWN";
  // Service capacity must be strictly greater than arrival. rho = 1 is not treated as stable.
  if (serviceRate > arrivalRate) return "STABLE";
  return "UNSTABLE";
}

export function auditQueueInstrumentation(): QueueAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [
    "LITTLE_LAW_CV_MAX is provisional. It is not an accepted governance parameter.",
    "These functions do not yet read live D1 or Turso queue rows. They instrument the definitions so a later measurement cannot invent steady state.",
  ];
  try {
    if (nextQueueDepth(5, 3, 10) !== 0) errors.push("queue depth must clamp at zero");
    if (nextQueueDepth(2, 4, 1) !== 5) errors.push("queue depth evolution failed");
    const unknownLaw = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 3, interarrivalCv: null });
    if (unknownLaw.applicable || unknownLaw.L !== null) errors.push("Little's law must abstain when CV is unknown");
    const measured = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 3, interarrivalCv: 0.2 });
    if (!measured.applicable || measured.L !== 6) errors.push("Little's law L = lambda * W failed");
    if (queueStability(4, 4) !== "UNSTABLE") errors.push("equal arrival and service is not stable");
    if (queueStability(1, 2) !== "STABLE") errors.push("service above arrival must be stable");
    const residence = residencePercentiles([]);
    if (residence.status !== "UNKNOWN") errors.push("empty residence sample must be UNKNOWN");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return { errors, warnings };
}
