import { classifyShift, type ShiftCategory } from "../packages/scraper/shiftClassifier";
import { slicePublicJobs, type PublicJob } from "../apps/web/src/lib/public-board";

let failures: string[] = [];

function check(desc: string, cond: boolean, details?: any) {
  if (!cond) {
    console.error(`❌ FAIL: ${desc}`, details ? details : "");
    failures.push(desc);
  } else {
    // console.log(`✓ PASS: ${desc}`);
  }
}

console.log("===================================================================");
console.log("   EMPIRICAL ADVERSARIAL STRESS HARNESS — DAYSHIFT & SLICING      ");
console.log("===================================================================");

// -------------------------------------------------------------------------
// 1. Client Timezone Alone (Schedule Fabrication Boundary)
// -------------------------------------------------------------------------
console.log("\n[1] Testing Client Timezone Alone Boundary...");

const testTimezones = [
  "US Eastern", "US Pacific", "AEST", "AWST", "ACST", "AEDT", "NZST", "NZDT",
  "PST", "EST", "CST", "MST", "GMT", "GMT+8", "UTC", "UTC+8", "UTC-5",
  "Asia/Manila", "Australia/Sydney", "America/New_York", "Europe/London",
  "PHT", "SGT", "JST"
];

for (const tz of testTimezones) {
  // Case 1A: Timezone alone in clientTimezone property
  const r1 = classifyShift({ clientTimezone: tz });
  check(`Timezone '${tz}' alone must return unknown`, r1.category === "unknown");
  check(`Timezone '${tz}' alone must have isDayshift=false`, r1.isDayshift === false);
  check(`Timezone '${tz}' alone must have phWorkingHours=null`, r1.phWorkingHours === null);
  check(`Timezone '${tz}' alone must preserve clientTimezone`, r1.clientTimezone === tz);

  // Case 1B: Timezone with generic unstated job description
  const r2 = classifyShift({
    clientTimezone: tz,
    title: "Senior Full Stack Developer",
    description: `We are a globally distributed engineering team. Our headquarters operate around ${tz}. Seeking high-performing talent.`
  });
  check(`Timezone '${tz}' in headquarters note must return unknown`, r2.category === "unknown");
  check(`Timezone '${tz}' in headquarters note must have isDayshift=false`, r2.isDayshift === false);
  check(`Timezone '${tz}' in headquarters note must have phWorkingHours=null`, r2.phWorkingHours === null);
}

// -------------------------------------------------------------------------
// 2. Conflicting Markers & Negation
// -------------------------------------------------------------------------
console.log("\n[2] Testing Conflicting Markers & Negation Boundaries...");

const conflictingCases = [
  { text: "Day shift / night shift required", reason: "slash separated day/night" },
  { text: "Day shift or night shift depending on project assignment", reason: "or separated day/night" },
  { text: "Day shift and night shift positions available", reason: "and separated day/night" },
  { text: "Must be available for day shift, mid shift, or night shift", reason: "three-way conflict" },
  { text: "Australian business hours or US business hours", reason: "AU vs US business hours" },
  { text: "UK business hours / APAC business hours", reason: "UK vs APAC business hours" },
  { text: "Morning shift or graveyard shift rotation", reason: "morning vs graveyard" },
  { text: "Day shift position with mandatory graveyard shift rotation", reason: "day vs graveyard" },
  { text: "Work daytime hours or US Eastern business hours", reason: "daytime vs US Eastern" },
  { text: "Philippine business hours or night shift", reason: "Philippine hours vs night shift" },
  { text: "8am - 5pm Manila time or night shift depending on client", reason: "PHT span vs night shift" },
  { text: "8am - 5pm Manila time / night shift required", reason: "PHT span / night shift" },
  { text: "9:00 am - 6:00 pm (PHT) or UK business hours", reason: "PHT span vs UK mid shift" },
  { text: "AU business hours with occasional US Pacific business hours", reason: "AU vs US Pacific" }
];

