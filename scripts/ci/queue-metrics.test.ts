import { expect, test } from "bun:test";
import {
  auditQueueInstrumentation,
  coefficientOfVariation,
  littlesLaw,
  nextQueueDepth,
  queueStability,
  residencePercentiles,
} from "./queue-metrics";

test("depth evolution clamps at zero when completions exceed the queue", () => {
  expect(nextQueueDepth(5, 3, 10)).toBe(0);
  expect(nextQueueDepth(2, 4, 1)).toBe(5);
});

test("negative queue inputs are rejected", () => {
  expect(() => nextQueueDepth(-1, 0, 0)).toThrow();
});

test("Little's law abstains without a coefficient of variation", () => {
  const result = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 4, interarrivalCv: null });
  expect(result.applicable).toBe(false);
  expect(result.L).toBeNull();
});

test("Little's law abstains when arrivals are bursty", () => {
  const result = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 4, interarrivalCv: 1.5 });
  expect(result.applicable).toBe(false);
  expect(result.L).toBeNull();
});

test("Little's law applies only inside the provisional variation bound", () => {
  const result = littlesLaw({ arrivalRatePerHour: 2, meanResidenceHours: 4, interarrivalCv: 0.25 });
  expect(result.applicable).toBe(true);
  expect(result.L).toBe(8);
});

test("service capacity must exceed arrival before a queue is called stable", () => {
  expect(queueStability(3, 3)).toBe("UNSTABLE");
  expect(queueStability(3, 2)).toBe("UNSTABLE");
  expect(queueStability(2, 5)).toBe("STABLE");
  expect(queueStability(0, 0)).toBe("UNKNOWN");
  expect(queueStability(Number.NaN, 1)).toBe("UNKNOWN");
});

test("residence percentiles are unknown for an empty or invalid sample", () => {
  expect(residencePercentiles([]).status).toBe("UNKNOWN");
  expect(residencePercentiles([-1, 2]).status).toBe("UNKNOWN");
});

test("residence percentiles report oldest and the interpolated median", () => {
  const summary = residencePercentiles([1, 2, 3, 4, 10]);
  expect(summary.status).toBe("MEASURED");
  expect(summary.oldest).toBe(10);
  expect(summary.p50).toBe(3);
  expect(summary.n).toBe(5);
});

test("coefficient of variation is unknown for a single observation", () => {
  expect(coefficientOfVariation([4])).toBeNull();
  expect(coefficientOfVariation([2, 2, 2])).toBe(0);
});

test("the queue instrumentation self-check passes", () => {
  expect(auditQueueInstrumentation().errors).toEqual([]);
});