for (const { text, reason } of conflictingCases) {
  const res = classifyShift({ description: text });
  check(`Conflict (${reason}) must return unknown`, res.category === "unknown", { text, res });
  check(`Conflict (${reason}) must have isDayshift=false`, res.isDayshift === false);
  check(`Conflict (${reason}) must have phWorkingHours=null`, res.phWorkingHours === null);
  check(`Conflict (${reason}) evidence mentions unstated, negated, or conflicting`, res.evidence.includes("unstated, negated, or conflicting"));
}

const negationCases = [
  "No night shift required",
  "Not a graveyard shift role",
  "Without night shift obligations",
  "No 8am - 5pm Manila time shift required",
  "Not required to work Australian business hours",
  "Without day shift requirements",
  "No day shift required for this async role",
  "No morning shift, completely flexible",
  "Not working US business hours"
];

for (const text of negationCases) {
  const res = classifyShift({ description: text });
  check(`Negation "${text}" must return unknown`, res.category === "unknown", { text, res });
  check(`Negation "${text}" must have isDayshift=false`, res.isDayshift === false);
  check(`Negation "${text}" must have phWorkingHours=null`, res.phWorkingHours === null);
}

// -------------------------------------------------------------------------
// 3. Explicit Spans & Genuine Day Shift Markers
// -------------------------------------------------------------------------
console.log("\n[3] Testing Explicit Spans & Day Shift Extraction...");

const validSpans = [
  { text: "Working hours: 8am - 5pm Manila time", expected: "8am - 5pm Manila time" },
  { text: "Shift: 9:00 am - 6:00 pm (PHT)", expected: "9:00 am - 6:00 pm (PHT)" },
  { text: "Schedule is 7:00 AM - 4:00 PM PHT", expected: "7:00 AM - 4:00 PM PHT" },
  { text: "Expected hours: 6am to 3pm Philippine time", expected: "6am to 3pm Philippine time" },
  { text: "Core schedule: 8:00 AM - 5:00 PM (PHT) daily", expected: "8:00 AM - 5:00 PM (PHT)" },
  { text: "Shift time: 08:00 am - 05:00 pm Manila time", expected: "08:00 am - 05:00 pm Manila time" },
  { text: "Hours: 9am – 6pm Manila time", expected: "9am – 6pm Manila time" }, // en-dash
  { text: "Hours: 9am — 6pm Manila time", expected: "9am — 6pm Manila time" }, // em-dash
  { text: "Office timing: 10:00 am - 6:00 pm PHT", expected: "10:00 am - 6:00 pm PHT" },
  { text: "Coverage: 7am to 4pm Manila time required", expected: "7am to 4pm Manila time" },
  { text: "Hours: 8:00 a.m. - 5:00 p.m. PHT", expected: "8:00 a.m. - 5:00 p.m. PHT" },
  { text: "Required schedule: 09:30 am - 06:30 pm (PHT)", expected: "09:30 am - 06:30 pm (PHT)" }
];

for (const { text, expected } of validSpans) {
  const res = classifyShift({ description: text });
  check(`Span "${text}" -> category === 'day_shift'`, res.category === "day_shift", res);
  check(`Span "${text}" -> isDayshift === true`, res.isDayshift === true);
  check(`Span "${text}" -> phWorkingHours === "${expected}"`, res.phWorkingHours === expected, { got: res.phWorkingHours, expected });
  check(`Span "${text}" -> evidence includes span`, res.evidence.includes(expected));
}

// False span cues that should NOT be classified as daytime PHT spans
const nonDaySpans = [
  { text: "Hours: 8pm - 5am Manila time", reason: "Manila night shift hours" },
  { text: "Hours: 8am - 5pm EST", reason: "US Eastern daytime hours" },
  { text: "Hours: 9am - 5pm PST", reason: "US Pacific daytime hours" },
  { text: "Hours: 9am - 5pm London time", reason: "UK daytime hours" },
  { text: "Hours: 11:00 am - 8:00 pm Manila time", reason: "Start hour 11 is mid shift/outside morning start" }
];

for (const { text, reason } of nonDaySpans) {
  const res = classifyShift({ description: text });
  check(`Non-day span (${reason}) "${text}" must NOT have phWorkingHours`, res.phWorkingHours === null, res);
  check(`Non-day span (${reason}) "${text}" must have isDayshift=false`, res.isDayshift === false);
  check(`Non-day span (${reason}) "${text}" must be unknown or non-day`, res.category !== "day_shift");
}

// -------------------------------------------------------------------------
// 4. In-Memory Public Board Slicing (slicePublicJobs)
// -------------------------------------------------------------------------
console.log("\n[4] Testing slicePublicJobs with shift: 'day_shift'...");

function createMockJob(id: number, overrides: Partial<PublicJob> = {}): PublicJob {
  return {
    id,
    title: `Job Title ${id}`,
    company: `Company ${id}`,
    type: "VA",
    sourceUrl: `https://example.com/jobs/${id}`,
    sourcePlatform: "workable",
    sourceId: `job-${id}`,
    tags: ["va"],
    category: "admin",
    experienceLevel: "mid",
    postedAt: new Date(Date.now() - id * 3600000).toISOString(),
    scrapedAt: new Date(Date.now() - id * 3600000).toISOString(),
    geoScope: "ph_only",
    phEligibility: "eligible_verified",
    geoEvidence: "Direct PH",
    description: "Standard job description",
    clientTimezone: null,
    locationType: "remote",
    payRange: "$5 - $10 / hr",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const corpus: PublicJob[] = [
  // 5 Explicit day_shift via shiftCategory
  createMockJob(1, { shiftCategory: "day_shift", isDayshift: true, title: "VA 1" }),
  createMockJob(2, { shiftCategory: "day_shift", isDayshift: true, title: "VA 2" }),
  createMockJob(3, { shiftCategory: "day_shift", isDayshift: true, title: "VA 3" }),
  createMockJob(4, { shiftCategory: "day_shift", isDayshift: true, title: "VA 4" }),
  createMockJob(5, { shiftCategory: "day_shift", isDayshift: true, title: "VA 5" }),

  // 3 Legacy isDayshift=true (shiftCategory null/undefined)
  createMockJob(6, { shiftCategory: null, isDayshift: true, title: "VA 6 (legacy isDayshift)" }),
  createMockJob(7, { shiftCategory: undefined, isDayshift: true, title: "VA 7 (legacy isDayshift)" }),
  createMockJob(8, { isDayshift: true, title: "VA 8 (legacy isDayshift)" }),

  // 4 Dynamic classification to day_shift via title/description
  createMockJob(9, { description: "Working hours: 8am - 5pm Manila time", title: "VA 9" }),
  createMockJob(10, { description: "Work Australian business hours", title: "VA 10" }),
  createMockJob(11, { title: "Executive Assistant (APAC business hours)", description: "Assist executive" }),
  createMockJob(12, { description: "Morning shift customer service", title: "VA 12" }),

  // 15 NON-DAYSHIFT JOBS:
  createMockJob(13, { shiftCategory: "night_shift", isDayshift: false, title: "Night Shift VA" }),
  createMockJob(14, { shiftCategory: "night_shift", isDayshift: false, description: "US Eastern business hours" }),
  createMockJob(15, { shiftCategory: "mid_shift", isDayshift: false, title: "UK Mid Shift Specialist" }),
  createMockJob(16, { shiftCategory: "mid_shift", isDayshift: false, description: "Must work European business hours" }),
  createMockJob(17, { shiftCategory: "flexible", isDayshift: false, title: "Async Content Writer" }),
  createMockJob(18, { shiftCategory: "flexible", isDayshift: false, description: "Work whenever you want; flexible schedule" }),
  createMockJob(19, { shiftCategory: "unknown", isDayshift: false, clientTimezone: "US Eastern", title: "US Eastern TZ Only" }),
  createMockJob(20, { shiftCategory: "unknown", isDayshift: false, clientTimezone: "AEST", title: "AEST TZ Only" }),
  createMockJob(21, { shiftCategory: "unknown", isDayshift: false, description: "Submit application before 5 PM PST" }),
  createMockJob(22, { shiftCategory: "unknown", isDayshift: false, description: "Day shift / night shift required" }),
  createMockJob(23, { shiftCategory: "unknown", isDayshift: false, title: "CT Imaging Documentation Specialist" }),
  createMockJob(24, { shiftCategory: "unknown", isDayshift: false, description: "No night shift required" }),
  createMockJob(25, { shiftCategory: "unknown", isDayshift: false, description: "No day shift required for this async role" }),
  createMockJob(26, { shiftCategory: null, isDayshift: false, description: "General virtual assistant with unstated hours" }),
  createMockJob(27, { shiftCategory: undefined, isDayshift: undefined, description: "Data entry specialist" }),
];

// Execute slice with shift: 'day_shift'
const daySlice = slicePublicJobs(corpus, {
  shift: "day_shift",
  offset: 0,
  limit: 100,
});

const expectedDayIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const actualDayIds = daySlice.jobs.map(j => j.id).sort((a, b) => a - b);

check(`daySlice total matches exactly ${expectedDayIds.length}`, daySlice.total === expectedDayIds.length, {
  actual: daySlice.total,
  expected: expectedDayIds.length
});

check(`daySlice returns exactly IDs 1..12`, JSON.stringify(actualDayIds) === JSON.stringify(expectedDayIds), {
  actualDayIds,
  expectedDayIds
});

// Verify 0 non-dayshift jobs leaked
for (let nonDayId = 13; nonDayId <= 27; nonDayId++) {
  check(`Job ${nonDayId} must NOT leak into day_shift slice`, !actualDayIds.includes(nonDayId));
}

// Test Pagination on daySlice
const page1 = slicePublicJobs(corpus, { shift: "day_shift", offset: 0, limit: 5 });
const page2 = slicePublicJobs(corpus, { shift: "day_shift", offset: 5, limit: 5 });
const page3 = slicePublicJobs(corpus, { shift: "day_shift", offset: 10, limit: 5 });

check("Pagination page 1 returns 5 jobs", page1.jobs.length === 5 && page1.total === 12);
check("Pagination page 2 returns 5 jobs", page2.jobs.length === 5 && page2.total === 12);
check("Pagination page 3 returns 2 jobs", page3.jobs.length === 2 && page3.total === 12);

// Check that pages are disjoint
const combinedPagedIds = [...page1.jobs, ...page2.jobs, ...page3.jobs].map(j => j.id).sort((a, b) => a - b);
check("Disjoint pagination covers all 12 items without duplicates", JSON.stringify(combinedPagedIds) === JSON.stringify(expectedDayIds));

// Test filtering by 'night_shift'
const nightSlice = slicePublicJobs(corpus, { shift: "night_shift", offset: 0, limit: 100 });
const nightIds = nightSlice.jobs.map(j => j.id).sort((a, b) => a - b);
check("night_shift slice returns jobs 13 and 14", JSON.stringify(nightIds) === JSON.stringify([13, 14]), nightIds);

// Test filtering by 'mid_shift'
const midSlice = slicePublicJobs(corpus, { shift: "mid_shift", offset: 0, limit: 100 });
const midIds = midSlice.jobs.map(j => j.id).sort((a, b) => a - b);
check("mid_shift slice returns jobs 15 and 16", JSON.stringify(midIds) === JSON.stringify([15, 16]), midIds);

// Test filtering by 'flexible'
const flexSlice = slicePublicJobs(corpus, { shift: "flexible", offset: 0, limit: 100 });
const flexIds = flexSlice.jobs.map(j => j.id).sort((a, b) => a - b);
check("flexible slice returns jobs 17 and 18", JSON.stringify(flexIds) === JSON.stringify([17, 18]), flexIds);

// -------------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------------
console.log("\n===================================================================");
if (failures.length === 0) {
  console.log("   ✅ ALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED (0 FAILURES)   ");
  console.log("===================================================================");
} else {
  console.error(`   ❌ ${failures.length} TEST FAILURES DETECTED!   `);
  console.log("===================================================================");
  process.exit(1);
}
